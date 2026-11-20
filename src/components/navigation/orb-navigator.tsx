import { Ionicons } from '@expo/vector-icons';
import {
  Blur,
  Canvas,
  Circle,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
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

// Geometry, in points. The box spans the screen width and sits on its bottom edge.
const BOX_H = 340;
const ORB_R = navigation.orbSize / 2;
const ARC_R = 158;
const LOBE = 84;
const HIT_R = 50;
const ARC_GAP_DEG = 15;
const ORB_CANVAS = navigation.orbSize + 70;

// A quick press without movement opens the menu and leaves it open for taps.
const TAP_MS = 220;
const TAP_SLOP = 10;

// Warm orb gradient from the UI kit (gradient/orb), toned down.
const ORB_COLORS = ['#E8D8A6', '#E3A98F', '#D18FAE', '#7A62D2', '#3F2D93'];
const ORB_STOPS = [0, 0.22, 0.5, 0.78, 1];

const OPEN_SPRING = { damping: 17, stiffness: 180, mass: 0.85 };
const FOCUS_SPRING = { damping: 18, stiffness: 260 };
const CLOSE_TIMING = { duration: 220, easing: Easing.in(Easing.cubic) };

function lobeProgress(progress: number, index: number) {
  'worklet';
  const delay = 0.08 * (index + 1);
  return Math.max(0, (progress - delay) / (1 - delay));
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
  // Which section the finger is over, and how much (0 = none).
  const focusIndex = useSharedValue(0);
  const focusAmount = useSharedValue(0);
  const hidden = useSharedValue(0);
  const breath = useSharedValue(0);

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

  // A thin arc that links the sections, with gaps around each icon.
  const arcPath = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    const rect = Skia.XYWHRect(orb.x - ARC_R, orb.y - ARC_R, ARC_R * 2, ARC_R * 2);
    for (let i = 0; i < SECTIONS.length - 1; i += 1) {
      const from = SECTIONS[i].angle + ARC_GAP_DEG;
      const to = SECTIONS[i + 1].angle - ARC_GAP_DEG;
      builder.addArc(rect, from, to - from);
    }
    return builder.build();
  }, [orb]);

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
    focusAmount.set(withTiming(0, { duration: 160 }));
    progress.set(withTiming(0, CLOSE_TIMING));
  }, [focusAmount, progress]);

  const open = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(true);
    focusAmount.set(0);
    progress.set(
      reduceMotion ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN_SPRING),
    );
    haptic('press');
  }, [focusAmount, progress, reduceMotion]);

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
  // Releasing anywhere else (including on the orb itself) keeps the screen.
  const gesture = useRef({
    startedAt: 0,
    startX: 0,
    startY: 0,
    // Box origin in window coordinates, measured at touch start.
    originX: 0,
    originY: 0,
    wasOpen: false,
    moved: false,
    index: -1,
  });

  const onGrant = (event: GestureResponderEvent) => {
    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    gesture.current = {
      startedAt: Date.now(),
      startX: pageX,
      startY: pageY,
      originX: pageX - locationX - (orb.x - ORB_CANVAS / 2),
      originY: pageY - locationY - (orb.y - ORB_CANVAS / 2),
      wasOpen: isOpen,
      moved: false,
      index: -1,
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
    const x = pageX - g.originX;
    const y = pageY - g.originY;
    let hit = -1;
    lobes.forEach((lobe, i) => {
      if (Math.hypot(lobe.x - x, lobe.y - y) < HIT_R) {
        hit = i;
      }
    });
    if (hit === g.index) {
      return;
    }
    if (hit === -1) {
      focusAmount.set(withTiming(0, { duration: 140 }));
    } else {
      if (g.index === -1) {
        focusIndex.set(hit);
      } else {
        focusIndex.set(withSpring(hit, FOCUS_SPRING));
      }
      focusAmount.set(withSpring(1, FOCUS_SPRING));
      haptic('select');
    }
    g.index = hit;
  };

  const onRelease = () => {
    const g = gesture.current;
    const quick = Date.now() - g.startedAt < TAP_MS;
    if (!g.moved && quick) {
      // A tap: stay open for a tap on a section, or close if it was open.
      if (g.wasOpen) {
        close();
      }
      return;
    }
    if (g.index === -1) {
      close();
      return;
    }
    goTo(g.index);
  };

  const arcEnd = useDerivedValue(() =>
    interpolate(progress.value, [0.3, 1], [0, 1], 'clamp'),
  );
  const arcOpacity = useDerivedValue(() => Math.min(1, progress.value * 1.5));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value),
  }));

  const orbStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return {
      opacity: 1 - hidden.value,
      transform: [
        { translateY: (ORB_R + 24) * hidden.value },
        { scale: (1 + 0.025 * breath.value) * (1 + 0.06 * p) },
      ],
    };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.value, [0.6, 1], [0, 1], 'clamp') *
      (1 - focusAmount.value),
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
        <Canvas pointerEvents="none" style={[styles.canvas, { width }]}>
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={1}
            strokeCap="round"
            color="rgba(220, 219, 232, 0.32)"
            start={0}
            end={arcEnd}
            opacity={arcOpacity}
          />
        </Canvas>

        <Animated.Text
          pointerEvents="none"
          style={[styles.hint, { top: topLobe.y - LOBE / 2 - 24, width }, hintStyle]}
        >
          Slide to a section
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
            focusIndex={focusIndex}
            focusAmount={focusAmount}
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
              r={ORB_R * 0.95}
              color="rgba(209, 143, 174, 0.22)"
            >
              <Blur blur={22} />
            </Circle>
            <Circle cx={ORB_CANVAS / 2} cy={ORB_CANVAS / 2} r={ORB_R} opacity={0.82}>
              <RadialGradient
                c={vec(ORB_CANVAS / 2 - ORB_R * 0.18, ORB_CANVAS / 2 - ORB_R * 0.5)}
                r={ORB_R * 1.55}
                colors={ORB_COLORS}
                positions={ORB_STOPS}
              />
              <Blur blur={5} />
            </Circle>
            <Circle
              cx={ORB_CANVAS / 2 - ORB_R * 0.24}
              cy={ORB_CANVAS / 2 - ORB_R * 0.55}
              r={ORB_R * 0.2}
              color="rgba(255, 255, 255, 0.28)"
            >
              <Blur blur={8} />
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
  focusIndex: SharedValue<number>;
  focusAmount: SharedValue<number>;
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
  onPress,
}: LobeProps) {
  const style = useAnimatedStyle(() => {
    const q = lobeProgress(progress.value, index);
    const appear = interpolate(q, [0.35, 1], [0, 1], 'clamp');
    const rest = 1 - Math.min(q, 1);
    const w = focusAmount.value * Math.max(0, 1 - Math.abs(focusIndex.value - index));
    return {
      opacity: appear * (0.72 + 0.28 * w),
      transform: [
        { translateX: (origin.x - position.x) * rest },
        { translateY: (origin.y - position.y) * rest },
        { scale: (0.6 + 0.4 * appear) * (1 + 0.16 * w) },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    const w = focusAmount.value * Math.max(0, 1 - Math.abs(focusIndex.value - index));
    return { opacity: w, transform: [{ scale: 0.75 + 0.25 * w }] };
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
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={section.label}
        accessibilityState={{ selected: active }}
        onPress={() => onPress(index)}
        style={styles.lobePressable}
      >
        <Ionicons
          name={active ? section.activeIcon : section.icon}
          size={26}
          color={colors.textPrimary}
        />
        <Text style={[styles.lobeLabel, active && styles.lobeLabelActive]}>
          {section.label}
        </Text>
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
  hint: {
    ...typography.navigationLabel,
    position: 'absolute',
    left: 0,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: 'rgba(189, 188, 207, 0.55)',
  },
  lobe: {
    position: 'absolute',
    width: LOBE,
    height: LOBE,
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: LOBE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  lobePressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
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
    width: ORB_CANVAS,
    height: ORB_CANVAS,
  },
  orbCanvas: {
    flex: 1,
  },
});
