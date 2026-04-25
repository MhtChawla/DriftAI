import { useCallback } from 'react';
import Share from 'react-native-share';
import { useAppStore } from '../store/appStore';

interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  type?: string;
}

interface UseShareReturn {
  share: (options: ShareOptions) => Promise<void>;
}

export const useShare = (): UseShareReturn => {
  const setAppError = useAppStore((state) => state.setError);

  const share = useCallback(
    async (options: ShareOptions) => {
      try {
        const shareOptions: any = {
          title: options.title,
        };

        if (options.message) {
          shareOptions.message = options.message;
        }

        if (options.url) {
          shareOptions.url = options.url;
        }

        if (options.type) {
          shareOptions.type = options.type;
        }

        await Share.open(shareOptions);
      } catch (err: any) {
        // User cancelled share or other error
        if (err.message !== 'Share cancelled.' && err.code !== 'E_CANCELLED') {
          const errorMsg = err.message || 'Failed to share';
          setAppError(errorMsg);
        }
      }
    },
    [setAppError]
  );

  return { share };
};
