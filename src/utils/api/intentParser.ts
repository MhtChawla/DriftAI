import { OPENAI_API_KEY } from '../../../secrets';
import { useAppStore } from '../../store/useAppStore';
import { createChatCompletion } from './openaiClient';

export const SUPPORTED_INTENTS = [
  'send_whatsapp',
  'call_contact',
  'draft_email',
  'translate',
  'open_app',
  'create_reminder',
  'chat',
  'instagram_post',
  'gallery_search',
  'custom_command',
] as const;

export type IntentActionType = (typeof SUPPORTED_INTENTS)[number];

export type IntentAction = {
  type: IntentActionType;
  contact?: string;
  recipient?: string;
  message?: string;
  text?: string;
  app?: string;
  time?: string;
  language?: string;
  caption?: string;
  query?: string;
  command?: string;
  subject?: string;
  body?: string;
};

export type IntentParseResult = {
  actions: IntentAction[];
};

const SYSTEM_PROMPT = `
You are an AI intent parser for a mobile assistant.

Convert user input into STRICT JSON.

Rules:
- Always return JSON only (no text)
- Use this schema:

{
  "actions": [
    {
      "type": string,
      "contact": string?,
      "recipient": string?,
      "message": string?,
      "text": string?,
      "app": string?,
      "time": string?,
      "language": string?,
      "caption": string?,
      "query": string?,
      "command": string?,
      "subject": string?,
      "body": string?
    }
  ]
}

These are the 10 supported atomic intent types:
${SUPPORTED_INTENTS.map((intent) => `- ${intent}`).join('\n')}

Multi-step commands are represented by returning multiple ordered actions in
the actions array.

If multiple tasks -> return multiple actions.

Examples:

Input: "Send Rahul a WhatsApp saying I am coming"
Output:
{
  "actions": [
    {
      "type": "send_whatsapp",
      "contact": "Rahul",
      "message": "I am coming"
    }
  ]
}

Input: "Call mom"
Output:
{
  "actions": [
    {
      "type": "call_contact",
      "contact": "mom"
    }
  ]
}
`;

const SUPPORTED_INTENT_SET = new Set<string>(SUPPORTED_INTENTS);

const isIntentActionType = (type: unknown): type is IntentActionType =>
  typeof type === 'string' && SUPPORTED_INTENT_SET.has(type);

const cleanValue = (value: string | null | undefined) => {
  const cleaned = value
    ?.replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '');

  return cleaned || undefined;
};

const cleanEntity = (value: string | null | undefined) =>
  cleanValue(value)?.replace(/[.,!?]+$/g, '').trim() || undefined;

const normalizeComparable = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitReminderTime = (value: string) => {
  const timeMatch = value.match(/\s+\b(?:at|on|by|tomorrow|today|tonight|next|in)\b.+$/i);

  if (timeMatch?.index === undefined) {
    return { message: cleanValue(value) };
  }

  return {
    message: cleanValue(value.slice(0, timeMatch.index)),
    time: cleanValue(timeMatch[0]),
  };
};

const parseCustomCommand = (text: string): IntentAction | null => {
  const normalizedText = normalizeComparable(text);
  const commands = useAppStore.getState().commands.filter((command) => command.enabled);

  const knownCommand = commands.find((command) => {
    const aliases = [
      command.name,
      command.phrase,
      `run ${command.name}`,
      `activate ${command.name}`,
      `execute ${command.name}`,
      `do ${command.name}`,
      `start ${command.name}`,
    ].map(normalizeComparable);

    return aliases.includes(normalizedText);
  });

  if (knownCommand) {
    return {
      type: 'custom_command',
      command: knownCommand.name,
      text: knownCommand.phrase,
      message: knownCommand.desc,
    };
  }

  const explicitCommand =
    text.match(/^(?:run|activate|execute)\s+(?:my\s+)?(?:custom\s+command\s+)?(.+)$/i) ??
    text.match(/^custom\s+command\s+(.+)$/i);
  const command = cleanEntity(explicitCommand?.[1]);

  if (!command) {
    return null;
  }

  return {
    type: 'custom_command',
    command,
    text,
  };
};

