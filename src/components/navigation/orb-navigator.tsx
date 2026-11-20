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
  useMemo,
  useRef,
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
  type GestureResponderEvent,
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
import { colors, navigation, surfaceReaction, typography } from '../../theme/tokens';
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

// Left to right, so sliding the finger sideways walks through them in order.
const SECTIONS: readonly Section[] = [
  { route: 'index', label: 'Write', icon: 'create-outline', activeIcon: 'create', angle: -152 },
  { route: 'thoughts', label: 'Thoughts', icon: 'bulb-outline', activeIcon: 'bulb', angle: -90 },
  { route: 'collections', label: 'Collections', icon: 'albums-outline', activeIcon: 'albums', angle: -28 },
];

// Geometry, in points. The box spans the screen width and sits on its bottom edge.
const BOX_H = 320;
const ORB_R = navigation.orbSize / 2;
const CORE_R = 70;
const LOBE_R = 44;
const LOBE_FOCUS_GROW = 9;
const LOBE_DIST = 128;
const LOBE_SPHERE = 44;
const ORB_CANVAS = navigation.orbSize + 56;

// A quick press without movement opens the blob and leaves it open for taps.
const TAP_MS = 220;
const TAP_SLOP = 10;

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

const OPEN_SPRING = { damping: 16, stiffness: 190, mass: 0.85 };
const FOCUS_SPRING = { damping: 18, stiffness: 260 };
const CLOSE_TIMING = { duration: 220, easing: Easing.in(Easing.cubic) };

function lobeProgress(progress: number, index: number) {
  'worklet';
  const delay = 0.08 * (index + 1);
  return Math.max(0, (progress - delay) / (1 - delay));
}

function focusWeight(focus: number, index: number) {
  'worklet';
  return Math.max(0, 1 - Math.abs(focus - index));
}

