import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import { launchImageLibrary } from 'react-native-image-picker';
import Share, { Social } from 'react-native-share';
import type { Contact } from 'react-native-contacts';
import { useAppStore, type CommandAction } from '../store/useAppStore';
import type { IntentAction } from '../utils/api/intentParser';
import { OPENAI_API_KEY } from '../../secrets';
import { createChatCompletion } from '../utils/api/openaiClient';
import { speak } from '../hooks/useTTS';

export type ActionExecutionResult = {
  type: IntentAction['type'];
  message: string;
};

export const executeActions = async (
  actions: IntentAction[],
): Promise<ActionExecutionResult[]> => {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    results.push(await executeSingleAction(action));
  }

  return results;
};

const executeSingleAction = async (
  action: IntentAction,
): Promise<ActionExecutionResult> => {
  switch (action.type) {
    case 'send_whatsapp':
      return handleWhatsApp(action);

    case 'call_contact':
      return handleCall(action);

    case 'draft_email':
      return handleEmail(action);

    case 'instagram_post':
      return handleInstagramPost(action);

    case 'translate':
      return handleTranslate(action);

    case 'open_app':
      return handleOpenApp(action);

    case 'create_reminder':
      return handleReminder(action);

    case 'chat':
      return handleChat(action);

    case 'gallery_search':
      return handleGallerySearch(action);

    case 'custom_command':
      return handleCustomCommand(action);

    default:
      return assertNever(action.type);
  }
};

const handleWhatsApp = async (action: IntentAction) => {
  const contact = action.contact ?? action.recipient;
  const message = action.message ?? action.text ?? '';
  const phone = await getContactNumber(contact);
  const encodedMessage = encodeURIComponent(message);

  if (contact && !phone) {
    throw new Error(`No WhatsApp number found for ${contact}`);
  }

  if (phone) {
    const whatsappPhone = formatPhoneForWhatsApp(phone);
    await openFirstUrl(
      [
        `whatsapp://send?phone=${whatsappPhone}&text=${encodedMessage}`,
        `https://wa.me/${whatsappPhone}?text=${encodedMessage}`,
      ],
      'WhatsApp',
    );

    return result(action, `Opened WhatsApp for ${contact ?? phone}`);
  }

  await openFirstUrl(
    [
      `whatsapp://send?text=${encodedMessage}`,
      `https://wa.me/?text=${encodedMessage}`,
    ],
    'WhatsApp',
  );

  return result(action, 'Opened WhatsApp');
};

const handleCall = async ({ contact, type }: IntentAction) => {
  const phone = await getContactNumber(contact);
  const dialable = phone ? formatPhoneForTel(phone) : '';

  if (!dialable) {
    throw new Error(`No phone number found for ${contact || 'contact'}`);
  }

  if (Platform.OS === 'android' && NativeModules.PhoneCall) {
    await NativeModules.PhoneCall.call(dialable);
  } else {
    await Linking.openURL(`tel:${dialable}`);
  }

  return { type, message: `Calling ${contact ?? dialable}` };
};

