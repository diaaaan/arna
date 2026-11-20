import { Ionicons } from '@expo/vector-icons';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GLASS_BLOB_SOURCE, HIDDEN_CIRCLE, NO_RING } from '../../components/glass-blob';
import { colors, typography } from '../../theme/tokens';

// Vertical wheel of collections at the right edge, in the same glass-bubble
// style as the orb menu. Drag anywhere in the lower right strip of the screen
// (thumb reach) to turn it; it swells a little while it is held and shows the
// name of the bubble under focus to the left, away from the thumb. The
// gesture runs on the UI thread; the collection switches when the finger lifts.

export type CategoryWheelItem = {
  id: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

type CategoryWheelProps = {
  items: readonly CategoryWheelItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  // Height of the area the wheel lives in.
  height: number;
};

// Width the content should leave free on the right.
export const CATEGORY_WHEEL_WIDTH = 96;

const MAX_ITEMS = 6;
const CANVAS_W = 150;
const COL_X = CANVAS_W - CATEGORY_WHEEL_WIDTH / 2; // bubble column, canvas coords
const SPACING = 52;
const SPACING_HELD = 60;
const ARC_R = 230;
const R_CENTER = 27;
const R_NEAR = 21;
const HOLD_GROW = 4;
// The touch strip covers the lower part of the area.
const ZONE_TOP_FRACTION = 0.3;
const CENTER_FRACTION = 0.62;

const BLOB_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(GLASS_BLOB_SOURCE);
  } catch {
    return null;
  }
})();

function itemGeometry(index: number, offset: number, held: number, centerY: number) {
  'worklet';
  const rel = index - offset;
  const a = Math.abs(rel);
  const spacing = SPACING + (SPACING_HELD - SPACING) * held;
  const dy = rel * spacing;
  const d = Math.min(Math.abs(dy), ARC_R * 0.95);
  const dx = ARC_R - Math.sqrt(ARC_R * ARC_R - d * d);
  const near = Math.max(0, 1 - a);
  let r = R_NEAR + (R_CENTER - R_NEAR) * near + HOLD_GROW * held;
  // Fade the far ones out by shrinking them.
  r *= Math.max(0, Math.min(1, 3.2 - a));
  return { x: COL_X + dx, y: centerY + dy, r, a };
}

function tick() {
  void Haptics.selectionAsync().catch(() => undefined);
}

