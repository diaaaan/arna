import { Skia, vec } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

import { useDerivedValue } from 'react-native-reanimated';

import { surfaceSignal } from '../theme/surface-signal';
import { smearPreset, smearStyle, surfaceReaction, visual } from '../theme/tokens';
import { SMEAR_SOURCE } from './living-surface-smear';

// The Living Surface shader and its uniforms, shared by the background and by
// glass elements that refract it (the liquid orb).

export const SURFACE_SIZE = Dimensions.get('screen');

export const SURFACE_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(SMEAR_SOURCE);
  } catch {
    return null;
  }
})();

const RESOLUTION = vec(SURFACE_SIZE.width, SURFACE_SIZE.height);
const style = smearStyle;
const focusDim = surfaceReaction.focusDim;
const homeDim = surfaceReaction.homeDim;
const fieldPush = surfaceReaction.fieldPush;
const sceneDim = surfaceReaction.sceneDim;

export type SurfaceState = {
  rippleRect: [number, number, number, number];
  rippleRadius: number;
  rippleAmp: number;
  rippleTint: [number, number, number];
  rippleGlow: number;
  fieldRect: [number, number, number, number];
  fieldRadius: number;
  motionPhase: number;
  slowPhase: number;
  mode: number;
  focus: number;
  scene: number;
};

// Callers must read the shared values themselves (see useSurfaceUniforms) so
// that Reanimated sees them and recomputes every frame.
export function surfaceUniforms(state: SurfaceState): Uniforms {
  'worklet';
  return {
    resolution: RESOLUTION,
    motionPhase: state.motionPhase,
    backgroundColor: visual.livingSurface.background,
    s0: style.stops[0],
    s1: style.stops[1],
    s2: style.stops[2],
    s3: style.stops[3],
    s4: style.stops[4],
    s5: style.stops[5],
    s6: style.stops[6],
    s7: style.stops[7],
    noiseScale: smearPreset.noiseScale,
    warpStrength: smearPreset.warpStrength,
    orbitRadius: smearPreset.orbitRadius,
    grainAmount: style.grainAmount,
    glowAmount: style.glowAmount,
    cycleAmount: smearPreset.cycleAmount,
    textureAmount: style.textureAmount,
    tonePower: style.tonePower,
    mode: state.mode,
    rippleRect: state.rippleRect,
    rippleRadius: state.rippleRadius,
    rippleAmp: state.rippleAmp,
    rippleTint: state.rippleTint,
    rippleGlow: state.rippleGlow,
    fieldRect: state.fieldRect,
    fieldRadius: state.fieldRadius,
    // The surface flows around the field only on the capture screen.
    fieldPush: fieldPush * (1 - state.scene),
    slowPhase: state.slowPhase,
    // Typing and other sections both calm the surface; combine them.
    focusDim:
      1 -
      (1 - homeDim) *
        (1 - focusDim * state.focus) *
        (1 - sceneDim * state.scene),
  };
}

// Uniforms for the surface shader that follow the shared signals.
export function useSurfaceUniforms() {
  const {
    motionPhase,
    slowPhase,
    mode,
    focus,
    scene,
    rippleRect,
    rippleRadius,
    rippleAmp,
    rippleTint,
    rippleGlow,
    fieldRect,
    fieldRadius,
  } = surfaceSignal;
  return useDerivedValue<Uniforms>(() =>
    surfaceUniforms({
      motionPhase: motionPhase.value,
      slowPhase: slowPhase.value,
      mode: mode.value,
      focus: focus.value,
      scene: scene.value,
      rippleRect: rippleRect.value,
      rippleRadius: rippleRadius.value,
      rippleAmp: rippleAmp.value,
      rippleTint: rippleTint.value,
      rippleGlow: rippleGlow.value,
      fieldRect: fieldRect.value,
      fieldRadius: fieldRadius.value,
    }),
  );
}