function haptic(kind: 'press' | 'select' | 'go') {
  const run =
    kind === 'select'
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(
          kind === 'press'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
  void run.catch(() => undefined);
}

export function OrbNavigator({ state, navigateToTab, insets }: TabBarProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const progress = useSharedValue(0);
  const focus = useSharedValue(0);
  const hidden = useSharedValue(0);
  const breath = useSharedValue(0);

  const activeRoute = state.routes[state.index]?.name;
  const activeIndex = Math.max(
    0,
    SECTIONS.findIndex((section) => section.route === activeRoute),
  );

  // The orb is half tucked under the bottom edge of the screen.
  const orb = useMemo(
    () => ({ x: width / 2, y: BOX_H - insets.bottom * 0.35 }),
    [insets.bottom, width],
  );
  const lobes = useMemo(
    () =>
      SECTIONS.map((section) => {
        const rad = (section.angle * Math.PI) / 180;
        return {
          x: orb.x + Math.cos(rad) * LOBE_DIST,
          y: orb.y + Math.sin(rad) * LOBE_DIST,
        };
      }),
    [orb],
  );

  // The living surface only moves on the capture screen.
  useEffect(() => {
    surfaceSignal.scene.set(
      withTiming(activeRoute === 'index' ? 0 : 1, {
        duration: surfaceReaction.sceneDuration,
      }),
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
    focus.set(activeIndex);
    progress.set(
      reduceMotion ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN_SPRING),
    );
    haptic('press');
  }, [activeIndex, focus, progress, reduceMotion]);

  const goTo = useCallback(
    (index: number) => {
      close();
      const route = SECTIONS[index]?.route;
      const target = state.routes.find((r) => r.name === route);
      if (target && index !== activeIndex) {
        haptic('go');
        navigateToTab(target.key);
      }
    },
    [activeIndex, close, navigateToTab, state.routes],
  );

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

  // Press and hold the orb, slide sideways to pick a section, release to go.
  const gesture = useRef({
    startedAt: 0,
    startX: 0,
    startY: 0,
    wasOpen: false,
    moved: false,
    index: 0,
  });

  const onGrant = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    gesture.current = {
      startedAt: Date.now(),
      startX: pageX,
      startY: pageY,
      wasOpen: isOpen,
      moved: false,
      index: activeIndex,
    };
    if (!isOpen) {
      open();
    }
  };

  const onMove = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const g = gesture.current;
    if (
      Math.abs(pageX - g.startX) > TAP_SLOP ||
      Math.abs(pageY - g.startY) > TAP_SLOP
    ) {
      g.moved = true;
    }
    if (!g.moved) {
      return;
    }
    let nearest = 0;
    let best = Infinity;
    lobes.forEach((lobe, i) => {
      const d = Math.abs(lobe.x - pageX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    if (nearest !== g.index) {
      g.index = nearest;
      focus.set(withSpring(nearest, FOCUS_SPRING));
      haptic('select');
    }
  };

  const onRelease = () => {
    const g = gesture.current;
    const quick = Date.now() - g.startedAt < TAP_MS;
    if (!g.moved && quick) {
      // A tap: open and wait for a tap on a lobe, or close if it was open.
      if (g.wasOpen) {
        close();
      }
      return;
    }
    goTo(g.index);
  };

  const uniforms = useDerivedValue<Uniforms>(() => {
    const p = progress.value;
    const f = focus.value;
    const pc = Math.min(p, 1.08);
    const startR = ORB_R * 0.9;
    const lobe = (i: number) => {
      const q = lobeProgress(p, i);
      const target = lobes[i];
      const r = LOBE_R + LOBE_FOCUS_GROW * focusWeight(f, i);
      return [
        orb.x + (target.x - orb.x) * q,
        orb.y + (target.y - orb.y) * q,
        startR * 0.7 + (r - startR * 0.7) * Math.min(q, 1.06),
      ];
    };
    return {
      size: [width, BOX_H],
      c0: [orb.x, orb.y, startR + (CORE_R - startR) * pc],
      c1: lobe(0),
      c2: lobe(1),
      c3: lobe(2),
      smoothness: 34,
      alpha: Math.min(1, p * 4),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value),
  }));

  const orbStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return {
      opacity: 1 - hidden.value,
      transform: [
        { translateY: (ORB_R + 20) * hidden.value },
        { scale: (1 + 0.03 * breath.value) * (1 + 0.08 * p) },
      ],
    };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [0, 1], 'clamp'),
  }));

  const topLobe = lobes[1];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sections"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.box, { width }]}>
        {BLOB_EFFECT ? (
          <Canvas pointerEvents="none" style={[styles.canvas, { width }]}>
            <Fill>
              <Shader source={BLOB_EFFECT} uniforms={uniforms} />
            </Fill>
          </Canvas>
        ) : null}

        <Animated.Text
          pointerEvents="none"
          style={[
            styles.hint,
            { top: topLobe.y - LOBE_R - LOBE_FOCUS_GROW - 26, width },
            hintStyle,
          ]}
        >
          Slide to choose
        </Animated.Text>

        {SECTIONS.map((section, index) => (
          <Lobe
            key={section.route}
            index={index}
            section={section}
            position={lobes[index]}
            origin={orb}
            active={index === activeIndex}
            enabled={isOpen}
            progress={progress}
            focus={focus}
            onPress={goTo}
          />
        ))}

        <Animated.View
          pointerEvents={keyboardVisible ? 'none' : 'auto'}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Sections. Current: ${SECTIONS[activeIndex].label}`}
          accessibilityHint="Opens the section switcher"
          onAccessibilityTap={() => (isOpen ? close() : open())}
          style={[
            styles.orbWrap,
            { left: orb.x - ORB_CANVAS / 2, top: orb.y - ORB_CANVAS / 2 },
            orbStyle,
          ]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
          onResponderTerminate={close}
        >
          <Canvas pointerEvents="none" style={styles.orbCanvas}>
            <Circle
              cx={ORB_CANVAS / 2}
              cy={ORB_CANVAS / 2}
              r={ORB_R}
              color="rgba(255, 138, 92, 0.45)"
            >
              <Blur blur={18} />
            </Circle>
            <Circle cx={ORB_CANVAS / 2} cy={ORB_CANVAS / 2} r={ORB_R}>
              <RadialGradient
                c={vec(ORB_CANVAS / 2 - ORB_R * 0.2, ORB_CANVAS / 2 - ORB_R * 0.45)}
                r={ORB_R * 1.5}
                colors={ORB_COLORS}
                positions={ORB_STOPS}
              />
            </Circle>
            <Circle
              cx={ORB_CANVAS / 2 - ORB_R * 0.28}
              cy={ORB_CANVAS / 2 - ORB_R * 0.5}
              r={ORB_R * 0.22}
              color="rgba(255, 255, 255, 0.55)"
            >
              <Blur blur={6} />
            </Circle>
          </Canvas>
        </Animated.View>
      </View>
    </View>
  );
}

type LobeProps = {
  index: number;
  section: Section;
  position: { x: number; y: number };
  origin: { x: number; y: number };
  active: boolean;
  enabled: boolean;
  progress: SharedValue<number>;
  focus: SharedValue<number>;
  onPress: (index: number) => void;
};

function Lobe({
  index,
  section,
  position,
  origin,
  active,
  enabled,
  progress,
  focus,
  onPress,
}: LobeProps) {
  const style = useAnimatedStyle(() => {
    const q = lobeProgress(progress.value, index);
    const appear = interpolate(q, [0.35, 1], [0, 1], 'clamp');
    const rest = 1 - Math.min(q, 1);
    const w = focusWeight(focus.value, index);
    return {
      opacity: appear * (0.62 + 0.38 * w),
      transform: [
        { translateX: (origin.x - position.x) * rest },
        { translateY: (origin.y - position.y) * rest },
        { scale: (0.6 + 0.4 * appear) * (1 + 0.14 * w) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={enabled ? 'box-none' : 'none'}
      style={[
        styles.lobe,
        { left: position.x - LOBE_R, top: position.y - LOBE_R },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.label}
        accessibilityState={{ selected: active }}
        onPress={() => onPress(index)}
        style={styles.lobePressable}
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
              size={21}
              color="#FFFFFF"
            />
          </LinearGradient>
        </View>
        <Text style={styles.lobeLabel}>{section.label}</Text>
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
    left: 0,
    bottom: 0,
    height: BOX_H,
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: BOX_H,
  },
  hint: {
    ...typography.navigationLabel,
    position: 'absolute',
    left: 0,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: 'rgba(189, 188, 207, 0.6)',
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
    gap: 3,
  },
  sphereRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sphereRingActive: {
    borderColor: 'rgba(201, 184, 255, 0.85)',
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
    color: colors.textPrimary,
  },
  orbWrap: {
    position: 'absolute',
    width: ORB_CANVAS,
    height: ORB_CANVAS,
  },
  orbCanvas: {
    flex: 1,
  },
});
