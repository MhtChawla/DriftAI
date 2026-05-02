import { getRequiredOpenAIKey, useAppStore } from '../../store/useAppStore';
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
  rawInput?: string;
};

export type IntentParseResult = {
  actions: IntentAction[];
};

const SYSTEM_PROMPT = `
You are an AI intent parser for a mobile assistant named Drif.

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

CRITICAL RULES FOR CHOOSING THE RIGHT TYPE:

- Use "chat" for ANY general question, fact lookup, knowledge query, or conversational request that does NOT map to a specific device action. When in doubt, use "chat".
  Examples that MUST be "chat": "what is the capital of Italy", "who invented the telephone", "explain photosynthesis", "what time is it in Tokyo", "tell me a joke", "what's 15% of 200", "how are you", "what does CEO mean"

- Use "custom_command" ONLY when the user explicitly says a command name or phrase that matches one of their saved custom commands. NEVER use "custom_command" for general questions.

- Use "translate" ONLY when the user explicitly asks to translate text into another language.

- Use "send_whatsapp" ONLY when the user asks to send a WhatsApp message to someone.

- Use "call_contact" ONLY when the user asks to call someone.

- Use "draft_email" ONLY when the user asks to write or send an email.

- Use "create_reminder" ONLY when the user asks to be reminded of something.

- Use "open_app" ONLY when the user asks to open a specific app.

- Use "instagram_post" ONLY when the user asks to post on Instagram.

- Use "gallery_search" ONLY when the user asks to find or view photos.

Multi-step commands are represented by returning multiple ordered actions in the actions array.

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

Input: "what is the capital of Italy"
Output:
{
  "actions": [
    {
      "type": "chat",
      "text": "what is the capital of Italy"
    }
  ]
}

Input: "who is Elon Musk"
Output:
{
  "actions": [
    {
      "type": "chat",
      "text": "who is Elon Musk"
    }
  ]
}

Input: "tell me a joke"
Output:
{
  "actions": [
    {
      "type": "chat",
      "text": "tell me a joke"
    }
  ]
}

Input: "what's the weather like today"
Output:
{
  "actions": [
    {
      "type": "chat",
      "text": "what's the weather like today"
    }
  ]
}

Input: "what do i call in hindi for: i am going"
Output:
{
  "actions": [
    {
      "type": "translate",
      "text": "i am going",
      "language": "hindi"
    }
  ]
}

Input: "how do you say goodbye in French"
Output:
{
  "actions": [
    {
      "type": "translate",
      "text": "goodbye",
      "language": "French"
    }
  ]
}
`;

const SUPPORTED_INTENT_SET = new Set<string>(SUPPORTED_INTENTS);

const isIntentActionType = (type: unknown): type is IntentActionType =>
  typeof type === 'string' && SUPPORTED_INTENT_SET.has(type);

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

export const parseVoiceIntent = async (input: string): Promise<IntentParseResult> => {
  const text = input.trim();

  if (!text) {
    return { actions: [] };
  }

  const commands = useAppStore.getState().commands.filter(c => c.enabled);
  const commandsBlock = commands.length > 0
    ? `\n\nThe user has these custom commands saved:\n${commands.map(c => `- name: "${c.name}", phrase: "${c.phrase}"`).join('\n')}\nIf the user's input matches any of these by name or phrase (or sounds like they're triggering one), return type: "custom_command" with command set to the command name.`
    : '';

  const response = await createChatCompletion(
    {
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + commandsBlock,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    },
    getRequiredOpenAIKey(),
  );

  const result = parseIntentJson(getAssistantContent(response.choices[0]?.message.content));
  result.actions.forEach(a => { a.rawInput = text; });
  return result;
};
