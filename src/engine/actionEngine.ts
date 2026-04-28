import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { Linking, NativeModules, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
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

const handleEmail = async (action: IntentAction) => {
  const recipient = action.recipient ?? action.contact;
  const email = isEmail(recipient)
    ? recipient
    : await getContactEmail(recipient);
  const subject = action.subject ?? '';
  const body = action.body ?? action.message ?? action.text ?? '';

  if (recipient && !email) {
    throw new Error(`No email address found for ${recipient}`);
  }

  await Linking.openURL(
    `mailto:${email ?? ''}${toQueryString({ subject, body })}`,
  );

  return result(
    action,
    email ? `Drafted email to ${email}` : 'Opened email draft',
  );
};

const handleInstagramPost = async (action: IntentAction) => {
  const message = action.caption ?? action.message ?? action.text ?? '';

  try {
    await Share.shareSingle({
      social: Social.Instagram,
      message,
    });
  } catch {
    await openFirstUrl(
      ['instagram://app', 'https://www.instagram.com/'],
      'Instagram',
    );
  }

  return result(action, 'Opened Instagram post flow');
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

const handleReminder = async (action: IntentAction) => {
  const message = action.message ?? action.text;

  if (!message) {
    throw new Error('No reminder text provided');
  }

  const timestamp = parseReminderTimestamp(action.time);
  await createReminderNotification(message, timestamp);

  return result(
    action,
    timestamp
      ? `Scheduled reminder for ${new Date(timestamp).toLocaleString()}`
      : 'Created reminder',
  );
};

const handleChat = async (action: IntentAction) => {
  const text = action.text ?? action.message ?? action.query;

  if (text) {
    useAppStore.getState().addMessage({ role: 'user', text });
  }

  return result(action, 'Opened chat');
};

const handleGallerySearch = async (action: IntentAction) => {
  const query = action.query ?? action.text;
  const url = query
    ? `https://photos.google.com/search/${encodeURIComponent(query)}`
    : 'https://photos.google.com/';

  await Linking.openURL(url);

  return result(
    action,
    query ? `Opened gallery search for ${query}` : 'Opened gallery',
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

const createReminderNotification = async (
  body: string,
  timestamp: number | null,
) => {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: 'reminders',
    name: 'Reminders',
    importance: AndroidImportance.DEFAULT,
  });

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
  photos: ['googlephotos://', 'https://photos.google.com/'],
  gallery: ['https://photos.google.com/'],
  calendar: ['calshow://', 'https://calendar.google.com/'],
  slack: ['slack://open', 'https://slack.com/'],
  linear: ['linear://', 'https://linear.app/'],
  telegram: ['tg://', 'https://web.telegram.org/'],
  discord: ['discord://', 'https://discord.com/app'],
  chrome: ['googlechrome://', 'https://www.google.com/'],
  browser: ['https://www.google.com/'],
};

const parseReminderTimestamp = (time?: string) => {
  const normalized = normalizeComparable(time);

  if (!normalized) {
    return null;
  }

  const durationTimestamp = parseDurationTimestamp(normalized);

  if (durationTimestamp) {
    return durationTimestamp;
  }

  const date = new Date();

  if (normalized.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  }

  if (normalized.includes('tonight')) {
    date.setHours(20, 0, 0, 0);
  }

  const timeMatch = normalized.match(
    /\b(?:at|by)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/,
  );

  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] ?? 0);
    const meridiem = timeMatch[3];

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    date.setHours(hours, minutes, 0, 0);
  } else if (normalized.includes('today')) {
    return null;
  }

  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date.getTime();
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
