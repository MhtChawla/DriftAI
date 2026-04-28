import axiosClient, { clearCache } from './axiosClient';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  response_format?: {
    type: 'json_object';
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const DEFAULT_MODEL = 'gpt-3.5-turbo';

const sanitizeOpenAIErrorMessage = (message: string) =>
  message.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***');

const getOpenAIErrorMessage = (error: any) => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error?.message;

  if (status === 401) {
    return 'OpenAI authentication failed. Replace OPENAI_API_KEY in secrets.ts with an active API key.';
  }

  if (status) {
    const detail = apiMessage ? `: ${sanitizeOpenAIErrorMessage(apiMessage)}` : '';
    return `OpenAI request failed (${status})${detail}`;
  }

  if (error?.message) {
    return sanitizeOpenAIErrorMessage(error.message);
  }

  return 'OpenAI request failed';
};

export const createChatCompletion = async (
  request: ChatCompletionRequest,
  apiKey: string
): Promise<ChatCompletionResponse> => {
  try {
    const response = await axiosClient.post<ChatCompletionResponse>(
      '/chat/completions',
      {
        model: request.model || DEFAULT_MODEL,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2048,
        top_p: request.top_p ?? 1,
        response_format: request.response_format,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.isFromCache) {
      return error.response.data;
    }
    throw new Error(getOpenAIErrorMessage(error));
  }
};

export const getOpenAIModels = async (apiKey: string) => {
  return axiosClient.get('/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
};

export { clearCache };
