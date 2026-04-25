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
    throw error;
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
