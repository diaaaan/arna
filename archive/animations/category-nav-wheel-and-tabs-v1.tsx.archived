import { Ionicons } from '@expo/vector-icons';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '../../theme/tokens';

// Two experiments for switching collections vertically (refs in
// Kcell/Claude/Arna/refs, notes in docs/motion-refs.md):
// - 'wheel': icons on an arc at the right edge, scrolled like a dial;
// - 'tabs': a liquid rail growing out of the right edge, with a bulge that
//   slides to the selected tab.

export type CategoryNavVariant = 'wheel' | 'tabs';

export type CategoryNavItem = {
  id: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

type CategoryNavProps = {
  variant: CategoryNavVariant;
  items: readonly CategoryNavItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  // Height available for the control.
  height: number;
};

// Width the content should leave free on the right.
export const CATEGORY_NAV_WIDTH = { wheel: 76, tabs: 72 } as const;

export function CategoryNav(props: CategoryNavProps) {
  return props.variant === 'wheel' ? (
    <CategoryWheel {...props} />
  ) : (
    <CategoryTabs {...props} />
  );
}

function tick() {
  void Haptics.selectionAsync().catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Wheel

const WHEEL_ITEM = 60;
const WHEEL_W = CATEGORY_NAV_WIDTH.wheel;
const WHEEL_ARC_R = 320;
const WHEEL_ICON = 44;

function CategoryWheel({ items, selectedId, onSelect, height }: CategoryNavProps) {
  const viewH = Math.min(height, WHEEL_ITEM * 7);
  const pad = (viewH - WHEEL_ITEM) / 2;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const lastIndex = useSharedValue(-1);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const userScrolling = useRef(false);

  const selectIndex = (index: number) => {
    const item = items[index];
    if (item && item.id !== selectedId) {
      tick();
      onSelect(item.id);
    }
  };

  // Keep the wheel on the selected item when the selection comes from elsewhere.
  useEffect(() => {
    if (!userScrolling.current) {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM, animated: true });
    }
  }, [scrollRef, selectedIndex]);

  const count = items.length;
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
      const index = Math.min(
        count - 1,
        Math.max(0, Math.round(event.contentOffset.y / WHEEL_ITEM)),
      );
      if (index !== lastIndex.value) {
        lastIndex.set(index);
        scheduleOnRN(selectIndex, index);
      }
    },
  });

  return (
    <View style={[styles.wheel, { height: viewH }]}>
      {/* The arc the icons ride on, with a marker at the selected position. */}
      <View
        pointerEvents="none"
        style={[
          styles.wheelArc,
          {
            top: viewH / 2 - WHEEL_ARC_R,
            left: WHEEL_W / 2 + WHEEL_ICON / 2 + 6,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.wheelMarker, { top: viewH / 2 - 7, left: WHEEL_W / 2 + WHEEL_ICON / 2 + 3 }]}
      />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          userScrolling.current = true;
        }}
        onMomentumScrollEnd={() => {
          userScrolling.current = false;
        }}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {items.map((item, index) => (
          <WheelItem
            key={item.id}
            item={item}
            index={index}
            selected={index === selectedIndex}
            scrollY={scrollY}
            onPress={() => {
              scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM, animated: true });
            }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

type WheelItemProps = {
  item: CategoryNavItem;
  index: number;
  selected: boolean;
  scrollY: SharedValue<number>;
  onPress: () => void;
};

function WheelItem({ item, index, selected, scrollY, onPress }: WheelItemProps) {
  const style = useAnimatedStyle(() => {
    const dy = index * WHEEL_ITEM - scrollY.value;
    const d = Math.min(Math.abs(dy), WHEEL_ARC_R * 0.9);
    const dx = WHEEL_ARC_R - Math.sqrt(WHEEL_ARC_R * WHEEL_ARC_R - d * d);
    const t = Math.min(Math.abs(dy) / WHEEL_ITEM, 3);
    return {
      opacity: 1 - t * 0.26,
      transform: [{ translateX: dx }, { scale: 1 - Math.min(t, 2) * 0.1 }],
    };
  });

  return (
    <Animated.View style={[styles.wheelItem, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[styles.wheelIcon, selected && styles.wheelIconSelected]}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={selected ? colors.background : colors.textPrimary}
        />
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Liquid tabs

const TAB_ITEM = 56;
const TAB_RAIL_W = 58;
const TAB_PAD = 10;
const TAB_FILLET = 34;
const TAB_BULGE_R = 19;
const TAB_CANVAS_W = TAB_RAIL_W + 40;

// A rail glued to the right edge of the screen. The rail, the screen edge and
// a bulge at the selected tab are merged with a smooth minimum, so the shape
// flows out of the edge like the reference's liquid side panel.
const RAIL_SOURCE = `
uniform float2 size;
uniform float railW;
uniform float railTop;
uniform float railBottom;
uniform float bulgeY;
uniform float bulgeR;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdBox(float2 p, float2 c, float2 h, float r) {
  float2 q = abs(p - c) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 p) {
  float w = size.x;
  float halfH = (railBottom - railTop) * 0.5;
  float rail = sdBox(p, float2(w - railW * 0.5 + 24.0, railTop + halfH),
                     float2(railW * 0.5 + 24.0, halfH), railW * 0.5);
  float edge = (w - 1.5) - p.x;
  float d = smin(rail, edge, 26.0);
  float bulge = length(p - float2(w - railW - 3.0, bulgeY)) - bulgeR;
  d = smin(d, bulge, 16.0);

  float inside = 1.0 - smoothstep(-0.8, 0.8, d);
  float rim = 1.0 - smoothstep(0.0, 1.3, abs(d + 0.8));
  float3 body = float3(0.047, 0.043, 0.071);
  float a = inside * 0.94;
  float3 col = body * a + float3(1.0) * rim * 0.14 * inside;
  return half4(col, clamp(a + rim * 0.14, 0.0, 1.0));
}
`;

const RAIL_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(RAIL_SOURCE);
  } catch {
    return null;
  }
})();

function CategoryTabs({ items, selectedId, onSelect, height }: CategoryNavProps) {
  const railTop = TAB_FILLET;
  const railH = TAB_PAD * 2 + TAB_ITEM * items.length;
  const canvasH = railH + TAB_FILLET * 2;
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const itemY = (index: number) => railTop + TAB_PAD + TAB_ITEM * (index + 0.5);
  const bulgeY = useSharedValue(itemY(selectedIndex));
  const targetY = itemY(selectedIndex);

  useEffect(() => {
    bulgeY.set(withSpring(targetY, { damping: 16, stiffness: 170, mass: 0.9 }));
  }, [bulgeY, targetY]);

  const uniforms = useDerivedValue<Uniforms>(() => ({
    size: [TAB_CANVAS_W, canvasH],
    railW: TAB_RAIL_W,
    railTop,
    railBottom: railTop + railH,
    bulgeY: bulgeY.value,
    bulgeR: TAB_BULGE_R,
  }));

  return (
    <View
      style={[
        styles.tabs,
        { height: canvasH, top: Math.max(0, (height - canvasH) / 2) },
      ]}
    >
      {RAIL_EFFECT ? (
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={RAIL_EFFECT} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
      {items.map((item, index) => (
        <TabItem
          key={item.id}
          item={item}
          y={itemY(index)}
          selected={index === selectedIndex}
          onPress={() => {
            if (item.id !== selectedId) {
              tick();
              onSelect(item.id);
            }
          }}
        />
      ))}
    </View>
  );
}

type TabItemProps = {
  item: CategoryNavItem;
  y: number;
  selected: boolean;
  onPress: () => void;
};

function TabItem({ item, y, selected, onPress }: TabItemProps) {
  const shift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    shift.set(withSpring(selected ? 1 : 0, { damping: 16, stiffness: 200 }));
  }, [selected, shift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -12 * shift.value }, { scale: 1 + 0.1 * shift.value }],
    opacity: 0.6 + 0.4 * shift.value,
  }));

  return (
    <Animated.View
      style={[
        styles.tabItem,
        { top: y - TAB_ITEM / 2, left: TAB_CANVAS_W - TAB_RAIL_W },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.tabPressable}
      >
        <Ionicons
          name={item.icon}
          size={22}
          color={selected ? colors.textPrimary : colors.textSecondary}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    position: 'absolute',
    right: 0,
    width: WHEEL_W,
    overflow: 'hidden',
  },
  wheelArc: {
    position: 'absolute',
    width: WHEEL_ARC_R * 2,
    height: WHEEL_ARC_R * 2,
    borderRadius: WHEEL_ARC_R,
    borderWidth: 1,
    borderColor: 'rgba(220, 219, 232, 0.16)',
  },
  wheelMarker: {
    position: 'absolute',
    width: 6,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#C9B8FF',
  },
  wheelItem: {
    height: WHEEL_ITEM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelIcon: {
    width: WHEEL_ICON,
    height: WHEEL_ICON,
    borderRadius: WHEEL_ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  wheelIconSelected: {
    backgroundColor: '#C9B8FF',
    borderColor: '#C9B8FF',
    shadowColor: '#8A63FF',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  tabs: {
    position: 'absolute',
    right: 0,
    width: TAB_CANVAS_W,
  },
  tabItem: {
    position: 'absolute',
    width: TAB_RAIL_W,
    height: TAB_ITEM,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
