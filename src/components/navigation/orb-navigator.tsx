import { Ionicons } from '@expo/vector-icons';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
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
import { scheduleOnRN } from 'react-native-worklets';

import { surfaceSignal } from '../../theme/surface-signal';
import { colors, navigation, surfaceReaction, typography } from '../../theme/tokens';
import { GLASS_BLOB_SOURCE, HIDDEN_CIRCLE } from '../glass-blob';
import { LiquidOrb } from './liquid-orb';

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

type IconName = ComponentProps<typeof Ionicons>['name'];

type Section = {
  route: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  // Position on the arc in degrees, screen coordinates (-90 = straight up).
  angle: number;
};

// Left to right: all thoughts, writing in the middle, collections.
const SECTIONS: readonly Section[] = [
  { route: 'thoughts', label: 'Thoughts', icon: 'reader-outline', activeIcon: 'reader', angle: -148 },
  { route: 'index', label: 'Write', icon: 'create-outline', activeIcon: 'create', angle: -90 },
  { route: 'collections', label: 'Collections', icon: 'albums-outline', activeIcon: 'albums', angle: -32 },
];

const ANGLE_MIN = Math.min(...SECTIONS.map((s) => s.angle));
const ANGLE_MAX = Math.max(...SECTIONS.map((s) => s.angle));

// Geometry, in points. The box spans the screen width and sits on its bottom edge.
const BOX_H = 360;
const ORB_R = navigation.orbSize / 2;
const ORB_CANVAS = navigation.orbSize + 40;
const ARC_R = 164;
const ARC_START = (ANGLE_MIN * Math.PI) / 180;
const ARC_END = (ANGLE_MAX * Math.PI) / 180;
const ARC_WIDTH = 1.2;
const LOBE = 84;
const LOBE_R = 34;
const LOBE_GROW = 10;
const HIT_R = 52;

// A quick press without movement opens the menu and leaves it open for taps.
const TAP_MS = 220;

const OPEN_SPRING = { damping: 17, stiffness: 220, mass: 0.8 };
const FOCUS_SPRING = { damping: 20, stiffness: 380 };
const CLOSE_TIMING = { duration: 200, easing: Easing.in(Easing.cubic) };

const BLOB_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(GLASS_BLOB_SOURCE);
  } catch {
    return null;
  }
})();

function lobeProgress(progress: number, index: number) {
  'worklet';
  const delay = 0.06 * (index + 1);
  return Math.max(0, (progress - delay) / (1 - delay));
}