const generateEmailContent = async (
  rawInput: string,
  recipientName: string | undefined,
): Promise<{ subject: string; body: string }> => {
  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an email drafting assistant. The user will describe their intent in casual spoken language — your job is to interpret the context and write a proper, professional email from it. Never copy the user's words verbatim into the email body.
Return ONLY valid JSON with this schema: { "subject": string, "body": string }
- subject: concise, relevant subject line
- body: a well-drafted email body (2-4 sentences) that captures the intent professionally. Address the recipient by name if provided. Always end with:\n\nBest Regards,\n${useAppStore.getState().user.name}`,
        },
        {
          role: 'user',
          content: recipientName
            ? `Write an email to ${recipientName}. Intent: "${rawInput}"`
            : `Write an email. Intent: "${rawInput}"`,
        },
      ],
    },
    OPENAI_API_KEY,
  );

  const parsed = JSON.parse(response.choices[0]?.message.content ?? '{}') as {
    subject?: string;
    body?: string;
  };

  return {
    subject: parsed.subject?.trim() ?? '',
    body: parsed.body?.trim() ?? '',
  };
};

const handleEmail = async (action: IntentAction) => {
  const recipient = action.recipient ?? action.contact;
  const email = isEmail(recipient)
    ? recipient
    : await getContactEmail(recipient);

  let subject = action.subject ?? '';
  let body = '';

  // Always generate — user's spoken words are intent context, not a ready-made body
  const rawInput = action.rawInput ?? '';
  if (rawInput) {
    const generated = await generateEmailContent(rawInput, recipient);
    subject = subject || generated.subject;
    body = generated.body;
  }

  await Linking.openURL(
    `mailto:${email ?? ''}${toQueryString({ subject, body })}`,
  );

  return result(
    action,
    email ? `Drafted email to ${email}` : 'Opened email draft — fill in recipient',
  );
};

const handleInstagramPost = async (action: IntentAction) => {
  const sourceImageUri = await getLatestGalleryImageUri();
  const imageUri = await prepareImageForSharing(sourceImageUri);
  const message = await generateInstagramCaption(action, imageUri);

  await copyCaptionToClipboard(message).catch(error => {
    console.warn('[InstagramPost] Failed to copy caption', error);
  });

  try {
    await Share.open({
      title: 'Share to Instagram',
      message,
      url: imageUri,
      type: 'image/jpeg',
      failOnCancel: false,
    });
  } catch {
    await Share.shareSingle({
      social: Social.Instagram,
      message,
      url: imageUri,
      type: 'image/jpeg',
    });
  }

  return result(action, `Opened share sheet for Instagram\nCaption copied:\n${message}`);
};

const prepareImageForSharing = async (uri: string) => {
  if (Platform.OS !== 'android' || uri.startsWith('file://')) {
    return uri;
  }

  try {
    return await NativeModules.GalleryModule?.cacheImageForSharing?.(uri) ?? uri;
  } catch (error) {
    console.warn('[InstagramPost] Failed to cache image for sharing', error);
    return uri;
  }
};

const getLatestGalleryImageUri = async () => {
  if (Platform.OS !== 'android') {
    throw new Error('Latest gallery image sharing is currently Android-only');
  }

  await ensureGalleryPermission();

  const uri = await NativeModules.GalleryModule?.getLatestImageUri?.();

  if (!uri) {
    return pickGalleryImage();
  }

  return uri;
};

const pickGalleryImage = async () =>
  new Promise<string>((resolve, reject) => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, response => {
      if (response.didCancel) {
        reject(new Error('Image selection cancelled'));
        return;
      }

      if (response.errorCode) {
        reject(new Error(response.errorMessage || 'Failed to pick image'));
        return;
      }

      const uri = response.assets?.[0]?.uri;

      if (!uri) {
        reject(new Error('No image selected'));
        return;
      }

      resolve(uri);
    });
  });

const ensureGalleryPermission = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const hasPermission = await PermissionsAndroid.check(permission);

  if (hasPermission) {
    return;
  }

  const status = await PermissionsAndroid.request(permission);

  if (status !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Gallery permission denied');
  }
};

const copyCaptionToClipboard = async (caption: string) => {
  if (Platform.OS !== 'android') {
    return;
  }

  await NativeModules.GalleryModule?.copyTextToClipboard?.(caption);
};

const generateInstagramCaption = async (action: IntentAction, imageUri: string) => {
  const userCaption = action.caption ?? action.message;
  const rawInput = action.rawInput ?? action.text ?? '';

  try {
    const imageDataUri = await NativeModules.GalleryModule?.getImageDataUri?.(imageUri);

    if (!imageDataUri) {
      throw new Error('Unable to prepare image for caption generation');
    }

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You can see the image. Generate an Instagram caption and hashtags that match the actual image.
Return ONLY valid JSON: { "caption": string, "hashtags": string[] }
Keep the caption natural and short. Mention visible subject/mood only when clear. Include 5-8 relevant hashtags.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userCaption
                  ? `User wants this caption idea: "${userCaption}". Full command: "${rawInput}"`
                  : `Create a caption for this image. Full command: "${rawInput || 'post my recent picture'}"`,
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUri },
              },
            ],
          },
        ],
      },
      OPENAI_API_KEY,
    );

    const parsed = JSON.parse(response.choices[0]?.message.content ?? '{}') as {
      caption?: string;
      hashtags?: string[];
    };
    const caption = parsed.caption?.trim();
    const hashtags = (parsed.hashtags ?? [])
      .map(tag => tag.trim())
      .filter(Boolean)
      .map(tag => (tag.startsWith('#') ? tag : `#${tag}`));

    if (caption || hashtags.length) {
      return [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');
    }
  } catch (error) {
    console.warn('[InstagramPost] Caption generation failed', error);
  }

  return userCaption?.trim() || 'A little moment from today.\n\n#today #moments #instagood #photooftheday #memories';
};

const handleTranslate = async (action: IntentAction) => {
  const text = action.text ?? action.message ?? action.query;

  if (!text) {
    throw new Error('No text provided to translate');
  }

  const language = action.language ?? 'English';

  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the user's text to ${language}. Reply with ONLY the translated text, nothing else.`,
        },
        { role: 'user', content: text },
      ],
    },
    OPENAI_API_KEY,
  );

  const translated = response.choices[0]?.message.content?.trim();

  if (!translated) {
    throw new Error('Translation failed — empty response');
  }

  const speakText = `In ${language} we call it: ${translated}`;
  speak(speakText, language).catch(() => {});

  return result(action, `In ${language}: ${translated}`);
};

