import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AmbientBackground } from '../../src/components/ambient-background';
import { OrbNavigator } from '../../src/components/navigation/orb-navigator';
import { colors } from '../../src/theme/tokens';

// Three sections share one living background; switching happens through the
// orb at the bottom (see OrbNavigator), not through a classic tab bar.
export default function TabLayout() {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <AmbientBackground />
      </View>
      <Tabs
        initialRouteName="index"
        tabBar={(props) => <OrbNavigator {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          sceneStyle: styles.scene,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Запись' }} />
        <Tabs.Screen name="thoughts" options={{ title: 'Мысли' }} />
        <Tabs.Screen name="collections" options={{ title: 'Коллекции' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: 'transparent',
  },
});