const parseWhatsapp = (text: string): IntentAction | null => {
  const patterns = [
    /^(?:send|message|text)\s+(.+?)\s+(?:a\s+)?(?:whatsapp|wa)(?:\s+message)?(?:\s+(?:saying|that|to say|with(?:\s+a)?\s+message)\s+(.+))?$/i,
    /^(?:send|message|text)\s+(.+?)\s+(?:a\s+)?message\s+(?:on|via)\s+(?:whatsapp|wa)(?:\s+(?:saying|that|to say|with(?:\s+a)?\s+message)\s+(.+))?$/i,
    /^(?:send|message|text)\s+(?:a\s+)?(?:whatsapp|wa)(?:\s+message)?\s+to\s+(.+?)(?:\s+(?:saying|that|to say|with(?:\s+a)?\s+message)\s+(.+))?$/i,
    /^(?:whatsapp|wa)\s+(.+?)(?:\s+(?:saying|that|to say|with(?:\s+a)?\s+message)\s+(.+))?$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const contact = cleanEntity(match?.[1]);

    if (contact) {
      return {
        type: 'send_whatsapp',
        contact,
        message: cleanValue(match?.[2]),
      };
    }
  }

  return null;
};

const parseEmail = (text: string): IntentAction | null => {
  const patterns = [
    /^(?:draft|write|compose|send)\s+(?:an?\s+)?(?:email|mail)(?:\s+to\s+(.+?))?(?:\s+(?:saying|that|about|regarding|with(?:\s+a)?\s+body|to say)\s+(.+))?$/i,
    /^(?:draft|write|compose|send)\s+(.+?)\s+(?:an?\s+)?(?:email|mail)(?:\s+(?:saying|that|about|regarding|with(?:\s+a)?\s+body|to say)\s+(.+))?$/i,
    /^(?:email|mail)\s+(.+?)(?:\s+(?:saying|that|about|regarding|to say)\s+(.+))?$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const recipient = cleanEntity(match[1]);
    const body = cleanValue(match[2]);

    return {
      type: 'draft_email',
      recipient,
      message: body,
      text: body,
      body,
    };
  }

  return null;
};

const parseInstagramPost = (text: string): IntentAction | null => {
  const hasInstagram = /\b(?:instagram|insta|ig)\b/i.test(text);
  const hasPostIntent = /\b(?:post|caption|share|upload)\b/i.test(text);

  if (!hasInstagram || !hasPostIntent) {
    return null;
  }

  const caption = cleanValue(
    text.match(/\b(?:with(?:\s+a)?\s+caption|caption|saying)\s+(.+)$/i)?.[1],
  );
  const query = /\blatest\b.*\b(?:photo|image|picture)\b/i.test(text)
    ? 'latest image'
    : undefined;

  return {
    type: 'instagram_post',
    caption,
    query,
    text,
  };
};

const parseTranslate = (text: string): IntentAction | null => {
  const trailingLanguage = text.match(/^translate\s+(.+?)\s+(?:to|into|in)\s+([a-z][a-z\s-]*)$/i);

  if (trailingLanguage) {
    return {
      type: 'translate',
      text: cleanValue(trailingLanguage[1]),
      language: cleanEntity(trailingLanguage[2]),
    };
  }

  const leadingLanguage = text.match(/^translate\s+(?:to|into|in)\s+([a-z][a-z\s-]*?)\s+(.+)$/i);

  if (leadingLanguage) {
    return {
      type: 'translate',
      language: cleanEntity(leadingLanguage[1]),
      text: cleanValue(leadingLanguage[2]),
    };
  }

  const translateText = cleanValue(text.match(/^translate\s+(.+)$/i)?.[1]);

  if (!translateText) {
    return null;
  }

  return {
    type: 'translate',
    text: translateText,
  };
};

const parseReminder = (text: string): IntentAction | null => {
  const reminder = text.match(
    /^(?:remind me to|set (?:a\s+)?reminder to|create (?:a\s+)?reminder to|add (?:a\s+)?reminder to)\s+(.+)$/i,
  );

  if (reminder) {
    const { message, time } = splitReminderTime(reminder[1]);

    return {
      type: 'create_reminder',
      message,
      text: message,
      time,
    };
  }

  const note = text.match(/^(?:note|make (?:a\s+)?note|create (?:a\s+)?note|remember)\s+(?:that\s+)?(.+)$/i);
  const noteText = cleanValue(note?.[1]);

  if (!noteText) {
    return null;
  }

  return {
    type: 'create_reminder',
    message: noteText,
    text: noteText,
  };
};

const parseCall = (text: string): IntentAction | null => {
  const contact = cleanEntity(text.match(/^(?:call|phone|dial|ring)\s+(?:up\s+)?(.+)$/i)?.[1]);

  if (!contact) {
    return null;
  }

  return {
    type: 'call_contact',
    contact,
  };
};

