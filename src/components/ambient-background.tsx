import { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  Rect,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import {
  colors,
  SMEAR_MODE_DEFAULT,
  smearModes,
  smearPreset,
  smearStyle,
  surfaceReaction,
  visual,
  type SmearModeName,
} from '../theme/tokens';
import { surfaceSignal } from '../theme/surface-signal';
import { SMEAR_SOURCE } from './living-surface-smear';

const SCREEN_SIZE = Dimensions.get('screen');
const RESOLUTION = vec(SCREEN_SIZE.width, SCREEN_SIZE.height);

function compileShader(source: string) {
  try {
    return Skia.RuntimeEffect.Make(source);
  } catch {
    return null;
  }
}

const SMEAR_EFFECT = compileShader(SMEAR_SOURCE);

type AmbientBackgroundProps = {
  mode?: SmearModeName;
};

export function AmbientBackground({
  mode = SMEAR_MODE_DEFAULT,
}: AmbientBackgroundProps) {
  const motionPhase = useSharedValue<number>(smearPreset.reducedMotionPhase);
  const slowPhase = useSharedValue<number>(0.2);
  const reduceMotion = useReducedMotion();

  // Phases advance frame by frame so the speed can change at any moment
  // without a jump. The shader only reads them through whole harmonics, so the
  // loop stays seamless.
  const motionDuration = smearPreset.motionDuration;
  const lavaDuration = smearPreset.lavaDuration;
  const focusSlowdown = surfaceReaction.focusSlowdown;
  const frameCallback = useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    const speed = 1 - focusSlowdown * surfaceSignal.focus.value;
    motionPhase.set((motionPhase.get() + (dt / motionDuration) * speed) % 1);
    slowPhase.set((slowPhase.get() + (dt / lavaDuration) * speed) % 1);
  }, false);

  useEffect(() => {
    if (reduceMotion) {
      frameCallback.setActive(false);
      motionPhase.set(smearPreset.reducedMotionPhase);
      slowPhase.set(0.2);
      return;
    }

    frameCallback.setActive(true);

    return () => {
      frameCallback.setActive(false);
    };
  }, [frameCallback, motionPhase, slowPhase, reduceMotion]);

  const active = smearStyle;
  const modeValue = (smearModes[mode] ?? smearModes[SMEAR_MODE_DEFAULT]).value;

  const uniforms = useDerivedValue<Uniforms>(() => ({
    resolution: RESOLUTION,
    motionPhase: motionPhase.value,
    backgroundColor: visual.livingSurface.background,
    s0: active.stops[0],
    s1: active.stops[1],
    s2: active.stops[2],
    s3: active.stops[3],
    s4: active.stops[4],
    s5: active.stops[5],
    s6: active.stops[6],
    s7: active.stops[7],
    noiseScale: smearPreset.noiseScale,
    warpStrength: smearPreset.warpStrength,
    orbitRadius: smearPreset.orbitRadius,
    grainAmount: active.grainAmount,
    glowAmount: active.glowAmount,
    cycleAmount: smearPreset.cycleAmount,
    textureAmount: active.textureAmount,
    tonePower: active.tonePower,
    mode: modeValue,
    slowPhase: slowPhase.value,
    focusDim: surfaceReaction.focusDim * surfaceSignal.focus.value,
  }));

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Fill color={colors.background} />
      {SMEAR_EFFECT ? (
        <Rect
          x={0}
          y={0}
          width={SCREEN_SIZE.width}
          height={SCREEN_SIZE.height}
        >
          <Shader source={SMEAR_EFFECT} uniforms={uniforms} />
        </Rect>
      ) : null}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_SIZE.width,
    height: SCREEN_SIZE.height,
  },
});
