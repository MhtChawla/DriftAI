import { useState, useCallback } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAppStore } from '../store/appStore';

export interface ImagePickerResult {
  uri: string;
  type: string;
  fileName?: string;
  fileSize?: number;
}

interface UseImagePickerReturn {
  image: ImagePickerResult | null;
  isLoading: boolean;
  pickFromLibrary: () => Promise<void>;
  takePhoto: () => Promise<void>;
  clearImage: () => void;
}

export const useImagePicker = (): UseImagePickerReturn => {
  const [image, setImage] = useState<ImagePickerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setAppError = useAppStore((state) => state.setError);

  const pickFromLibrary = useCallback(async () => {
    try {
      setIsLoading(true);
      launchImageLibrary({ mediaType: 'photo' }, (response: any) => {
        setIsLoading(false);
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          setAppError(response.errorMessage || 'Failed to pick image');
          return;
        }
        if (response.assets?.[0]) {
          setImage({
            uri: response.assets[0].uri || '',
            type: response.assets[0].type || 'image/jpeg',
            fileName: response.assets[0].fileName,
            fileSize: response.assets[0].fileSize,
          });
        }
      });
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg = err.message || 'Failed to pick image';
      setAppError(errorMsg);
    }
  }, [setAppError]);

  const takePhoto = useCallback(async () => {
    try {
      setIsLoading(true);
      launchCamera({ mediaType: 'photo' }, (response: any) => {
        setIsLoading(false);
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          setAppError(response.errorMessage || 'Failed to take photo');
          return;
        }
        if (response.assets?.[0]) {
          setImage({
            uri: response.assets[0].uri || '',
            type: response.assets[0].type || 'image/jpeg',
            fileName: response.assets[0].fileName,
            fileSize: response.assets[0].fileSize,
          });
        }
      });
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg = err.message || 'Failed to take photo';
      setAppError(errorMsg);
    }
  }, [setAppError]);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  return {
    image,
    isLoading,
    pickFromLibrary,
    takePhoto,
    clearImage,
  };
};
