import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Blur, Canvas, Fill, Rect, Shader } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
} from 'react-native-reanimated';

import { colors, smearPreset, surfaceReaction } from '../theme/tokens';
import { surfaceSignal } from '../theme/surface-signal';
import { SURFACE_EFFECT, SURFACE_SIZE, useSurfaceUniforms } from './surface-uniforms';

export function AmbientBackground() {
  const reduceMotion = useReducedMotion();
  const { motionPhase, slowPhase, focus, scene } = surfaceSignal;

  // Phases advance frame by frame so the speed can change at any moment
  // without a jump. The shader only reads them through whole harmonics, so the
  // loop stays seamless.
  const motionDuration = smearPreset.motionDuration;
  const lavaDuration = smearPreset.lavaDuration;
  const focusSlowdown = surfaceReaction.focusSlowdown;
  const frameCallback = useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    // Other sections freeze the surface; it only lives on the capture screen.
    const speed =
      (1 - focusSlowdown * focus.value) * (1 - scene.value);
    if (speed < 0.002) {
      return;
    }
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

  const sceneBlur = surfaceReaction.sceneBlur;
  const blur = useDerivedValue(() => sceneBlur * scene.value);
  const uniforms = useSurfaceUniforms();

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Fill color={colors.background} />
      {SURFACE_EFFECT ? (
        <Rect x={0} y={0} width={SURFACE_SIZE.width} height={SURFACE_SIZE.height}>
          <Shader source={SURFACE_EFFECT} uniforms={uniforms} />
          <Blur blur={blur} mode="clamp" />
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
    width: SURFACE_SIZE.width,
    height: SURFACE_SIZE.height,
  },
});