const handleOpenApp = async (action: IntentAction) => {
  const app = action.app ?? action.text;

  if (!app) {
    throw new Error('No app provided to open');
  }

  const normalized = normalizeComparable(app);

  if (normalized.includes('settings')) {
    await Linking.openSettings();
    return result(action, 'Opened settings');
  }

  if (normalized.includes('camera')) {
    const { launchCamera } = await import('react-native-image-picker');
    launchCamera({ mediaType: 'photo', saveToPhotos: false }, () => {});
    return result(action, 'Opened camera');
  }

  if (normalized.includes('contact')) {
    if (Platform.OS === 'android') {
      await Linking.openURL('content://contacts/people/').catch(async () => {
        await Linking.openURL('https://contacts.google.com/');
      });
    } else {
      await Linking.openURL('addressbook://');
    }
    return result(action, 'Opened contacts');
  }

  await openFirstUrl(getAppUrls(app), app);

  return result(action, `Opened ${app}`);
};

type ReminderCalendar = {
  kind: 'calendar';
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM, optional
  allDay: boolean;
};

type ReminderOnce = {
  kind: 'once';
  title: string;
  delayMs: number;
};

type ReminderRecurring = {
  kind: 'recurring';
  title: string;
  intervalMs: number;
  count: number;
  startDelayMs: number;
};

type ReminderPlan = ReminderCalendar | ReminderOnce | ReminderRecurring;

const classifyReminder = async (rawText: string, rawTime?: string): Promise<ReminderPlan> => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentYear = now.getFullYear();
  const tzOffsetMin = -now.getTimezoneOffset();
  const tzSign = tzOffsetMin >= 0 ? '+' : '-';
  const tzLabel = `UTC${tzSign}${String(Math.floor(Math.abs(tzOffsetMin) / 60)).padStart(2, '0')}:${String(Math.abs(tzOffsetMin) % 60).padStart(2, '0')}`;

  const systemPrompt = `You are a reminder classifier. Given a reminder request, return a JSON object describing the best way to handle it.

Today is ${today} (year ${currentYear}). Current local time is ${currentTime} timezone ${tzLabel}.

IMPORTANT: When no year is mentioned, ALWAYS use ${currentYear} or later — never a past year. If the date has already passed this year, use ${currentYear + 1}.

Rules:
- If the reminder is tied to a specific date or calendar event (birthday, meeting, anniversary, deadline) → kind: "calendar"
- If it's a one-time reminder after a delay (in 5 minutes, in 2 hours, tomorrow morning) → kind: "once"
- If it's recurring/habitual (drink water, take medicine, exercise, every X hours) → kind: "recurring"

Return ONLY valid JSON matching one of these schemas:

For calendar:
{ "kind": "calendar", "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" | null, "allDay": boolean }

For once:
{ "kind": "once", "title": string, "delayMs": number }

For recurring:
{ "kind": "recurring", "title": string, "intervalMs": number, "count": number, "startDelayMs": number }

Rules for recurring: intervalMs is milliseconds between each notification, count is total number of notifications to schedule, startDelayMs is delay before the first one (0 if should start now).

Be smart — "drink water" with no time specified means every 2 hours for 8 hours (4 notifications). "remind me to drink water every hour for 3 hours" means 3 notifications 1 hour apart.`;

  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawTime ? `${rawText} (time context: ${rawTime})` : rawText },
      ],
    },
    OPENAI_API_KEY,
  );

  const plan = JSON.parse(response.choices[0]?.message.content ?? '{}') as ReminderPlan;

  if (!plan.kind) {
    throw new Error('Reminder classifier returned unexpected response');
  }

  return plan;
};

const handleReminder = async (action: IntentAction) => {
  // rawInput is the full original user utterance — always available, most reliable
  const rawText = action.rawInput ?? action.message ?? action.text ?? action.body ?? action.query;

  if (!rawText) {
    throw new Error('No reminder text provided');
  }

  const plan = await classifyReminder(rawText, action.time);

  switch (plan.kind) {
    case 'calendar':
      return handleCalendarReminder(action, plan);
    case 'once':
      return handleOnceReminder(action, plan);
    case 'recurring':
      return handleRecurringReminder(action, plan);
  }
};

