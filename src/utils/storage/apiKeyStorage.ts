import * as Keychain from 'react-native-keychain';

const OPENAI_KEY_SERVICE = 'com.driftai.openai-api-key';
const OPENAI_KEY_ACCOUNT = 'openai-api-key';

const keychainOptions = {
  service: OPENAI_KEY_SERVICE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const saveOpenAIKey = async (apiKey: string) => {
  await Keychain.setGenericPassword(OPENAI_KEY_ACCOUNT, apiKey, keychainOptions);
};

export const loadOpenAIKey = async () => {
  const credentials = await Keychain.getGenericPassword({
    service: OPENAI_KEY_SERVICE,
  });

  return credentials ? credentials.password : null;
};

export const deleteOpenAIKey = async () => {
  await Keychain.resetGenericPassword({
    service: OPENAI_KEY_SERVICE,
  });
};