export function CategoryWheel({ items, selectedId, onSelect, height }: CategoryWheelProps) {
  const count = Math.min(items.length, MAX_ITEMS);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const offset = useSharedValue(selectedIndex);
  const held = useSharedValue(0);
  const centerY = height * CENTER_FRACTION;
  const zoneTop = height * ZONE_TOP_FRACTION;

  const gStartOffset = useSharedValue(0);
  const gIndex = useSharedValue(selectedIndex);
  const gActive = useSharedValue(false);
  const dragging = useSharedValue(false);

  // Follow selection changes that come from elsewhere.
  useEffect(() => {
    if (!dragging.value) {
      offset.set(withSpring(selectedIndex, { damping: 18, stiffness: 220 }));
      gIndex.set(selectedIndex);
    }
  }, [dragging, gIndex, offset, selectedIndex]);

  const choose = (index: number) => {
    const item = items[index];
    if (item && item.id !== selectedId) {
      onSelect(item.id);
    }
  };

  const pan = usePanGesture({
    minDistance: 4,
    onBegin: () => {
      'worklet';
      dragging.set(true);
      gActive.set(false);
      gStartOffset.set(offset.value);
      held.set(withSpring(1, { damping: 14, stiffness: 260 }));
    },
    onActivate: () => {
      'worklet';
      gActive.set(true);
    },
    onUpdate: (event) => {
      'worklet';
      const next = Math.min(
        count - 0.55,
        Math.max(-0.45, gStartOffset.value - event.translationY / SPACING_HELD),
      );
      offset.set(next);
      const index = Math.min(count - 1, Math.max(0, Math.round(next)));
      if (index !== gIndex.value) {
        gIndex.set(index);
        scheduleOnRN(tick);
      }
    },
    onFinalize: (event) => {
      'worklet';
      dragging.set(false);
      held.set(withSpring(0, { damping: 16, stiffness: 220 }));
      let index = gIndex.value;
      if (!gActive.value) {
        // A tap: pick the bubble at that height.
        const y = event.y + zoneTop;
        index = Math.min(
          count - 1,
          Math.max(0, Math.round(offset.value + (y - centerY) / SPACING)),
        );
        scheduleOnRN(tick);
      }
      gIndex.set(index);
      offset.set(withSpring(index, { damping: 18, stiffness: 240 }));
      scheduleOnRN(choose, index);
    },
  });

  const uniforms = useDerivedValue<Uniforms>(() => {
    const slots = [];
    for (let i = 0; i < MAX_ITEMS; i += 1) {
      if (i < count) {
        const g = itemGeometry(i, offset.value, held.value, centerY);
        slots.push([g.x, g.y, Math.max(g.r, 0.5)]);
      } else {
        slots.push(HIDDEN_CIRCLE);
      }
    }
    return {
      size: [CANVAS_W, height],
      c0: slots[0],
      c1: slots[1],
      c2: slots[2],
      c3: slots[3],
      c4: slots[4],
      c5: slots[5],
      smoothness: 24,
      alpha: 1,
      ...NO_RING,
    };
  });

  return (
    <View pointerEvents="box-none" style={[styles.root, { height }]}>
      {BLOB_EFFECT ? (
        <Canvas pointerEvents="none" style={[styles.canvas, { height }]}>
          <Fill>
            <Shader source={BLOB_EFFECT} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}

      {items.slice(0, count).map((item, index) => (
        <WheelIcon
          key={item.id}
          item={item}
          index={index}
          selected={index === selectedIndex}
          offset={offset}
          held={held}
          centerY={centerY}
        />
      ))}

      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Collection: ${items[selectedIndex]?.label ?? ''}`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            choose(Math.min(count - 1, Math.max(0, selectedIndex + step)));
          }}
          style={[styles.zone, { top: zoneTop }]}
        />
      </GestureDetector>
    </View>
  );
}

type WheelIconProps = {
  item: CategoryWheelItem;
  index: number;
  selected: boolean;
  offset: SharedValue<number>;
  held: SharedValue<number>;
  centerY: number;
};

const ICON_BOX = 120;

function WheelIcon({ item, index, selected, offset, held, centerY }: WheelIconProps) {
  const style = useAnimatedStyle(() => {
    const g = itemGeometry(index, offset.value, held.value, centerY);
    return {
      opacity: Math.max(0, Math.min(1, 2.6 - g.a)) * (0.6 + 0.4 * Math.max(0, 1 - g.a)),
      transform: [
        { translateX: g.x - ICON_BOX / 2 },
        { translateY: g.y - ICON_BOX / 2 },
        { scale: 0.85 + 0.25 * Math.max(0, 1 - g.a) + 0.08 * held.value },
      ],
    };
  });

  // The name of the bubble under focus pops out to the left while the wheel is
  // held, away from the thumb.
  const labelStyle = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(index - offset.value) * 1.8);
    const show = near * held.value;
    return {
      opacity: show,
      transform: [{ translateX: 10 * (1 - show) }, { scale: 0.9 + 0.1 * show }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.iconBox, style]}>
      <Animated.View style={[styles.labelWrap, labelStyle]}>
        <Animated.Text numberOfLines={1} style={styles.label}>
          {item.label}
        </Animated.Text>
      </Animated.View>
      <Ionicons
        name={item.icon}
        size={20}
        color={selected ? colors.textPrimary : colors.textSecondary}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: CANVAS_W,
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CANVAS_W,
  },
  zone: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CATEGORY_WHEEL_WIDTH + 16,
  },
  iconBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    right: ICON_BOX / 2 + R_CENTER + HOLD_GROW + 12,
  },
  label: {
    ...typography.navigationLabel,
    fontSize: 13,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(19, 18, 27, 0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
});
