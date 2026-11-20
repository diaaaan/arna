import { Ionicons } from '@expo/vector-icons';
import {
  Blur,
  Canvas,
  Circle,
  Fill,
  RadialGradient,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { Tabs } from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { surfaceSignal } from '../../theme/surface-signal';
import { colors, navigation, typography } from '../../theme/tokens';
import { ORB_BLOB_SOURCE } from './orb-blob';

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

type IconName = ComponentProps<typeof Ionicons>['name'];

type Section = {
  route: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  // Lobe direction in degrees, screen coordinates (0 = right, -90 = up).
  angle: number;
};

const SECTIONS: readonly Section[] = [
  { route: 'index', label: 'Запись', icon: 'create-outline', activeIcon: 'create', angle: 150 },
  { route: 'thoughts', label: 'Мысли', icon: 'bulb-outline', activeIcon: 'bulb', angle: -90 },
  { route: 'collections', label: 'Коллекции', icon: 'albums-outline', activeIcon: 'albums', angle: 30 },
];

// Geometry of the blob box (BOX × BOX), in points.
const BOX = 300;
const CENTER = { x: BOX / 2, y: 152 };
const CORE_R = 64;
const LOBE_R = 50;
const LOBE_DIST = 88;
const ORB_R = navigation.orbSize / 2;
const ORB = { x: BOX / 2, y: BOX - ORB_R - 8 };
const LOBE_SPHERE = 46;

const LOBES = SECTIONS.map((section) => {
  const rad = (section.angle * Math.PI) / 180;
  return {
    x: CENTER.x + Math.cos(rad) * LOBE_DIST,
    y: CENTER.y + Math.sin(rad) * LOBE_DIST,
  };
});

// Flat copies for worklets.
const LX = LOBES.map((l) => l.x);
const LY = LOBES.map((l) => l.y);

const BLOB_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(ORB_BLOB_SOURCE);
  } catch {
    return null;
  }
})();

// Warm orb gradient from the UI kit (gradient/orb), center → edge.
const ORB_COLORS = ['#FFE89A', '#FFAA85', '#FF8DB5', '#8A63FF', '#5531C9'];
const ORB_STOPS = [0, 0.22, 0.48, 0.75, 1];
// Cool orb (gradient/orb-cool) for the section lobes.
const COOL_COLORS = ['#E4FFA0', '#A8F0DE', '#6FA3FF', '#2A5BE0'] as const;

const OPEN_SPRING = { damping: 15, stiffness: 160, mass: 0.9 };
const CLOSE_TIMING = { duration: 220, easing: Easing.in(Easing.cubic) };

function lobeProgress(progress: number, index: number) {
  'worklet';
  const delay = 0.1 * (index + 1);
  return Math.max(0, (progress - delay) / (1 - delay));
}

