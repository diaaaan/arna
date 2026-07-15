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
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  LIVING_LIGHT_MOTION_PRESET,
  livingLightMotionPresets,
  visual,
} from '../theme/tokens';

const SCREEN_SIZE = Dimensions.get('screen');
const RESOLUTION = vec(SCREEN_SIZE.width, SCREEN_SIZE.height);
const MOTION_PRESET =
  livingLightMotionPresets[LIVING_LIGHT_MOTION_PRESET];

const LIVING_LIGHT_SHADER_SOURCE = `
uniform float2 resolution;
uniform float phase;
uniform float2 center1Base;
uniform float2 center2Base;
uniform float2 center3Base;
uniform float2 driftAmplitude;
uniform float3 violet;
uniform float3 indigo;
uniform float3 cobalt;
uniform float3 cyan;
uniform float3 teal;
uniform float3 magenta;
uniform float3 coral;
uniform float3 softAmber;
uniform float3 mutedRose;
uniform float3 emerald;
uniform float intensity;
uniform float3 backgroundColor;
uniform float breathCycles;
uniform float2 breathIntensityRange;
uniform float2 breathSpreadRange;
uniform float2 breathWarpRange;
uniform float2 warpAmplitude;
uniform float2 breathCenterRange;
uniform float paletteStrength;
uniform float coolColorStrength;
uniform float warmColorStrength;
uniform float colorMorphAmount;
uniform float maxStrength;

float influence(float2 point, float2 center, float spread) {
  float2 delta = point - center;
  return exp(-dot(delta, delta) * spread);
}

float wave(float angle, float harmonic, float offset) {
  return 0.5 + 0.5 * sin(angle * harmonic + offset);
}

half4 main(float2 position) {
  float2 uv = position / resolution;
  float angle = phase * 6.28318530718;
  float breathAngle = angle * breathCycles;
  float breath = 0.5 - 0.5 * cos(breathAngle);
  float intensityBreath = 0.5 - 0.5 * cos(breathAngle + 0.28);
  float geometryBreath = breath;
  float warpBreath = 0.5 - 0.5 * cos(breathAngle - 0.24);
  float intensityScale = mix(
    breathIntensityRange.x,
    breathIntensityRange.y,
    intensityBreath
  );
  float spreadScale = mix(
    breathSpreadRange.x,
    breathSpreadRange.y,
    geometryBreath
  );
  float warpScale = mix(breathWarpRange.x, breathWarpRange.y, warpBreath);
  float centerScale = mix(
    breathCenterRange.x,
    breathCenterRange.y,
    geometryBreath
  );

  float2 warp = float2(
    sin((uv.y * 1.35 + uv.x * 0.22) * 6.28318530718 + angle),
    cos((uv.x * 1.15 - uv.y * 0.18) * 6.28318530718 - angle * 2.0)
  ) * warpAmplitude.x * warpScale;
  warp += float2(
    sin(uv.y * 3.14159265359 - angle * 2.0),
    cos(uv.x * 3.14159265359 + angle)
  ) * warpAmplitude.y * warpScale;

  float aspect = resolution.x / resolution.y;
  float2 fieldPoint = float2((uv.x + warp.x) * aspect, uv.y + warp.y);
  float2 compositionCenter = float2(0.5, 0.52);
  float2 center1 = center1Base + float2(
    (sin(angle + 0.18) * 0.7 + sin(angle * 3.0 + 1.12) * 0.3) *
      driftAmplitude.x,
    (cos(angle * 2.0 + 0.42) * 0.68 + sin(angle * 3.0 + 2.18) * 0.32) *
      driftAmplitude.y
  );
  float2 center2 = center2Base + float2(
    (cos(angle * 2.0 + 2.12) * 0.66 + sin(angle * 3.0 + 0.74) * 0.34) *
      driftAmplitude.x,
    (sin(angle * 3.0 + 1.38) * 0.64 + cos(angle + 2.46) * 0.36) *
      driftAmplitude.y
  );
  float2 center3 = center3Base + float2(
    (sin(angle * 3.0 + 4.06) * 0.62 + cos(angle * 2.0 + 1.68) * 0.38) *
      driftAmplitude.x,
    (cos(angle + 2.74) * 0.7 + sin(angle * 2.0 + 5.12) * 0.3) *
      driftAmplitude.y
  );
  float2 breathingCenter1 =
    compositionCenter + (center1 - compositionCenter) * centerScale;
  float2 breathingCenter2 =
    compositionCenter + (center2 - compositionCenter) * centerScale;
  float2 breathingCenter3 =
    compositionCenter + (center3 - compositionCenter) * centerScale;
  float2 fieldCenter1 = float2(breathingCenter1.x * aspect, breathingCenter1.y);
  float2 fieldCenter2 = float2(breathingCenter2.x * aspect, breathingCenter2.y);
  float2 fieldCenter3 = float2(breathingCenter3.x * aspect, breathingCenter3.y);

  float weight1 = influence(fieldPoint, fieldCenter1, 3.4 * spreadScale);
  float weight2 = influence(fieldPoint, fieldCenter2, 3.0 * spreadScale);
  float weight3 = influence(fieldPoint, fieldCenter3, 3.2 * spreadScale);
  float weightSum = max(weight1 + weight2 + weight3, 0.0001);

  float morph1 = wave(angle, 1.0, 0.34);
  float morph2 = wave(angle, 2.0, 1.42);
  float morph3 = wave(angle, 3.0, 2.38);
  float warmWave = wave(angle, 1.0, 4.12);
  float accentWave = wave(angle, 2.0, 5.04);

  float3 coldField1 = mix(violet, indigo, morph2 * coolColorStrength);
  coldField1 = mix(coldField1, cobalt, morph3 * 0.28);
  float3 warmField1 = mix(magenta, mutedRose, morph2);
  float3 dynamicColor1 = mix(
    coldField1,
    warmField1,
    warmColorStrength * (0.38 + 0.62 * morph1)
  );
  dynamicColor1 = mix(violet, dynamicColor1, colorMorphAmount);

  float3 dynamicColor2 = mix(cobalt, cyan, morph1 * coolColorStrength);
  dynamicColor2 = mix(dynamicColor2, teal, morph2 * 0.42);
  dynamicColor2 = mix(dynamicColor2, emerald, accentWave * 0.16);
  dynamicColor2 = mix(cobalt, dynamicColor2, colorMorphAmount);

  float3 coldField3 = mix(teal, emerald, morph3 * 0.48);
  coldField3 = mix(coldField3, cyan, morph1 * 0.2);
  float3 warmField3 = mix(coral, softAmber, accentWave);
  warmField3 = mix(warmField3, mutedRose, morph2 * 0.24);
  float3 dynamicColor3 = mix(
    coldField3,
    warmField3,
    warmColorStrength * (0.44 + 0.56 * warmWave)
  );
  dynamicColor3 = mix(teal, dynamicColor3, colorMorphAmount);

  float3 fieldColor =
    (dynamicColor1 * weight1 +
      dynamicColor2 * weight2 +
      dynamicColor3 * weight3) / weightSum;
  float presence = 1.0 - exp(-weightSum * 0.72);
  float strength = clamp(
    presence * intensity * intensityScale,
    0.0,
    maxStrength
  );
  float3 luminousColor =
    fieldColor * paletteStrength * (0.72 + 0.28 * min(weightSum, 1.0));
  float3 finalColor =
    1.0 - (1.0 - backgroundColor) * (1.0 - luminousColor * strength);

  return half4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

function compileLivingLightShader() {
  try {
    return Skia.RuntimeEffect.Make(LIVING_LIGHT_SHADER_SOURCE);
  } catch {
    return null;
  }
}

const LIVING_LIGHT_EFFECT = compileLivingLightShader();

export function AmbientBackground() {
  const phase = useSharedValue<number>(MOTION_PRESET.reducedMotionPhase);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(phase);

    if (reduceMotion) {
      phase.value = MOTION_PRESET.reducedMotionPhase;
      return;
    }

    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, {
        duration: MOTION_PRESET.cycleDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(phase);
    };
  }, [phase, reduceMotion]);

  const uniforms = useDerivedValue<Uniforms>(() => {
    return {
      resolution: RESOLUTION,
      phase: phase.value,
      center1Base: MOTION_PRESET.center1,
      center2Base: MOTION_PRESET.center2,
      center3Base: MOTION_PRESET.center3,
      driftAmplitude: MOTION_PRESET.driftAmplitude,
      violet: visual.livingLight.violet,
      indigo: visual.livingLight.indigo,
      cobalt: visual.livingLight.cobalt,
      cyan: visual.livingLight.cyan,
      teal: visual.livingLight.teal,
      magenta: visual.livingLight.magenta,
      coral: visual.livingLight.coral,
      softAmber: visual.livingLight.softAmber,
      mutedRose: visual.livingLight.mutedRose,
      emerald: visual.livingLight.emerald,
      intensity: MOTION_PRESET.baseIntensity,
      backgroundColor: visual.livingLight.background,
      breathCycles: MOTION_PRESET.breathCycles,
      breathIntensityRange: MOTION_PRESET.intensityRange,
      breathSpreadRange: MOTION_PRESET.spreadRange,
      breathWarpRange: MOTION_PRESET.warpRange,
      warpAmplitude: MOTION_PRESET.warpAmplitude,
      breathCenterRange: MOTION_PRESET.centerExpansionRange,
      paletteStrength: MOTION_PRESET.paletteStrength,
      coolColorStrength: MOTION_PRESET.coolColorStrength,
      warmColorStrength: MOTION_PRESET.warmColorStrength,
      colorMorphAmount: MOTION_PRESET.colorMorphAmount,
      maxStrength: MOTION_PRESET.maxStrength,
    };
  });

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Fill color={colors.background} />
      {LIVING_LIGHT_EFFECT ? (
        <Rect
          x={0}
          y={0}
          width={SCREEN_SIZE.width}
          height={SCREEN_SIZE.height}
        >
          <Shader
            source={LIVING_LIGHT_EFFECT}
            uniforms={uniforms as unknown as Uniforms}
          />
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