const handleCalendarReminder = async (action: IntentAction, plan: ReminderCalendar) => {
  const [year, month, day] = plan.date.split('-').map(Number);
  const startMs = plan.time
    ? (() => {
        const [hour, minute] = plan.time!.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute, 0).getTime();
      })()
    : new Date(year, month - 1, day, 0, 0, 0).getTime();
  const endMs = startMs + (plan.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);

  console.log('[CalendarReminder] plan:', JSON.stringify(plan));
  console.log('[CalendarReminder] startMs:', startMs, '→', new Date(startMs).toString());
  console.log('[CalendarReminder] endMs:', endMs, '→', new Date(endMs).toString());

  if (Platform.OS === 'ios') {
    await Linking.openURL(`calshow:${Math.floor(startMs / 1000)}`);
  } else {
    await NativeModules.CalendarModule.createEvent(
      plan.title,
      startMs,
      endMs,
      plan.allDay,
    );
  }

  return result(action, `Added "${plan.title}" to your calendar on ${plan.date}`);
};

const handleOnceReminder = async (action: IntentAction, plan: ReminderOnce) => {
  const timestamp = Date.now() + Math.max(plan.delayMs, 10_000);
  await createReminderNotification(plan.title, timestamp);

  const fireAt = new Date(timestamp);
  return result(action, `Reminder set: "${plan.title}" at ${fireAt.toLocaleTimeString()}`);
};

const handleRecurringReminder = async (action: IntentAction, plan: ReminderRecurring) => {
  await ensureNotifeeChannel();

  const MIN_DELAY = 10_000; // notifee rejects timestamps less than ~5s in the future
  const startDelay = Math.max(plan.startDelayMs, MIN_DELAY);

  for (let i = 0; i < plan.count; i++) {
    const timestamp = Date.now() + startDelay + i * plan.intervalMs;
    await notifee.createTriggerNotification(
      {
        title: 'DriftAI Reminder',
        body: plan.title,
        android: { channelId: 'reminders', smallIcon: 'ic_launcher' },
        data: { source: 'action_engine' },
      },
      { type: TriggerType.TIMESTAMP, timestamp },
    );
  }

  const intervalMin = Math.round(plan.intervalMs / 60000);
  const intervalLabel = intervalMin >= 60 ? `${Math.round(intervalMin / 60)}h` : `${intervalMin}m`;

  return result(
    action,
    `Set ${plan.count} reminder${plan.count > 1 ? 's' : ''} every ${intervalLabel}: "${plan.title}"`,
  );
};

const handleChat = async (action: IntentAction) => {
  const text = action.text ?? action.message ?? action.query;

  if (text) {
    useAppStore.getState().addMessage({ role: 'user', text });
  }

  return result(action, 'Opened chat');
};

const resolveDateISO = async (rawInput: string): Promise<string | null> => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 60,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Today is ${today}. If the user refers to a specific date, extract it.
Return JSON: { "date": "YYYY-MM-DD" } for a specific day, or { "date": null } if no specific date is mentioned.
Use the current year unless another year is implied.`,
        },
        { role: 'user', content: rawInput },
      ],
    },
    OPENAI_API_KEY,
  );

  const parsed = JSON.parse(response.choices[0]?.message.content ?? '{}') as { date?: string | null };
  return parsed.date?.trim() || null;
};

const handleGallerySearch = async (action: IntentAction) => {
  const rawInput = action.rawInput ?? action.query ?? action.text ?? '';
  const dateISO = rawInput ? await resolveDateISO(rawInput) : null;

  if (Platform.OS === 'android' && NativeModules.GalleryModule) {
    await NativeModules.GalleryModule.openAtDate(dateISO ?? '');
  } else {
    // iOS — open Photos app (no date deep-link available)
    await Linking.openURL('photos-redirect://');
  }

  return result(
    action,
    dateISO ? `Opened gallery for ${dateISO}` : 'Opened gallery',
  );
};

const handleCustomCommand = async (action: IntentAction) => {
  const commandName = action.command ?? action.text;
  const command = findCustomCommand(commandName);

  if (!command) {
    throw new Error(`Custom command not found: ${commandName || 'unknown'}`);
  }

  const messages: string[] = [];
  const orderedActions = [
    ...command.actions.filter(a => a.key === 'set'),
    ...command.actions.filter(a => a.key === 'msg'),
    ...command.actions.filter(a => a.key === 'open' || a.key === 'play'),
    ...command.actions.filter(a => a.key === 'timer'),
  ];

  for (const commandAction of orderedActions) {
    messages.push(await executeCommandAction(commandAction));
  }

  return result(action, [`Ran ${command.name}`, ...messages].join('\n'));
};

const executeCommandAction = async (action: CommandAction) => {
  switch (action.key) {
    case 'open':
      return handleOpenCommandDetail(action.detail);

    case 'msg':
      await openFirstUrl(
        [`whatsapp://send?text=`, `https://wa.me/`],
        'WhatsApp',
      );
      return 'Opened WhatsApp';

    case 'timer':
      await startDeviceTimer(action.detail);
      return `Started timer: ${action.detail}`;

    case 'play':
      return handlePlayCommand(action.detail);

    case 'set':
      return handleSettingCommand(action.detail);

    default:
      return assertNeverCommand(action.key);
  }
};

