import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  navigation,
  radius,
  shadows,
  typography,
} from '../../src/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({
    color,
    focused,
    size,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: colors.navigation.active,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.navigation.inactive,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: typography.navigationLabel,
        tabBarStyle: [
          styles.tabBar,
          { bottom: insets.bottom + navigation.tabBarBottomInset },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Записать',
          tabBarIcon: tabIcon('create', 'create-outline'),
        }}
      />
      <Tabs.Screen
        name="thoughts"
        options={{
          title: 'Мысли',
          tabBarIcon: tabIcon('bulb', 'bulb-outline'),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Коллекции',
          tabBarIcon: tabIcon('albums', 'albums-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: navigation.tabBarHorizontalInset,
    right: navigation.tabBarHorizontalInset,
    height: navigation.tabBarHeight,
    padding: navigation.tabBarItemInset,
    borderTopWidth: 0,
    borderRadius: radius.full,
    backgroundColor: colors.navigation.background,
    ...shadows.floatingTabBar,
  },
  tabBarItem: {
    borderRadius: radius.full,
  },
});
