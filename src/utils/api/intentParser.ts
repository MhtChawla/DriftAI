import { OPENAI_API_KEY } from '../../../secrets';
import { createChatCompletion } from './openaiClient';

export type IntentActionType =
  | 'send_whatsapp'
  | 'call_contact'
  | 'draft_email'
  | 'translate'
  | 'open_app'
  | 'create_reminder'
  | 'chat'
  | 'instagram_post';

export type IntentAction = {
  type: IntentActionType | string;
  contact?: string;
  message?: string;
  text?: string;
  app?: string;
  time?: string;
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
      "message": string?,
      "text": string?,
      "app": string?,
      "time": string?
    }
  ]
}

Supported types:
- send_whatsapp
- call_contact
- draft_email
- translate
- open_app
- create_reminder
- chat
- instagram_post

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
