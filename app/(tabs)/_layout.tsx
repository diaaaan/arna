import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  navigation,
  radius,
  shadows,
  typography,
} from '../../src/theme/tokens';

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
      <Tabs.Screen name="index" options={{ title: 'Записать' }} />
      <Tabs.Screen name="collections" options={{ title: 'Коллекции' }} />
      <Tabs.Screen name="thoughts" options={{ href: null }} />
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
