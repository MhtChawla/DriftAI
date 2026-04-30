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

  if (normalizeComparable(app).includes('settings')) {
    await Linking.openSettings();
    return result(action, 'Opened settings');
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

  for (const commandAction of command.actions) {
    await executeCommandAction(commandAction);
  }

  return result(action, `Ran ${command.name}`);
};

const executeCommandAction = async (action: CommandAction) => {
  switch (action.key) {
    case 'open':
      await handleOpenApp({ type: 'open_app', app: action.detail });
      return;

    case 'msg':
      await Share.open({
        title: action.detail,
        message: action.detail,
        failOnCancel: false,
      });
      return;

    case 'timer':
      await createReminderNotification(
        action.detail,
        parseDurationTimestamp(action.detail) ?? Date.now() + 60000,
      );
      return;

    case 'play':
      await openFirstUrl(
        [
          `spotify:search:${encodeURIComponent(action.detail)}`,
          `https://open.spotify.com/search/${encodeURIComponent(
            action.detail,
          )}`,
        ],
        'Spotify',
      );
      return;

    case 'set':
      await handleSettingCommand(action.detail);
      return;

    default:
      return assertNeverCommand(action.key);
  }
};

const handleSettingCommand = async (detail: string) => {
  const normalized = normalizeComparable(detail);

  if (normalized.includes('alarm') || normalized.includes('timer')) {
    await openFirstUrl(
      ['clock-alarm://', 'https://clock.google.com/'],
      'Clock',
    );
    return;
  }

  await Linking.openSettings();
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
  whatsapp: ['whatsapp://send?text='],
  instagram: ['instagram://app', 'https://www.instagram.com/'],
  spotify: ['spotify://', 'https://open.spotify.com/'],
  youtube: ['youtube://', 'https://www.youtube.com/'],
  gmail: ['googlegmail://', 'mailto:'],
  mail: ['mailto:'],
  email: ['mailto:'],
  maps: [
    Platform.OS === 'ios' ? 'http://maps.apple.com/' : 'geo:0,0?q=',
    'https://maps.google.com/',
  ],
  photos: ['googlephotos://'],
  gallery: ['googlephotos://'],
  calendar: ['calshow://', 'https://calendar.google.com/'],
  slack: ['slack://open', 'https://slack.com/'],
  linear: ['linear://', 'https://linear.app/'],
  telegram: ['tg://', 'https://web.telegram.org/'],
  discord: ['discord://', 'https://discord.com/app'],
  chrome: ['googlechrome://', 'https://www.google.com/'],
  browser: ['https://www.google.com/'],
};


const parseDurationTimestamp = (value: string) => {
  const match = normalizeComparable(value).match(
    /\bin\s+(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b|^(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b/,
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1] ?? match[3]);
  const unit = match[2] ?? match[4];
  const multiplier =
    unit.startsWith('hour') || unit.startsWith('hr')
      ? 60 * 60 * 1000
      : unit.startsWith('day')
      ? 24 * 60 * 60 * 1000
      : 60 * 1000;

  return Date.now() + amount * multiplier;
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