const handlePlayCommand = async (detail: string) => {
  const normalized = normalizeComparable(detail);

  // Spotify playlist shortcuts
  if (normalized.includes('spotify')) {
    const query = normalized.replace('spotify', '').trim();
    if (query) {
      await openFirstUrl(
        [
          `spotify:search:${encodeURIComponent(query)}`,
          `https://open.spotify.com/search/${encodeURIComponent(query)}`,
        ],
        'Spotify',
      );
      return `Opened Spotify: ${query}`;
    }
    await openFirstUrl(['spotify://', 'https://open.spotify.com/'], 'Spotify');
    return 'Opened Spotify';
  }

  if (normalized.includes('youtube')) {
    await openFirstUrl(['youtubemusic://', 'https://music.youtube.com/'], 'YouTube Music');
    return 'Opened YouTube Music';
  }

  await openFirstUrl(
    [
      `spotify:search:${encodeURIComponent(detail)}`,
      `https://open.spotify.com/search/${encodeURIComponent(detail)}`,
    ],
    'Spotify',
  );
  return `Opened Spotify for ${detail}`;
};

const handleOpenCommandDetail = async (detail: string) => {
  const normalized = normalizeComparable(detail);

  // Stopwatch
  if (normalized === 'stopwatch') {
    await openFirstUrl(
      ['clock-stopwatch://', 'https://clock.google.com/'],
      'Stopwatch',
    );
    return 'Opened stopwatch';
  }

  // Maps with specific intent
  if (normalized.startsWith('maps ')) {
    return handleMapsDetail(normalized.slice(5).trim());
  }

  // YouTube with search intent
  if (normalized.startsWith('youtube search ')) {
    const query = detail.slice('youtube search '.length).trim();
    await openFirstUrl(
      [
        `youtube://results?search_query=${encodeURIComponent(query)}`,
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      ],
      'YouTube',
    );
    return `Searched YouTube: ${query}`;
  }

  // Browser intents
  if (normalized.startsWith('browser ')) {
    const rest = normalized.slice('browser '.length).trim();
    if (rest === 'google.com') {
      await openFirstUrl(['googlechrome://www.google.com/', 'https://www.google.com/'], 'Browser');
      return 'Opened Google';
    }
    if (rest === 'search custom') {
      await openFirstUrl(['googlechrome://www.google.com/', 'https://www.google.com/'], 'Browser');
      return 'Opened browser for search';
    }
    const url = rest.startsWith('http') ? rest : `https://${rest}`;
    await openFirstUrl([url], 'Browser');
    return `Opened ${rest}`;
  }

  // WhatsApp contact chat
  if (normalized === 'whatsapp contact') {
    await openFirstUrl(['whatsapp://send?text=', 'https://wa.me/'], 'WhatsApp');
    return 'Opened WhatsApp';
  }

  // Fall through to generic open
  await handleOpenApp({ type: 'open_app', app: detail });
  return `Opened ${detail}`;
};

const handleMapsDetail = async (sub: string) => {
  if (sub === 'navigate home') {
    await openFirstUrl(
      [
        'comgooglemaps://?daddr=home&directionsmode=driving',
        'https://maps.google.com/?daddr=home',
      ],
      'Maps',
    );
    return 'Opened Maps: navigate to Home';
  }

  if (sub === 'navigate work') {
    await openFirstUrl(
      [
        'comgooglemaps://?daddr=work&directionsmode=driving',
        'https://maps.google.com/?daddr=work',
      ],
      'Maps',
    );
    return 'Opened Maps: navigate to Work';
  }

  if (sub.startsWith('search ')) {
    const query = sub.slice('search '.length).trim();
    if (query === 'custom') {
      await openFirstUrl(['comgooglemaps://', 'https://maps.google.com/'], 'Maps');
      return 'Opened Maps';
    }
    await openFirstUrl(
      [
        `comgooglemaps://?q=${encodeURIComponent(query)}`,
        `https://maps.google.com/search?q=${encodeURIComponent(query)}`,
      ],
      'Maps',
    );
    return `Searched Maps: ${query}`;
  }

  await openFirstUrl(['comgooglemaps://', 'https://maps.google.com/'], 'Maps');
  return 'Opened Maps';
};


