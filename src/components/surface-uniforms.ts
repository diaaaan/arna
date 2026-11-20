import { Skia, vec } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

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
const sceneDim = surfaceReaction.sceneDim;

export function surfaceUniforms(): Uniforms {
  'worklet';
  return {
    resolution: RESOLUTION,
    motionPhase: surfaceSignal.motionPhase.value,
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
    mode: surfaceSignal.mode.value,
    slowPhase: surfaceSignal.slowPhase.value,
    // Typing and other sections both calm the surface; combine them.
    focusDim:
      1 -
      (1 - focusDim * surfaceSignal.focus.value) *
        (1 - sceneDim * surfaceSignal.scene.value),
  };
}
