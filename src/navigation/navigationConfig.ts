import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Chat: { conversationId?: string };
  VoiceInput: undefined;
  ImagePicker: undefined;
  Contacts: undefined;
  Settings: undefined;
  Notifications: undefined;
};

export const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationTheme = {
  dark: false,
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#000000',
    border: '#E0E0E0',
    notification: '#FF3B30',
  },
};

export const screenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTintColor: '#007AFF',
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
  },
};
