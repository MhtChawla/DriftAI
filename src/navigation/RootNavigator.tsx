import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { Mic, Command, Settings } from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CommandsScreen } from '../screens/CommandsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { tokens, fonts } from '../theme/tokens';

export type TabsParamList = {
  Voice: undefined;
  Commands: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

const TAB_ITEMS: {
  key: keyof TabsParamList;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { key: 'Voice', label: 'Voice', Icon: Mic },
  { key: 'Commands', label: 'Commands', Icon: Command },
  { key: 'Settings', label: 'Settings', Icon: Settings },
];

const TabBar = React.memo(function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useThemeTokens();

  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: t.surface, borderColor: t.border },
      ]}
    >
      {TAB_ITEMS.map((item, idx) => {
        const focused = state.index === idx;
        return (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.key)}
            style={styles.tabBtn}
          >
            {focused && (
              <LinearGradient
                colors={[tokens.accent1, tokens.accent2]}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <item.Icon size={18} color={focused ? '#fff' : t.textDim} />
            {focused && (
              <Text style={[styles.tabLabel, { color: '#fff', fontFamily: fonts.sans }]}>
                {item.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(p) => <TabBar {...p} />}
    >
      <Tabs.Screen name="Voice" component={HomeScreen} />
      <Tabs.Screen name="Commands" component={CommandsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tabBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  tabLabel: { fontSize: 13, fontWeight: '500' },
});