const handleSettingCommand = async (detail: string) => {
  const normalized = normalizeComparable(detail);

  // Brightness
  if (normalized.includes('brightness')) {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const brightnessPercent = parsePercent(detail) ?? 50;
      const changed = await NativeModules.AutomationModule.setBrightness(brightnessPercent);
      if (!changed) {
        return 'Opened system settings — allow DriftAI to change brightness, then run again';
      }
      return `Brightness set to ${brightnessPercent}%`;
    }
    await Linking.openSettings();
    return 'Opened settings for brightness';
  }

  // DND with duration
  if (normalized.includes('dnd on 30min')) {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const changed = await NativeModules.AutomationModule.setDoNotDisturb(true);
      if (!changed) return 'Opened DND access settings — allow DriftAI, then run again';
      // Schedule DND off after 30 min
      setTimeout(() => NativeModules.AutomationModule?.setDoNotDisturb(false), 30 * 60 * 1000);
      return 'DND enabled for 30 minutes';
    }
    await Linking.openSettings();
    return 'Opened DND settings';
  }

  if (normalized.includes('dnd on 60min')) {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const changed = await NativeModules.AutomationModule.setDoNotDisturb(true);
      if (!changed) return 'Opened DND access settings — allow DriftAI, then run again';
      setTimeout(() => NativeModules.AutomationModule?.setDoNotDisturb(false), 60 * 60 * 1000);
      return 'DND enabled for 60 minutes';
    }
    await Linking.openSettings();
    return 'Opened DND settings';
  }

  if (normalized.includes('dnd') || normalized.includes('do not disturb')) {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const enabled = !/\b(off|disable|disabled)\b/.test(normalized);
      const changed = await NativeModules.AutomationModule.setDoNotDisturb(enabled);
      if (!changed) return 'Opened DND access settings — allow DriftAI, then run again';
      return enabled ? 'DND enabled' : 'DND disabled';
    }
    await Linking.openSettings();
    return 'Opened DND settings';
  }

  // Volume / Ringer modes
  if (normalized === 'silent mode' || normalized === 'silent') {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const changed = await NativeModules.AutomationModule.setRingerMode('silent');
      if (!changed) return 'Opened DND access settings — allow DriftAI to set silent mode';
      return 'Phone set to silent';
    }
    await Linking.openSettings();
    return 'Opened sound settings';
  }

  if (normalized === 'vibrate mode' || normalized === 'vibrate') {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      await NativeModules.AutomationModule.setRingerMode('vibrate');
      return 'Phone set to vibrate';
    }
    await Linking.openSettings();
    return 'Opened sound settings';
  }

  if (normalized === 'ringer mode' || normalized === 'ringer') {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      await NativeModules.AutomationModule.setRingerMode('normal');
      return 'Phone set to ring';
    }
    await Linking.openSettings();
    return 'Opened sound settings';
  }

  // Media volume
  if (normalized.startsWith('volume ')) {
    const level = normalized.slice('volume '.length).trim();
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      const volumePercent = level === 'low' ? 25 : level === 'medium' ? 50 : level === 'high' ? 100 : 0;
      if (level === 'mute') {
        await NativeModules.AutomationModule.setMediaVolume?.(0);
        return 'Media volume muted';
      }
      await NativeModules.AutomationModule.setMediaVolume?.(volumePercent);
      return `Media volume set to ${volumePercent}%`;
    }
    await Linking.openSettings();
    return 'Opened sound settings';
  }

  // Flashlight
  if (normalized.includes('flashlight')) {
    const on = !normalized.includes('off');
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      await NativeModules.AutomationModule.setFlashlight?.(on);
      return `Flashlight ${on ? 'on' : 'off'}`;
    }
    await Linking.openSettings();
    return 'Opened settings for flashlight';
  }

  // Bluetooth
  if (normalized.includes('bluetooth')) {
    await openFirstUrl(['https://bluetooth.settings.android/'], 'Bluetooth settings').catch(() => {});
    await Linking.openSettings();
    return 'Opened Bluetooth settings';
  }

  // WiFi (system restriction — can only open settings)
  if (normalized.includes('wifi')) {
    await Linking.openSettings();
    return 'Opened WiFi settings';
  }

  // Lock screen
  if (normalized.includes('lock screen') || normalized.includes('lock')) {
    if (Platform.OS === 'android' && NativeModules.AutomationModule) {
      await NativeModules.AutomationModule.lockScreen?.();
      return 'Screen locked';
    }
    await Linking.openSettings();
    return 'Opened settings';
  }

  // Alarm
  if (normalized.includes('alarm')) {
    if (normalized.includes('custom')) {
      await openFirstUrl(['clock-alarm://', 'https://clock.google.com/'], 'Clock');
      return 'Opened Clock to set alarm';
    }
    const alarm = parseAlarmTime(detail);
    if (Platform.OS === 'android' && NativeModules.AutomationModule && alarm) {
      await NativeModules.AutomationModule.setAlarm(alarm.hour, alarm.minute, 'Alarm');
      return `Alarm set for ${formatAlarmTime(alarm.hour, alarm.minute)}`;
    }
    await openFirstUrl(['clock-alarm://', 'https://clock.google.com/'], 'Clock');
    return 'Opened Clock for alarm';
  }

  // Reminder shortcuts
  if (normalized.includes('reminder ')) {
    const subject = normalized.slice('reminder '.length).trim();
    if (subject === 'custom') {
      return 'Say your reminder — e.g. "remind me to call mom at 5pm"';
    }
    const label = subject === 'drink water' ? 'Drink water' : subject === 'gym' ? 'Go to gym' : subject;
    await createReminderNotification(label, Date.now() + 60 * 60 * 1000);
    return `Reminder set: "${label}" in 1 hour`;
  }

  // Scheduled notification
  if (normalized.includes('notify in ')) {
    const rest = normalized.slice('notify in '.length).trim();
    if (rest === 'custom') {
      return 'Say the delay — e.g. "remind me in 15 minutes"';
    }
    const minutes = rest === '10min' ? 10 : rest === '30min' ? 30 : 10;
    await createReminderNotification('DriftAI Notification', Date.now() + minutes * 60 * 1000);
    return `Notification scheduled in ${minutes} minutes`;
  }

  // Timer custom fallback
  if (normalized.includes('timer custom')) {
    await openFirstUrl(['clock-alarm://', 'https://clock.google.com/'], 'Clock');
    return 'Opened Clock for timer';
  }

  await Linking.openSettings();
  return 'Opened settings';
};