const parseGallerySearch = (text: string): IntentAction | null => {
  const collectionFirst = text.match(
    /^(?:search|find|show|get)(?:\s+me)?\s+(?:my\s+)?(?:gallery|photos|images|pictures)(?:\s+(?:for|of|with|from)\s+(.+))?$/i,
  );

  if (collectionFirst) {
    return {
      type: 'gallery_search',
      query: cleanValue(collectionFirst[1]),
      text,
    };
  }

  const subjectFirst = text.match(
    /^(?:search|find|show|get)(?:\s+me)?\s+(.+?)\s+(?:photos|images|pictures)(?:\s+(?:in|from)\s+(?:my\s+)?gallery)?$/i,
  );
  const query = cleanValue(subjectFirst?.[1]);

  if (!query) {
    return null;
  }

  return {
    type: 'gallery_search',
    query,
    text,
  };
};

const parseOpenApp = (text: string): IntentAction | null => {
  const app = cleanEntity(text.match(/^(?:open|launch)\s+(.+)$/i)?.[1]);

  if (!app) {
    return null;
  }

  return {
    type: 'open_app',
    app,
  };
};

const parseChat = (text: string): IntentAction | null => {
  const explicitChat = cleanValue(
    text.match(/^(?:ask|chat with|talk to)\s+(?:drif|ai|assistant)?\s*(.+)?$/i)?.[1],
  );

  if (explicitChat) {
    return {
      type: 'chat',
      text: explicitChat,
    };
  }

  if (/^(?:what|why|how|when|where|who|which|can you|could you|should i|tell me|explain|summarize)\b/i.test(text) || text.endsWith('?')) {
    return {
      type: 'chat',
      text,
    };
  }

  return null;
};

const parseLocalSingleIntent = (text: string): IntentAction | null => {
  const parsers = [
    parseCustomCommand,
    parseWhatsapp,
    parseEmail,
    parseInstagramPost,
    parseTranslate,
    parseReminder,
    parseCall,
    parseGallerySearch,
    parseOpenApp,
    parseChat,
  ];

  for (const parser of parsers) {
    const action = parser(text);

    if (action) {
      return action;
    }
  }

  return null;
};

const splitSequentialCommands = (text: string) => {
  const actionStartWords = [
    'call',
    'phone',
    'dial',
    'send',
    'message',
    'text',
    'whatsapp',
    'email',
    'mail',
    'draft',
    'write',
    'compose',
    'translate',
    'remind',
    'note',
    'remember',
    'instagram',
    'insta',
    'ig',
    'post',
    'caption',
    'search',
    'find',
    'show',
    'get',
    'open',
    'launch',
    'run',
    'activate',
    'execute',
    'ask',
    'chat',
    'talk',
    'what',
    'why',
    'how',
    'when',
    'where',
    'who',
  ].join('|');
  const separator = new RegExp(`\\s*(?:,|\\band then\\b|\\bthen\\b|\\band\\b)\\s+(?=(?:${actionStartWords})\\b)`, 'i');

  return text.split(separator).map(cleanValue).filter((part): part is string => Boolean(part));
};

const parseLocalIntent = (text: string): IntentParseResult | null => {
  const directCustomCommand = parseCustomCommand(text);

  if (directCustomCommand) {
    return { actions: [directCustomCommand] };
  }

  const parts = splitSequentialCommands(text);

  if (parts.length > 1) {
    const actions = parts.map(parseLocalSingleIntent);

    if (actions.every(Boolean)) {
      return { actions: actions as IntentAction[] };
    }
  }

  const action = parseLocalSingleIntent(text);

  if (!action) {
    return null;
  }

  return { actions: [action] };
};

const getAssistantContent = (content: string | null | undefined) => {
  if (!content) {
    throw new Error('OpenAI returned an empty intent response');
  }

  return content.trim();
};

const parseIntentJson = (content: string): IntentParseResult => {
  const parsed = JSON.parse(content) as IntentParseResult;

  if (!parsed || !Array.isArray(parsed.actions)) {
    throw new Error('Intent response did not match the expected schema');
  }

  parsed.actions.forEach((action) => {
    if (!isIntentActionType(action?.type)) {
      throw new Error('Intent response included an unsupported action type');
    }
  });

  return parsed;
};

const getOpenAIKey = () => {
  const key = OPENAI_API_KEY?.trim();

  if (!key || !key.startsWith('sk-')) {
    throw new Error('Missing OPENAI_API_KEY in secrets.ts');
  }

  return key;
};

export const parseVoiceIntent = async (input: string): Promise<IntentParseResult> => {
  const text = input.trim();

  if (!text) {
    return { actions: [] };
  }

  const localIntent = parseLocalIntent(text);

  if (localIntent) {
    return localIntent;
  }

  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    },
    getOpenAIKey(),
  );

  return parseIntentJson(getAssistantContent(response.choices[0]?.message.content));
};