function focusWeight(index: number, focusIndex: number, focusAmount: number) {
  'worklet';
  return focusAmount * Math.max(0, 1 - Math.abs(focusIndex - index));
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
  const { width, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const progress = useSharedValue(0);
  // Which section the finger is over (focusAmount 0 = none).
  const focusIndex = useSharedValue(0);
  const focusAmount = useSharedValue(0);
  // 1 when the menu was opened with a tap: labels show for all sections.
  const tapMode = useSharedValue(0);
  const hidden = useSharedValue(0);
  const breath = useSharedValue(0);
  // Gesture bookkeeping, on the UI thread.
  const gStart = useSharedValue(0);
  const gWasOpen = useSharedValue(false);
  const gActive = useSharedValue(false);
  const gIndex = useSharedValue(-1);
  const openShared = useSharedValue(false);

  const activeRoute = state.routes[state.index]?.name;
  const activeIndex = Math.max(
    0,
    SECTIONS.findIndex((section) => section.route === activeRoute),
  );

  // The orb is half tucked under the bottom edge of the screen.
  const orb = useMemo(
    () => ({ x: width / 2, y: BOX_H - insets.bottom * 0.3 }),
    [insets.bottom, width],
  );
  const lobes = useMemo(
    () =>
      SECTIONS.map((section) => {
        const rad = (section.angle * Math.PI) / 180;
        return {
          x: orb.x + Math.cos(rad) * ARC_R,
          y: orb.y + Math.sin(rad) * ARC_R,
        };
      }),
    [orb],
  );
  const lobeX = lobes.map((l) => l.x);
  const lobeY = lobes.map((l) => l.y);
  const wrapLeft = orb.x - ORB_CANVAS / 2;
  const wrapTop = orb.y - ORB_CANVAS / 2;

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
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
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
    openShared.set(false);
    tapMode.set(withTiming(0, { duration: 150 }));
    focusAmount.set(withTiming(0, { duration: 150 }));
    progress.set(withTiming(0, CLOSE_TIMING));
  }, [focusAmount, openShared, progress, tapMode]);

  const markOpen = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(true);
    haptic('press');
  }, []);

  const openWithTap = useCallback(() => {
    markOpen();
    openShared.set(true);
    tapMode.set(withTiming(1, { duration: 200 }));
    progress.set(
      reduceMotion ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN_SPRING),
    );
  }, [markOpen, openShared, progress, reduceMotion, tapMode]);

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

  // Press and hold the orb, move the finger onto a section, release to go.
  // Releasing anywhere else (the orb itself included) keeps the screen.
  // Runs on the UI thread so the menu follows the finger without lag.
  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      'worklet';
      gStart.set(Date.now());
      gWasOpen.set(openShared.value);
      gActive.set(false);
      gIndex.set(-1);
      if (!openShared.value) {
        openShared.set(true);
        tapMode.set(0);
        focusAmount.set(0);
        progress.set(withSpring(1, OPEN_SPRING));
        scheduleOnRN(markOpen);
      }
    },
    onActivate: () => {
      'worklet';
      gActive.set(true);
    },
    onUpdate: (event) => {
      'worklet';
      const x = event.x + wrapLeft;
      const y = event.y + wrapTop;
      let hit = -1;
      for (let i = 0; i < lobeX.length; i += 1) {
        const dx = lobeX[i] - x;
        const dy = lobeY[i] - y;
        if (dx * dx + dy * dy < HIT_R * HIT_R) {
          hit = i;
        }
      }
      if (hit === gIndex.value) {
        return;
      }
      if (hit === -1) {
        focusAmount.set(withTiming(0, { duration: 120 }));
      } else {
        if (gIndex.value === -1) {
          focusIndex.set(hit);
        } else {
          focusIndex.set(withSpring(hit, FOCUS_SPRING));
        }
        focusAmount.set(withSpring(1, FOCUS_SPRING));
        tapMode.set(withTiming(0, { duration: 120 }));
        scheduleOnRN(haptic, 'select');
      }
      gIndex.set(hit);
    },
    onFinalize: () => {
      'worklet';
      const quick = Date.now() - gStart.value < TAP_MS;
      if (!gActive.value && quick) {
        // A tap: keep the menu open for a tap on a section, or close it.
        if (gWasOpen.value) {
          scheduleOnRN(close);
        } else {
          tapMode.set(withTiming(1, { duration: 200 }));
        }
        return;
      }
      if (gIndex.value === -1) {
        scheduleOnRN(close);
      } else {
        scheduleOnRN(goTo, gIndex.value);
      }
    },
  });

  // Glass bubbles for the sections, linked to each other by a thin liquid arc.
  const blobUniforms = useDerivedValue<Uniforms>(() => {
    const p = progress.value;
    const ringIn = interpolate(p, [0.7, 1], [0, 1], 'clamp');
    const lobe = (i: number) => {
      const q = lobeProgress(p, i);
      const w = focusWeight(i, focusIndex.value, focusAmount.value);
      const r = LOBE_R + LOBE_GROW * w;
      const startR = ORB_R * 0.5;
      return [
        orb.x + (lobeX[i] - orb.x) * q,
        orb.y + (lobeY[i] - orb.y) * q,
        startR + (r - startR) * Math.min(q, 1.06),
      ];
    };
    return {
      size: [width, BOX_H],
      c0: lobe(0),
      c1: lobe(1),
      c2: lobe(2),
      c3: HIDDEN_CIRCLE,
      c4: HIDDEN_CIRCLE,
      c5: HIDDEN_CIRCLE,
      smoothness: 1,
      alpha: Math.min(1, p * 4),
      ringCenter: [orb.x, orb.y],
      ring: [ARC_R, ARC_START, ARC_END],
      ringWidth: ARC_WIDTH * ringIn,
      ringSmoothness: 16,
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
        { translateY: (ORB_R + 24) * hidden.value },
        { scale: (1 + 0.03 * breath.value) * (1 + 0.07 * p) },
      ],
    };
  });

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
              <Shader source={BLOB_EFFECT} uniforms={blobUniforms} />
            </Fill>
          </Canvas>
        ) : null}

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
            focusIndex={focusIndex}
            focusAmount={focusAmount}
            tapMode={tapMode}
            onPress={goTo}
          />
        ))}

        <GestureDetector gesture={pan}>
          <Animated.View
            pointerEvents={keyboardVisible ? 'none' : 'auto'}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Sections. Current: ${SECTIONS[activeIndex].label}`}
            accessibilityHint="Opens the section switcher"
            onAccessibilityTap={() => (isOpen ? close() : openWithTap())}
            style={[
              styles.orbWrap,
              { left: wrapLeft, top: wrapTop },
              orbStyle,
            ]}
          >
            <LiquidOrb
              size={ORB_CANVAS}
              radius={ORB_R}
              screenX={wrapLeft}
              screenY={windowHeight - BOX_H + wrapTop}
            />
          </Animated.View>
        </GestureDetector>
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
  focusIndex: SharedValue<number>;
  focusAmount: SharedValue<number>;
  tapMode: SharedValue<number>;
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
  focusIndex,
  focusAmount,
  tapMode,
  onPress,
}: LobeProps) {
  const style = useAnimatedStyle(() => {
    const q = lobeProgress(progress.value, index);
    const appear = interpolate(q, [0.35, 1], [0, 1], 'clamp');
    const rest = 1 - Math.min(q, 1);
    const w = focusWeight(index, focusIndex.value, focusAmount.value);
    return {
      opacity: appear * (0.75 + 0.25 * w),
      transform: [
        { translateX: (origin.x - position.x) * rest },
        { translateY: (origin.y - position.y) * rest },
        { scale: (0.6 + 0.4 * appear) * (1 + 0.14 * w) },
      ],
    };
  });

  // The name pops out above the bubble, so it stays visible beside the finger.
  const labelStyle = useAnimatedStyle(() => {
    const w = focusWeight(index, focusIndex.value, focusAmount.value);
    const appear = interpolate(lobeProgress(progress.value, index), [0.6, 1], [0, 1], 'clamp');
    const show = Math.max(w, tapMode.value * 0.85) * appear;
    return {
      opacity: show,
      transform: [{ translateY: 8 * (1 - show) - 10 * w }, { scale: 0.9 + 0.1 * show }],
    };
  });

  return (
    <Animated.View
      pointerEvents={enabled ? 'box-none' : 'none'}
      style={[
        styles.lobe,
        { left: position.x - LOBE / 2, top: position.y - LOBE / 2 },
        style,
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.labelWrap, labelStyle]}>
        <Animated.Text style={styles.label}>{section.label}</Animated.Text>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.label}
        accessibilityState={{ selected: active }}
        onPress={() => onPress(index)}
        style={styles.lobePressable}
      >
        <Ionicons
          name={active ? section.activeIcon : section.icon}
          size={24}
          color={active ? colors.textPrimary : colors.textSecondary}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(7, 6, 11, 0.6)',
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
  lobe: {
    position: 'absolute',
    width: LOBE,
    height: LOBE,
  },
  lobePressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: LOBE / 2 + LOBE_R + 6,
    alignItems: 'center',
  },
  label: {
    ...typography.navigationLabel,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(19, 18, 27, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  orbWrap: {
    position: 'absolute',
    width: ORB_CANVAS,
    height: ORB_CANVAS,
  },
});