const startDeviceTimer = async (detail: string) => {
  const seconds = parseDurationSeconds(detail);

  if (Platform.OS === 'android' && NativeModules.AutomationModule && seconds) {
    await NativeModules.AutomationModule.startTimer(seconds, detail);
    return;
  }

  await createReminderNotification(
    detail,
    parseDurationTimestamp(detail) ?? Date.now() + 60000,
  );
};

const ensureNotifeeChannel = async () => {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: 'reminders',
    name: 'Reminders',
    importance: AndroidImportance.DEFAULT,
  });
};

const createReminderNotification = async (
  body: string,
  timestamp: number | null,
) => {
  await ensureNotifeeChannel();

  const notification = {
    title: 'DriftAI Reminder',
    body,
    android: {
      channelId: 'reminders',
      smallIcon: 'ic_launcher',
    },
    data: { source: 'action_engine' },
  };

  if (timestamp && timestamp > Date.now()) {
    await notifee.createTriggerNotification(notification, {
      type: TriggerType.TIMESTAMP,
      timestamp,
    });
    return;
  }

  await notifee.displayNotification(notification);
};

const findCustomCommand = (value?: string | null) => {
  const commandName = normalizeComparable(value);

  if (!commandName) {
    return null;
  }

  return (
    useAppStore.getState().commands.find(command => {
      if (!command.enabled) {
        return false;
      }

      const name = normalizeComparable(command.name);
      const phrase = normalizeComparable(command.phrase);

      return (
        name === commandName ||
        phrase === commandName ||
        commandName.includes(name) ||
        commandName.includes(phrase)
      );
    }) ?? null
  );
};

const getContactNumber = async (contact?: string) => {
  if (isPhoneLike(contact)) {
    return contact;
  }

  const match = await findContact(contact);
  const phone = match?.phoneNumbers.find(phoneNumber =>
    Boolean(phoneNumber.number),
  );

  return phone?.number ?? null;
};

const getContactEmail = async (contact?: string) => {
  if (!contact) {
    return null;
  }

  const match = await findContact(contact);
  const email = match?.emailAddresses.find(emailAddress =>
    Boolean(emailAddress.email),
  );

  return email?.email ?? null;
};

const findContact = async (contact?: string) => {
  const contactName = normalizeComparable(contact);

  if (!contactName) {
    return null;
  }

  await ensureContactsPermission();

  const contacts = await Contacts.getAll();

  return (
    contacts.find(item => {
      const name = normalizeComparable(getContactName(item));

      if (!name) {
        return false;
      }

      return name.includes(contactName) || contactName.includes(name);
    }) ?? null
  );
};

const ensureContactsPermission = async () => {
  const currentPermission = await Contacts.checkPermission();

  if (currentPermission === 'authorized' || currentPermission === 'limited') {
    return;
  }

  const requestedPermission = await Contacts.requestPermission();

  if (
    requestedPermission !== 'authorized' &&
    requestedPermission !== 'limited'
  ) {
    throw new Error('Contacts permission denied');
  }
};

const getContactName = (contact: Contact) =>
  [
    contact.displayName,
    contact.givenName,
    contact.middleName,
    contact.familyName,
  ]
    .filter(Boolean)
    .join(' ');