export function OrbNavigator({ state, navigation: nav, insets }: TabBarProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const progress = useSharedValue(0);
  const hidden = useSharedValue(0);
  const breath = useSharedValue(0);

  const activeRoute = state.routes[state.index]?.name;
  const activeSection =
    SECTIONS.find((section) => section.route === activeRoute) ?? SECTIONS[0];

  // Text-heavy screens get a calmer background.
  useEffect(() => {
    surfaceSignal.scene.set(
      withTiming(activeRoute === 'index' ? 0 : 1, { duration: 500 }),
    );
  }, [activeRoute]);

  useEffect(() => {
    if (reduceMotion) {
      breath.set(0);
      return;
    }
    breath.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [breath, reduceMotion]);

  // The orb steps aside while the keyboard is up.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      hidden.set(withTiming(1, { duration: 180 }));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      hidden.set(withTiming(0, { duration: 260 }));
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [hidden]);

  const close = useCallback(() => {
    setIsOpen(false);
    progress.set(withTiming(0, CLOSE_TIMING));
  }, [progress]);

  const open = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(true);
    progress.set(
      reduceMotion ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN_SPRING),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  }, [progress, reduceMotion]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close, isOpen]);

  const goTo = useCallback(
    (route: string) => {
      void Haptics.selectionAsync().catch(() => undefined);
      close();
      if (route !== activeRoute) {
        nav.navigate(route);
      }
    },
    [activeRoute, close, nav],
  );

  const uniforms = useDerivedValue<Uniforms>(() => {
    const p = progress.value;
    const pc = Math.min(p, 1.08);
    const startR = ORB_R * 0.85;
    const lobe = (i: number) => {
      const q = lobeProgress(p, i);
      return [
        ORB.x + (LX[i] - ORB.x) * q,
        ORB.y + (LY[i] - ORB.y) * q,
        startR + (LOBE_R - startR) * Math.min(q, 1.06),
      ];
    };
    return {
      size: [BOX, BOX],
      c0: [
        ORB.x + (CENTER.x - ORB.x) * pc,
        ORB.y + (CENTER.y - ORB.y) * pc,
        startR + (CORE_R - startR) * pc,
      ],
      c1: lobe(0),
      c2: lobe(1),
      c3: lobe(2),
      smoothness: 26,
      alpha: Math.min(1, p * 4),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value),
  }));

  const orbStyle = useAnimatedStyle(() => {
    const visible = (1 - hidden.value) * (1 - Math.min(1, progress.value * 1.6));
    return {
      opacity: visible,
      transform: [
        { scale: (1 + 0.035 * breath.value) * (0.85 + 0.15 * visible) },
        { translateY: 24 * hidden.value },
      ],
    };
  });

  const centerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], 'clamp'),
  }));

  const bottom = insets.bottom + navigation.tabBarBottomInset;
  const boxLeft = (width - BOX) / 2;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть разделы"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[styles.box, { left: boxLeft, bottom }]}
      >
        {BLOB_EFFECT ? (
          <Canvas pointerEvents="none" style={styles.canvas}>
            <Fill>
              <Shader source={BLOB_EFFECT} uniforms={uniforms} />
            </Fill>
          </Canvas>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[styles.center, centerStyle]}
        >
          <Text style={styles.centerTitle}>{activeSection.label}</Text>
          <Text style={styles.centerHint}>Куда дальше?</Text>
        </Animated.View>

        {SECTIONS.map((section, index) => (
          <Lobe
            key={section.route}
            index={index}
            section={section}
            active={section.route === activeSection.route}
            enabled={isOpen}
            progress={progress}
            onPress={goTo}
          />
        ))}

        <Animated.View
          pointerEvents={isOpen || keyboardVisible ? 'none' : 'box-none'}
          style={[styles.orbWrap, orbStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Разделы. Сейчас: ${activeSection.label}`}
            accessibilityHint="Открывает переключение разделов"
            hitSlop={12}
            onPress={open}
            style={styles.orbPressable}
          >
            <Canvas style={styles.orbCanvas}>
              <Circle cx={ORB_CANVAS / 2} cy={ORB_CANVAS / 2 + 4} r={ORB_R * 0.95} color="rgba(255, 138, 92, 0.45)">
                <Blur blur={14} />
              </Circle>
              <Circle cx={ORB_CANVAS / 2} cy={ORB_CANVAS / 2} r={ORB_R}>
                <RadialGradient
                  c={vec(ORB_CANVAS / 2 - ORB_R * 0.28, ORB_CANVAS / 2 - ORB_R * 0.34)}
                  r={ORB_R * 1.45}
                  colors={ORB_COLORS}
                  positions={ORB_STOPS}
                />
              </Circle>
              <Circle
                cx={ORB_CANVAS / 2 - ORB_R * 0.32}
                cy={ORB_CANVAS / 2 - ORB_R * 0.42}
                r={ORB_R * 0.26}
                color="rgba(255, 255, 255, 0.55)"
              >
                <Blur blur={5} />
              </Circle>
            </Canvas>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const ORB_CANVAS = navigation.orbSize + 40;

type LobeProps = {
  index: number;
  section: Section;
  active: boolean;
  enabled: boolean;
  progress: SharedValue<number>;
  onPress: (route: string) => void;
};

function Lobe({ index, section, active, enabled, progress, onPress }: LobeProps) {
  const target = LOBES[index];
  const style = useAnimatedStyle(() => {
    const q = lobeProgress(progress.value, index);
    const appear = interpolate(q, [0.35, 1], [0, 1], 'clamp');
    return {
      opacity: appear,
      transform: [
        { translateX: (ORB.x - target.x) * (1 - Math.min(q, 1)) },
        { translateY: (ORB.y - target.y) * (1 - Math.min(q, 1)) },
        { scale: 0.6 + 0.4 * appear },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={enabled ? 'box-none' : 'none'}
      style={[
        styles.lobe,
        { left: target.x - LOBE_R, top: target.y - LOBE_R },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.label}
        accessibilityState={{ selected: active }}
        onPress={() => onPress(section.route)}
        style={({ pressed }) => [styles.lobePressable, pressed && styles.pressed]}
      >
        <View style={[styles.sphereRing, active && styles.sphereRingActive]}>
          <LinearGradient
            colors={COOL_COLORS}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.9, y: 0.95 }}
            style={styles.sphere}
          >
            <Ionicons
              name={active ? section.activeIcon : section.icon}
              size={22}
              color="#FFFFFF"
            />
          </LinearGradient>
        </View>
        <Text style={[styles.lobeLabel, active && styles.lobeLabelActive]}>
          {section.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(7, 6, 11, 0.55)',
  },
  box: {
    position: 'absolute',
    width: BOX,
    height: BOX,
  },
  canvas: {
    position: 'absolute',
    width: BOX,
    height: BOX,
  },
  center: {
    position: 'absolute',
    left: CENTER.x - CORE_R,
    top: CENTER.y - 22,
    width: CORE_R * 2,
    alignItems: 'center',
  },
  centerTitle: {
    ...typography.button,
    color: colors.textPrimary,
  },
  centerHint: {
    ...typography.navigationLabel,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(189, 188, 207, 0.6)',
    marginTop: 2,
  },
  lobe: {
    position: 'absolute',
    width: LOBE_R * 2,
    height: LOBE_R * 2,
  },
  lobePressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  sphereRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sphereRingActive: {
    borderColor: 'rgba(201, 184, 255, 0.85)',
    shadowColor: '#8A63FF',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  sphere: {
    width: LOBE_SPHERE,
    height: LOBE_SPHERE,
    borderRadius: LOBE_SPHERE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobeLabel: {
    ...typography.navigationLabel,
    color: colors.textSecondary,
  },
  lobeLabelActive: {
    color: colors.textPrimary,
  },
  orbWrap: {
    position: 'absolute',
    left: ORB.x - ORB_CANVAS / 2,
    top: ORB.y - ORB_CANVAS / 2,
    width: ORB_CANVAS,
    height: ORB_CANVAS,
  },
  orbPressable: {
    flex: 1,
  },
  orbCanvas: {
    flex: 1,
  },
});
