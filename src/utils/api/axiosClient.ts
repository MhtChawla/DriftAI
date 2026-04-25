import axios, { AxiosInstance } from 'axios';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || 'https://api.openai.com/v1',
  timeout: 30000,
});

// Add cache interceptor for GET requests
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get') {
      const cacheKey = response.config.url || '';
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// Add request interceptor to check cache
axiosClient.interceptors.request.use((config) => {
  if (config.method === 'get') {
    const cacheKey = config.url || '';
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
      // Return cached response as a resolved promise
      return Promise.reject({
        config,
        response: {
          status: 200,
          data: cachedResponse.data,
          headers: {},
          config,
        },
        isFromCache: true,
        message: 'From cache',
      });
    }
  }
  return config;
});

export const clearCache = () => cache.clear();
export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
});

export default axiosClient;