const getAppUrls = (app: string) => {
  const normalized = normalizeComparable(app);
  const exactUrls = APP_URLS[normalized];

  if (exactUrls) {
    return exactUrls;
  }

  const fuzzyMatch = Object.entries(APP_URLS).find(([name]) =>
    normalized.includes(name),
  );

  if (fuzzyMatch) {
    return fuzzyMatch[1];
  }

  return [`https://www.google.com/search?q=${encodeURIComponent(app)}`];
};

const APP_URLS: Record<string, string[]> = {
  whatsapp: ['whatsapp://send?text=', 'https://wa.me/'],
  instagram: ['instagram://app', 'https://www.instagram.com/'],
  spotify: ['spotify://', 'https://open.spotify.com/'],
  youtube: ['youtube://', 'https://www.youtube.com/'],
  'youtube music': ['youtubemusic://', 'https://music.youtube.com/'],
  gmail: ['googlegmail://', 'mailto:'],
  mail: ['mailto:'],
  email: ['mailto:'],
  maps: [
    Platform.OS === 'ios' ? 'http://maps.apple.com/' : 'geo:0,0?q=',
    'https://maps.google.com/',
  ],
  'google maps': ['comgooglemaps://', 'geo:0,0?q=', 'https://maps.google.com/'],
  photos: ['googlephotos://', 'https://photos.google.com/'],
  'google photos': ['googlephotos://', 'https://photos.google.com/'],
  gallery: ['googlephotos://', 'https://photos.google.com/'],
  calendar: ['calshow://', 'https://calendar.google.com/'],
  contacts: ['content://contacts/people/', 'https://contacts.google.com/'],
  camera: ['android.media.action.IMAGE_CAPTURE'],
  slack: ['slack://open', 'https://slack.com/'],
  linear: ['linear://', 'https://linear.app/'],
  telegram: ['tg://', 'https://web.telegram.org/'],
  discord: ['discord://', 'https://discord.com/app'],
  chrome: ['googlechrome://', 'https://www.google.com/'],
  browser: ['https://www.google.com/'],
  linkedin: ['linkedin://', 'https://www.linkedin.com/'],
  snapchat: ['snapchat://', 'https://www.snapchat.com/'],
  facebook: ['fb://', 'https://www.facebook.com/'],
};


const parseDurationTimestamp = (value: string) => {
  const seconds = parseDurationSeconds(value);

  if (!seconds) {
    return null;
  }

  return Date.now() + seconds * 1000;
};

const parseDurationSeconds = (value: string) => {
  const match = normalizeComparable(value).match(
    /\bin\s+(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b|\bfor\s+(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b|^(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b/,
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1] ?? match[3] ?? match[5]);
  const unit = match[2] ?? match[4] ?? match[6];
  const multiplier =
    unit.startsWith('hour') || unit.startsWith('hr')
      ? 60 * 60
      : unit.startsWith('day')
      ? 24 * 60 * 60
      : 60;

  return amount * multiplier;
};

const parseAlarmTime = (value: string) => {
  const match = normalizeComparable(value).match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/,
  );

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3];

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }

  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

const formatAlarmTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const parsePercent = (value: string) => {
  const percent = Number(normalizeComparable(value).match(/\b(\d{1,3})\b/)?.[1]);

  if (!Number.isFinite(percent)) {
    return null;
  }

  return Math.min(100, Math.max(1, percent));
};


const openFirstUrl = async (urls: string[], label: string) => {
  let lastError: unknown;

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Unable to open ${label}${getErrorSuffix(lastError)}`);
};

const toQueryString = (params: Record<string, string>) => {
  const query = Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return query ? `?${query}` : '';
};

const result = (
  action: IntentAction,
  message: string,
): ActionExecutionResult => ({
  type: action.type,
  message,
});

const assertNever = (actionType: never) => {
  throw new Error(`Unsupported action type: ${actionType}`);
};

const assertNeverCommand = (actionKey: never) => {
  throw new Error(`Unsupported command action: ${actionKey}`);
};

const isPhoneLike = (value?: string | null) =>
  Boolean(value && /(?:\+?\d[\d\s().-]{5,}\d)/.test(value));

const isEmail = (value?: string | null): value is string =>
  Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const normalizeComparable = (value?: string | null) =>
  value
    ?.toLowerCase()
    .replace(/[^a-z0-9:+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';

const formatPhoneForTel = (phone: string) => phone.replace(/[^\d+#*]/g, '');

const formatPhoneForWhatsApp = (phone: string) => phone.replace(/[^\d]/g, '');

const getErrorSuffix = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return `: ${error.message}`;
  }

  return '';
};
