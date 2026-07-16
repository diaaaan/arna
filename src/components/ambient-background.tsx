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
  LIVING_SURFACE_PRESET,
  livingSurfacePresets,
  visual,
} from '../theme/tokens';

const SCREEN_SIZE = Dimensions.get('screen');
const RESOLUTION = vec(SCREEN_SIZE.width, SCREEN_SIZE.height);
const ACTIVE_PRESET = livingSurfacePresets[LIVING_SURFACE_PRESET];
const ORIGIN_ROTATIONS = ACTIVE_PRESET.originAngles.map(
  (angle) => [Math.cos(angle), Math.sin(angle)] as const,
);

function smoothstepValue(edge0: number, edge1: number, value: number) {
  'worklet';

  const progress = Math.min(
    Math.max((value - edge0) / (edge1 - edge0), 0),
    1,
  );
  return progress * progress * (3 - 2 * progress);
}

const LIVING_SURFACE_SHADER_SOURCE = `
uniform float2 resolution;
uniform float motionPhase;
uniform float compositionPhase;
uniform float3 backgroundColor;
uniform float3 deepNavy;
uniform float3 indigo;
uniform float3 cobalt;
uniform float3 violet;
uniform float3 cyan;
uniform float3 teal;
uniform float3 lavender;
uniform float3 paleCyan;
uniform float3 lavenderWhite;
uniform float3 neutralWhite;
uniform float3 paleYellow;
uniform float3 neonYellowGreen;
uniform float3 mutedPeach;
uniform float3 coral;
uniform float3 rose;
uniform float2 verticalActivityZone;
uniform float verticalMaskSoftness;
uniform float2 mainShapePosition;
uniform float2 mainShapeScale;
uniform float2 mainShapeAnisotropy;
uniform float jellyExpansion;
uniform float edgeLag;
uniform float2 compositionDrift;
uniform float rippleStrength;
uniform float rippleSpeed;
uniform float rippleAnisotropy;
uniform float2 rippleStretch;
uniform float angularDistortionStrength;
uniform float directionalBend;
uniform float frontWidthVariation;
uniform float visibilityVariation;
uniform float bandSeparation;
uniform float secondaryBandDeformation;
uniform float foldAlignmentStrength;
uniform float2 rippleEvolution;
uniform float2 originEvolutionA;
uniform float2 originEvolutionB;
uniform float2 originEvolutionC;
uniform float originCount;
uniform float2 originPositionA;
uniform float2 originPositionB;
uniform float2 originPositionC;
uniform float originStrengthA;
uniform float originStrengthB;
uniform float originStrengthC;
uniform float2 originStretchA;
uniform float2 originStretchB;
uniform float2 originStretchC;
uniform float2 originRotationA;
uniform float2 originRotationB;
uniform float2 originRotationC;
uniform float unionSoftness;
uniform float distributedVisibilityVariation;
uniform float waveCount;
uniform float2 waveDirectionA;
uniform float2 waveDirectionB;
uniform float2 waveDirectionC;
uniform float wavePhaseOffsetA;
uniform float wavePhaseOffsetB;
uniform float wavePhaseOffsetC;
uniform float waveLengthA;
uniform float waveLengthB;
uniform float waveLengthC;
uniform float waveWidthA;
uniform float waveWidthB;
uniform float waveWidthC;
uniform float waveBendA;
uniform float waveBendB;
uniform float waveBendC;
uniform float waveCurvatureA;
uniform float waveCurvatureB;
uniform float waveCurvatureC;
uniform float waveVisibilityA;
uniform float waveVisibilityB;
uniform float waveVisibilityC;
uniform float waveWidthVariation;
uniform float waveFamilyStrengthA;
uniform float waveFamilyStrengthB;
uniform float waveFamilyStrengthC;
uniform float originPhaseInfluence;
uniform float originVisibilityInfluence;
uniform float petalGeometrySuppression;
uniform float waveContinuityStrength;
uniform float waveEvolutionA;
uniform float waveEvolutionB;
uniform float waveEvolutionC;
uniform float2 waveEntryPointA;
uniform float2 waveEntryPointB;
uniform float2 waveEntryPointC;
uniform float2 waveExitDirectionA;
uniform float2 waveExitDirectionB;
uniform float2 waveExitDirectionC;
uniform float3 waveLifecycleA;
uniform float3 waveLifecycleB;
uniform float3 waveLifecycleC;
uniform float waveTranslationA;
uniform float waveTranslationB;
uniform float waveTranslationC;
uniform float waveDecayWidthA;
uniform float waveDecayWidthB;
uniform float waveDecayWidthC;
uniform float waveCompetitionStrength;
uniform float anchorSuppression;
uniform float primarySurfaceStrength;
uniform float secondaryDeformationStrengthA;
uniform float secondaryDeformationStrengthB;
uniform float secondaryDeformationStrengthC;
uniform float familyDominanceSharpness;
uniform float zeroContourSeparationA;
uniform float zeroContourSeparationB;
uniform float zeroContourSeparationC;
uniform float bendReferenceA;
uniform float bendReferenceB;
uniform float bendReferenceC;
uniform float baselineOffsetA;
uniform float baselineOffsetB;
uniform float baselineOffsetC;
uniform float flowCurlStrength;
uniform float minimumFoldWidth;
uniform float tipSoftness;
uniform float tipContrastAttenuation;
uniform float curvatureClamp;
uniform float pinchRadius;
uniform float singularitySuppression;
uniform float darkFoldContinuity;
uniform float dominantFamilyTransitionSoftness;
uniform float foldStrength;
uniform float2 foldSoftness;
uniform float curvatureSampleOffset;
uniform float curvatureStrength;
uniform float surfaceFlowStrength;
uniform float baseBodyLuminance;
uniform float midtoneStrength;
uniform float highlightStrength;
uniform float ridgeWidth;
uniform float ridgeCoreWidth;
uniform float rimStrength;
uniform float rimBreakup;
uniform float rippleBandStrength;
uniform float2 contourSoftness;
uniform float2 lightDirection;
uniform float cyanHighlightStrength;
uniform float whiteHighlightStrength;
uniform float yellowAccentStrength;
uniform float accentAreaLimit;
uniform float surfaceSaturation;
uniform float warmAccentStrength;
uniform float lowerScreenAttenuation;

float wave(float angle, float harmonic, float offset) {
  return 0.5 + 0.5 * sin(angle * harmonic + offset);
}

float verticalActivity(float y) {
  float upperRise = smoothstep(
    verticalActivityZone.x - verticalMaskSoftness,
    verticalActivityZone.x + verticalMaskSoftness,
    y
  );
  float lowerFall = 1.0 - smoothstep(
    verticalActivityZone.y - verticalMaskSoftness,
    verticalActivityZone.y + verticalMaskSoftness,
    y
  );
  return clamp(upperRise * lowerFall, 0.0, 1.0);
}

float materialField(float2 point) {
  float carrier = sin(point.y + sin(point.x) * 0.54);
  float diagonal = cos(point.x + point.y + sin(point.y) * 0.32);
  return carrier * 0.72 + diagonal * 0.28;
}

float3 surfacePalette(float value, float mood) {
  float3 shadowColor = mix(deepNavy, indigo, 0.58 + mood * 0.16);
  float3 bodyColor = mix(cobalt, violet, 0.22 + mood * 0.18);
  bodyColor = mix(bodyColor, lavender, mood * 0.12);
  float3 highlightColor = mix(cyan, teal, 0.18 + mood * 0.2);
  float3 color = mix(
    shadowColor,
    bodyColor,
    smoothstep(0.16, 0.62, value)
  );
  return mix(color, highlightColor, smoothstep(0.62, 0.96, value));
}

struct SurfaceState {
  float surfaceDistance;
  float organicDistance;
  float primaryWave;
  float secondaryWave;
  float waveWidth;
  float waveActivity;
  float dominanceConfidence;
  float2 organicPoint;
};

float2 rotatePoint(float2 point, float2 rotation) {
  return float2(
    point.x * rotation.x + point.y * rotation.y,
    -point.x * rotation.y + point.y * rotation.x
  );
}

float3 originControlField(float2 uv) {
  float enabledStrengthA = originStrengthA * step(0.5, originCount);
  float enabledStrengthB = originStrengthB * step(1.5, originCount);
  float enabledStrengthC = originStrengthC * step(2.5, originCount);
  float2 pointA = rotatePoint(
    (uv - originPositionA) / mainShapeScale,
    originRotationA
  ) * originStretchA;
  float2 pointB = rotatePoint(
    (uv - originPositionB) / mainShapeScale,
    originRotationB
  ) * originStretchB;
  float2 pointC = rotatePoint(
    (uv - originPositionC) / mainShapeScale,
    originRotationC
  ) * originStretchC;
  float weightA = enabledStrengthA /
    (unionSoftness + dot(pointA, pointA));
  float weightB = enabledStrengthB /
    (unionSoftness + dot(pointB, pointB));
  float weightC = enabledStrengthC /
    (unionSoftness + dot(pointC, pointC));
  float totalWeight = max(weightA + weightB + weightC, 0.001);
  float3 normalizedWeight = float3(weightA, weightB, weightC) /
    totalWeight;
  float phaseControl = dot(
    normalizedWeight,
    float3(originEvolutionA.x, originEvolutionB.x, originEvolutionC.x)
  ) * originPhaseInfluence;
  float visibilityControl = dot(
    normalizedWeight,
    float3(originEvolutionA.y, originEvolutionB.y, originEvolutionC.y)
  ) * originVisibilityInfluence;
  float widthControl = dot(
    normalizedWeight,
    float3(
      originStretchA.x - originStretchA.y,
      originStretchB.x - originStretchB.y,
      originStretchC.x - originStretchC.y
    )
  );
  return float3(phaseControl, visibilityControl, widthControl);
}

float4 waveFamilyState(
  float2 point,
  float2 direction,
  float2 entryPoint,
  float2 exitDirection,
  float phaseOffset,
  float wavelength,
  float width,
  float bendStrength,
  float curvature,
  float visibility,
  float familyStrength,
  float evolution,
  float3 lifecycle,
  float translationAmount,
  float bendReference,
  float baselineOffset,
  float zeroContourOffset,
  float decayWidth,
  float3 originControl,
  float motionAngle
) {
  float2 movingAnchor = entryPoint +
    exitDirection * translationAmount * lifecycle.y;
  float2 relativePoint = point - movingAnchor;
  float2 normal = float2(-direction.y, direction.x);
  float along = dot(relativePoint, direction);
  float across = dot(relativePoint, normal);
  float evolvedAlong = along - bendReference + evolution * 0.16;
  float broadBend = bendStrength * curvature *
    (evolvedAlong * evolvedAlong - 0.34);
  float phaseResponse = clamp(
    dot(direction, exitDirection),
    -1.0,
    1.0
  );
  float familyPhaseControl = originControl.x * mix(
    1.0,
    phaseResponse,
    anchorSuppression
  );
  float waveCoordinate = across - broadBend +
    familyPhaseControl + baselineOffset;
  float localWidth = clamp(
    width * (
      1.0 + waveWidthVariation *
        (originControl.z * 0.42 + along * 0.12)
    ) * (1.0 + decayWidth * lifecycle.z),
    width * 0.74,
    width * (1.3 + decayWidth)
  );
  float primaryArgument =
    waveCoordinate * 6.28318530718 / wavelength -
    motionAngle * rippleSpeed +
    phaseOffset +
    zeroContourOffset;
  float patchExtent = max(translationAmount, minimumFoldWidth);
  float patchEnvelope = 1.0 - smoothstep(
    patchExtent - tipSoftness,
    patchExtent + tipSoftness,
    abs(along - bendReference)
  );
  float localVisibility = visibility * mix(
    1.0 + originControl.y * (0.62 + evolution * 0.38),
    1.0,
    waveContinuityStrength * 0.72
  );
  float familyWeight = familyStrength * localVisibility *
    lifecycle.x * patchEnvelope;
  return float4(
    primaryArgument,
    familyWeight,
    localWidth,
    patchEnvelope
  );
}

SurfaceState surfaceState(
  float2 uv,
  float motionAngle,
  float compositionAngle,
  float activityLevel,
  float2 rippleEvolution,
  float includeSecondary
) {
  float2 shapeCenter = mainShapePosition + float2(
    sin(compositionAngle) * compositionDrift.x,
    cos(compositionAngle) * compositionDrift.y
  );
  float2 shapePoint = (uv - shapeCenter) / mainShapeScale;
  float edgeAmount = smoothstep(0.08, 0.96, abs(shapePoint.x));
  float centerMotion = sin(motionAngle) +
    sin(motionAngle * 2.0 - 0.48) * 0.18;
  float edgeMotion = sin(motionAngle - edgeAmount * edgeLag) +
    sin(motionAngle * 2.0 - edgeAmount * edgeLag - 0.48) * 0.18;
  float expansion = mix(centerMotion, edgeMotion, edgeAmount) *
    jellyExpansion * activityLevel;
  shapePoint.y += sin(motionAngle - edgeAmount * edgeLag * 0.62) *
    jellyExpansion * 0.18;
  shapePoint.x += shapePoint.y * sin(compositionAngle) *
    jellyExpansion * 0.16;

  float2 anisotropicPoint = shapePoint * mainShapeAnisotropy;
  float2 ripplePoint = anisotropicPoint * rippleStretch;
  ripplePoint.x += ripplePoint.y * rippleAnisotropy;
  float rippleDistance = length(ripplePoint);
  float safeRippleDistance = max(rippleDistance, 0.001);
  float2 rippleDirection = ripplePoint / safeRippleDistance;
  float angularPattern =
    (rippleDirection.x * rippleDirection.x -
      rippleDirection.y * rippleDirection.y) *
      (0.78 + rippleEvolution.y) +
    rippleDirection.x * rippleDirection.y * 2.0 *
      (0.22 + rippleEvolution.x);
  float legacyPetalDeformation =
    angularPattern * angularDistortionStrength +
    ripplePoint.x * ripplePoint.y * directionalBend;
  float organicDistance = rippleDistance +
    legacyPetalDeformation * (1.0 - petalGeometrySuppression);

  float3 originControl = originControlField(uv);
  float2 flowOffset = float2(
    sin(ripplePoint.y + compositionAngle),
    -sin(ripplePoint.x - compositionAngle)
  ) * flowCurlStrength;
  float2 flowPoint = ripplePoint + flowOffset;
  float4 familyA = waveFamilyState(
    flowPoint,
    waveDirectionA,
    waveEntryPointA,
    waveExitDirectionA,
    wavePhaseOffsetA,
    waveLengthA,
    waveWidthA,
    waveBendA,
    waveCurvatureA,
    waveVisibilityA,
    waveFamilyStrengthA * step(0.5, waveCount),
    waveEvolutionA,
    waveLifecycleA,
    waveTranslationA,
    bendReferenceA,
    baselineOffsetA,
    zeroContourSeparationA,
    waveDecayWidthA,
    originControl,
    motionAngle
  );
  float4 familyB = waveFamilyState(
    flowPoint,
    waveDirectionB,
    waveEntryPointB,
    waveExitDirectionB,
    wavePhaseOffsetB,
    waveLengthB,
    waveWidthB,
    waveBendB,
    waveCurvatureB,
    waveVisibilityB,
    waveFamilyStrengthB * step(1.5, waveCount),
    waveEvolutionB,
    waveLifecycleB,
    waveTranslationB,
    bendReferenceB,
    baselineOffsetB,
    zeroContourSeparationB,
    waveDecayWidthB,
    originControl,
    motionAngle
  );
  float4 familyC = waveFamilyState(
    flowPoint,
    waveDirectionC,
    waveEntryPointC,
    waveExitDirectionC,
    wavePhaseOffsetC,
    waveLengthC,
    waveWidthC,
    waveBendC,
    waveCurvatureC,
    waveVisibilityC,
    waveFamilyStrengthC * step(2.5, waveCount),
    waveEvolutionC,
    waveLifecycleC,
    waveTranslationC,
    bendReferenceC,
    baselineOffsetC,
    zeroContourSeparationC,
    waveDecayWidthC,
    originControl,
    motionAngle
  );
  float sharpnessMix = clamp(familyDominanceSharpness - 1.0, 0.0, 1.0);
  float dominanceWeightA = mix(
    familyA.y,
    familyA.y * familyA.y,
    sharpnessMix
  );
  float dominanceWeightB = mix(
    familyB.y,
    familyB.y * familyB.y,
    sharpnessMix
  );
  float dominanceWeightC = mix(
    familyC.y,
    familyC.y * familyC.y,
    sharpnessMix
  );
  float competitiveWeightA = dominanceWeightA / (
    1.0 + waveCompetitionStrength *
      (dominanceWeightB + dominanceWeightC)
  );
  float competitiveWeightB = dominanceWeightB / (
    1.0 + waveCompetitionStrength *
      (dominanceWeightA + dominanceWeightC)
  );
  float competitiveWeightC = dominanceWeightC / (
    1.0 + waveCompetitionStrength *
      (dominanceWeightA + dominanceWeightB)
  );
  float competitiveWeight =
    competitiveWeightA + competitiveWeightB + competitiveWeightC;
  float dominantArgument = familyA.x;
  float dominantWeight = competitiveWeightA;
  float dominantRawWeight = familyA.y;
  float dominantWidth = familyA.z;
  float dominantIndex = 0.0;
  if (competitiveWeightB > dominantWeight) {
    dominantArgument = familyB.x;
    dominantWeight = competitiveWeightB;
    dominantRawWeight = familyB.y;
    dominantWidth = familyB.z;
    dominantIndex = 1.0;
  }
  if (competitiveWeightC > dominantWeight) {
    dominantArgument = familyC.x;
    dominantWeight = competitiveWeightC;
    dominantRawWeight = familyC.y;
    dominantWidth = familyC.z;
    dominantIndex = 2.0;
  }
  float dominanceConfidence = dominantWeight /
    max(competitiveWeight, 0.001);
  float dominanceTransition = smoothstep(
    0.33333333333,
    0.33333333333 +
      dominantFamilyTransitionSoftness * waveCount,
    dominanceConfidence
  );
  float dominantActivity = clamp(
    dominantRawWeight / max(waveFamilyStrengthA, 0.001),
    0.0,
    1.0
  );
  dominantActivity *= mix(
    1.0,
    dominanceTransition,
    singularitySuppression
  );

  float maskA = 1.0 - step(0.5, abs(dominantIndex));
  float maskB = 1.0 - step(0.5, abs(dominantIndex - 1.0));
  float maskC = 1.0 - step(0.5, abs(dominantIndex - 2.0));
  float waveA = sin(familyA.x);
  float waveB = sin(familyB.x);
  float waveC = sin(familyC.x);
  float secondaryPhaseDeformation = (
    waveA * competitiveWeightA *
      secondaryDeformationStrengthA * (1.0 - maskA) +
    waveB * competitiveWeightB *
      secondaryDeformationStrengthB * (1.0 - maskB) +
    waveC * competitiveWeightC *
      secondaryDeformationStrengthC * (1.0 - maskC)
  ) / max(waveFamilyStrengthA, 0.001);
  float deformedPrimaryArgument = dominantArgument +
    secondaryPhaseDeformation;
  float distributedPrimary = sin(deformedPrimaryArgument) *
    dominantActivity * primarySurfaceStrength;
  float distributedSecondary = 0.0;
  if (includeSecondary > 0.5) {
    distributedSecondary = sin(
      deformedPrimaryArgument +
      bandSeparation +
      secondaryPhaseDeformation * secondaryBandDeformation
    ) * dominantActivity;
  }
  float secondaryWidthRelief = (
    familyA.z * competitiveWeightA *
      secondaryDeformationStrengthA * (1.0 - maskA) +
    familyB.z * competitiveWeightB *
      secondaryDeformationStrengthB * (1.0 - maskB) +
    familyC.z * competitiveWeightC *
      secondaryDeformationStrengthC * (1.0 - maskC)
  ) / max(waveFamilyStrengthA, 0.001);
  float distributedWidth = dominantWidth + secondaryWidthRelief;
  float waveActivity = dominantActivity;

  float ripple = distributedPrimary * rippleStrength * activityLevel;
  float surfaceDistance = organicDistance - (1.0 + expansion) + ripple;
  SurfaceState state;
  state.surfaceDistance = surfaceDistance;
  state.organicDistance = organicDistance;
  state.primaryWave = distributedPrimary;
  state.secondaryWave = distributedSecondary;
  state.waveWidth = distributedWidth;
  state.waveActivity = waveActivity;
  state.dominanceConfidence = dominanceConfidence;
  state.organicPoint = ripplePoint;
  return state;
}

half4 main(float2 position) {
  float2 uv = position / resolution;
  float motionAngle = motionPhase * 6.28318530718;
  float compositionAngle = compositionPhase * 6.28318530718;
  float activity = verticalActivity(uv.y);
  float activityLevel = mix(lowerScreenAttenuation, 1.0, activity);
  SurfaceState state = surfaceState(
    uv,
    motionAngle,
    compositionAngle,
    activityLevel,
    rippleEvolution,
    1.0
  );
  float surfaceDistance = state.surfaceDistance;
  float organicDistance = state.organicDistance;
  float2 organicPoint = state.organicPoint;
  float rippleWave = state.primaryWave;
  float ripple = rippleWave * rippleStrength * activityLevel;
  float expansion =
    organicDistance + ripple - 1.0 - surfaceDistance;

  float surfaceBody = 1.0 - smoothstep(-0.54, 0.72, surfaceDistance);
  float primaryArc = 1.0 - smoothstep(
    foldSoftness.x,
    foldSoftness.y,
    abs(surfaceDistance)
  );
  float2 curvatureOffset = lightDirection * curvatureSampleOffset;
  float forwardDistance = surfaceState(
    uv + curvatureOffset,
    motionAngle,
    compositionAngle,
    activityLevel,
    rippleEvolution,
    0.0
  ).surfaceDistance;
  float backwardDistance = surfaceState(
    uv - curvatureOffset,
    motionAngle,
    compositionAngle,
    activityLevel,
    rippleEvolution,
    0.0
  ).surfaceDistance;
  float curvatureDelta = abs(
    forwardDistance + backwardDistance - surfaceDistance * 2.0
  );
  float curvature = clamp(
    curvatureDelta /
      max(curvatureSampleOffset * curvatureSampleOffset, 0.000001) *
      curvatureStrength,
    0.0,
    curvatureClamp
  );
  float dominanceRisk = 1.0 - smoothstep(
    0.33333333333,
    0.33333333333 + pinchRadius,
    state.dominanceConfidence
  );
  float curvatureRisk = smoothstep(
    max(curvatureClamp - tipSoftness, 0.001),
    curvatureClamp,
    curvature
  );
  float tipRisk = dominanceRisk * curvatureRisk;
  float tipSafety = 1.0 - tipRisk * tipContrastAttenuation;

  float safeDistance = max(organicDistance, 0.001);
  float2 surfaceNormal = organicPoint / safeDistance;
  float2 surfaceTangent = float2(-surfaceNormal.y, surfaceNormal.x);
  float aspect = resolution.x / resolution.y;
  float2 materialPoint = float2(
    (uv.x - 0.5) * aspect,
    uv.y - 0.5
  ) * 6.28318530718;
  materialPoint += compositionAngle * float2(-1.0, 1.0);
  materialPoint += surfaceNormal *
    (ripple + expansion * 0.22) * surfaceFlowStrength;
  materialPoint += surfaceTangent *
    primaryArc * foldStrength * surfaceFlowStrength * 0.34;
  float material = materialField(materialPoint);

  float localDirection = dot(surfaceNormal, lightDirection);
  float widthFactor = clamp(
    1.0 + frontWidthVariation * (
      material * 0.48 +
      localDirection * 0.24 +
      (curvature - 0.5) * 0.28
    ),
    0.68,
    1.34
  );
  widthFactor *= clamp(state.waveWidth, 0.78, 1.26);
  float distributedVisibility =
    (state.primaryWave - state.secondaryWave) *
    distributedVisibilityVariation * 0.35;
  float visibilityBase = smoothstep(
    -0.82,
    0.82,
    material + distributedVisibility
  );
  float primaryVisibility = mix(
    1.0 - visibilityVariation,
    1.0,
    visibilityBase
  );
  float secondaryVisibility = mix(
    1.0 - visibilityVariation * 0.82,
    1.0,
    1.0 - visibilityBase * 0.74
  );
  float secondaryRippleWave = state.secondaryWave;
  float contourInnerA = max(
    minimumFoldWidth,
    contourSoftness.x * widthFactor
  );
  float contourOuterA = max(
    contourSoftness.y * widthFactor,
    contourInnerA + tipSoftness * tipRisk
  );
  float contourA = 1.0 - smoothstep(
    contourInnerA,
    contourOuterA,
    abs(rippleWave - 0.48)
  );
  float secondaryWidth = clamp(2.0 - widthFactor, 0.72, 1.32);
  float contourInnerB = max(
    minimumFoldWidth,
    contourSoftness.x * secondaryWidth
  );
  float contourOuterB = max(
    contourSoftness.y * secondaryWidth,
    contourInnerB + tipSoftness * tipRisk
  );
  float contourB = 1.0 - smoothstep(
    contourInnerB,
    contourOuterB,
    abs(secondaryRippleWave + 0.42)
  );
  contourA *= surfaceBody * primaryVisibility *
    state.waveActivity * tipSafety * activity;
  contourB *= surfaceBody * secondaryVisibility *
    state.waveActivity * tipSafety * activity;

  float rippleAlignedFold = max(
    primaryArc,
    max(contourA * 0.52, contourB * 0.3)
  );
  float foldGeometry = mix(
    primaryArc,
    rippleAlignedFold,
    foldAlignmentStrength
  );
  float foldSafety = mix(
    tipSafety,
    1.0,
    darkFoldContinuity * 0.5
  );
  float fold = foldGeometry * foldStrength * foldSafety * activity;

  float relief = 0.3 + surfaceBody * 0.24 + material * 0.16;
  relief += curvature * midtoneStrength;
  relief += ripple * 0.12;
  relief = mix(0.34, clamp(relief, 0.0, 1.0), activityLevel);

  float colorMood = wave(compositionAngle, 1.0, 0.64);
  float3 fieldColor = surfacePalette(relief, colorMood);
  float fieldLuminance = dot(
    fieldColor,
    float3(0.2126, 0.7152, 0.0722)
  );
  fieldColor = mix(
    float3(fieldLuminance),
    fieldColor,
    surfaceSaturation
  );

  float variableDistance = abs(
    surfaceDistance + material * rippleStrength * 0.24
  );
  float ridge = 1.0 - smoothstep(
    ridgeWidth * 0.38,
    ridgeWidth,
    variableDistance
  );
  float ridgeCore = 1.0 - smoothstep(
    ridgeCoreWidth * 0.32,
    ridgeCoreWidth,
    variableDistance
  );
  ridge = max(ridge, fold * 0.34);
  ridgeCore = max(
    ridgeCore,
    contourA * foldAlignmentStrength * 0.16
  );
  ridge *= mix(1.0, tipSafety, tipContrastAttenuation * 0.5);
  ridgeCore *= tipSafety;
  ridge *= activity;
  ridgeCore *= activity;

  float directionalLight = clamp(
    dot(surfaceNormal, -lightDirection) * 0.5 + 0.5,
    0.0,
    1.0
  );
  float materialBreakup = mix(
    1.0 - rimBreakup,
    1.0,
    clamp(material * 0.5 + 0.5, 0.0, 1.0)
  );
  float rim = primaryArc * directionalLight *
    materialBreakup * rimStrength * activity;
  rim *= mix(1.0, tipSafety, tipContrastAttenuation * 0.25);

  float warmEnvelope = pow(wave(compositionAngle, 1.0, 4.56), 6.0);
  float accentSeed = ridgeCore * max(curvature, rim) * warmEnvelope;
  float accentArea = smoothstep(accentAreaLimit, 1.0, accentSeed);
  float3 warmColor = mix(
    mutedPeach,
    mix(coral, rose, colorMood * 0.34),
    colorMood * 0.42
  );
  fieldColor = mix(
    fieldColor,
    warmColor,
    accentArea * warmAccentStrength
  );

  float3 luminousColor = fieldColor * (
    baseBodyLuminance + surfaceBody * midtoneStrength * activity
  );
  luminousColor += paleCyan *
    curvature * cyanHighlightStrength * activity;
  luminousColor += lavenderWhite *
    ridge * highlightStrength * 0.46;
  luminousColor += paleCyan *
    contourA * rippleBandStrength;

  float contourLuminance = dot(
    luminousColor,
    float3(0.2126, 0.7152, 0.0722)
  );
  luminousColor = mix(
    float3(contourLuminance),
    luminousColor,
    1.0 + contourB * rippleBandStrength * 0.18
  );
  luminousColor += neutralWhite *
    ridgeCore * whiteHighlightStrength * directionalLight;
  luminousColor += lavenderWhite *
    rim * whiteHighlightStrength;

  float3 rareAccent = mix(
    paleYellow,
    neonYellowGreen,
    0.16
  );
  luminousColor += rareAccent *
    accentArea * yellowAccentStrength;

  float3 finalColor =
    1.0 - (1.0 - backgroundColor) *
      (1.0 - clamp(luminousColor * activityLevel, 0.0, 0.94));

  return half4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

function compileLivingSurfaceShader() {
  try {
    return Skia.RuntimeEffect.Make(LIVING_SURFACE_SHADER_SOURCE);
  } catch {
    return null;
  }
}

const LIVING_SURFACE_EFFECT = compileLivingSurfaceShader();

export function AmbientBackground() {
  const motionPhase = useSharedValue<number>(
    ACTIVE_PRESET.reducedMotionPhase,
  );
  const compositionPhase = useSharedValue<number>(
    ACTIVE_PRESET.reducedCompositionPhase,
  );
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    cancelAnimation(motionPhase);
    cancelAnimation(compositionPhase);

    if (reduceMotion) {
      motionPhase.value = ACTIVE_PRESET.reducedMotionPhase;
      compositionPhase.value = ACTIVE_PRESET.reducedCompositionPhase;
      return;
    }

    motionPhase.value = 0;
    compositionPhase.value = 0;
    motionPhase.value = withRepeat(
      withTiming(1, {
        duration: ACTIVE_PRESET.motionDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    compositionPhase.value = withRepeat(
      withTiming(1, {
        duration: ACTIVE_PRESET.compositionDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(motionPhase);
      cancelAnimation(compositionPhase);
    };
  }, [compositionPhase, motionPhase, reduceMotion]);

  const uniforms = useDerivedValue<Uniforms>(() => {
    const motionAngle = motionPhase.value * Math.PI * 2;
    const compositionAngle = compositionPhase.value * Math.PI * 2;
    const rippleEvolution = [
      Math.sin(motionAngle) * ACTIVE_PRESET.rippleEvolutionAmount,
      Math.cos(motionAngle) * ACTIVE_PRESET.rippleEvolutionAmount,
    ];
    const originEvolutionA = [
      Math.sin(motionAngle + ACTIVE_PRESET.originPhaseOffsets[0]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[0],
      Math.cos(motionAngle + ACTIVE_PRESET.originPhaseOffsets[0]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[0],
    ];
    const originEvolutionB = [
      Math.sin(motionAngle * 2 + ACTIVE_PRESET.originPhaseOffsets[1]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[1],
      Math.cos(motionAngle * 2 + ACTIVE_PRESET.originPhaseOffsets[1]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[1],
    ];
    const originEvolutionC = [
      Math.sin(motionAngle * 3 + ACTIVE_PRESET.originPhaseOffsets[2]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[2],
      Math.cos(motionAngle * 3 + ACTIVE_PRESET.originPhaseOffsets[2]) *
        ACTIVE_PRESET.rippleEvolutionAmount *
        ACTIVE_PRESET.originEvolutionAmount[2],
    ];
    const waveEvolutionA = Math.sin(
      compositionAngle + ACTIVE_PRESET.wavePhaseOffsets[0],
    );
    const waveEvolutionB = Math.sin(
      compositionAngle * 2 + ACTIVE_PRESET.wavePhaseOffsets[1],
    );
    const waveEvolutionC = Math.sin(
      compositionAngle * 3 + ACTIVE_PRESET.wavePhaseOffsets[2],
    );
    const lifecycleA =
      compositionPhase.value /
        ACTIVE_PRESET.waveLifecycleDurations[0] +
      ACTIVE_PRESET.waveLifecycleOffsets[0];
    const lifecycleB =
      compositionPhase.value /
        ACTIVE_PRESET.waveLifecycleDurations[1] +
      ACTIVE_PRESET.waveLifecycleOffsets[1];
    const lifecycleC =
      compositionPhase.value /
        ACTIVE_PRESET.waveLifecycleDurations[2] +
      ACTIVE_PRESET.waveLifecycleOffsets[2];
    const waveLifecyclePhaseA = lifecycleA - Math.floor(lifecycleA);
    const waveLifecyclePhaseB = lifecycleB - Math.floor(lifecycleB);
    const waveLifecyclePhaseC = lifecycleC - Math.floor(lifecycleC);
    const fadeWidthA = Math.min(
      ACTIVE_PRESET.waveVisibilityEnvelopes[0],
      ACTIVE_PRESET.waveActiveWindows[0] * 0.48,
    );
    const fadeWidthB = Math.min(
      ACTIVE_PRESET.waveVisibilityEnvelopes[1],
      ACTIVE_PRESET.waveActiveWindows[1] * 0.48,
    );
    const fadeWidthC = Math.min(
      ACTIVE_PRESET.waveVisibilityEnvelopes[2],
      ACTIVE_PRESET.waveActiveWindows[2] * 0.48,
    );
    const decayA = smoothstepValue(
      ACTIVE_PRESET.waveActiveWindows[0] - fadeWidthA,
      ACTIVE_PRESET.waveActiveWindows[0],
      waveLifecyclePhaseA,
    );
    const decayB = smoothstepValue(
      ACTIVE_PRESET.waveActiveWindows[1] - fadeWidthB,
      ACTIVE_PRESET.waveActiveWindows[1],
      waveLifecyclePhaseB,
    );
    const decayC = smoothstepValue(
      ACTIVE_PRESET.waveActiveWindows[2] - fadeWidthC,
      ACTIVE_PRESET.waveActiveWindows[2],
      waveLifecyclePhaseC,
    );
    const waveLifecycleA = [
      smoothstepValue(0, fadeWidthA, waveLifecyclePhaseA) *
        (1 - decayA),
      smoothstepValue(
        0,
        ACTIVE_PRESET.waveActiveWindows[0],
        Math.min(
          waveLifecyclePhaseA,
          ACTIVE_PRESET.waveActiveWindows[0],
        ),
      ),
      decayA,
    ];
    const waveLifecycleB = [
      smoothstepValue(0, fadeWidthB, waveLifecyclePhaseB) *
        (1 - decayB),
      smoothstepValue(
        0,
        ACTIVE_PRESET.waveActiveWindows[1],
        Math.min(
          waveLifecyclePhaseB,
          ACTIVE_PRESET.waveActiveWindows[1],
        ),
      ),
      decayB,
    ];
    const waveLifecycleC = [
      smoothstepValue(0, fadeWidthC, waveLifecyclePhaseC) *
        (1 - decayC),
      smoothstepValue(
        0,
        ACTIVE_PRESET.waveActiveWindows[2],
        Math.min(
          waveLifecyclePhaseC,
          ACTIVE_PRESET.waveActiveWindows[2],
        ),
      ),
      decayC,
    ];

    return {
      resolution: RESOLUTION,
      motionPhase: motionPhase.value,
      compositionPhase: compositionPhase.value,
      backgroundColor: visual.livingSurface.background,
      deepNavy: visual.livingSurface.deepNavy,
      indigo: visual.livingSurface.indigo,
      cobalt: visual.livingSurface.cobalt,
      violet: visual.livingSurface.violet,
      cyan: visual.livingSurface.cyan,
      teal: visual.livingSurface.teal,
      lavender: visual.livingSurface.lavender,
      paleCyan: visual.livingSurface.paleCyan,
      lavenderWhite: visual.livingSurface.lavenderWhite,
      neutralWhite: visual.livingSurface.neutralWhite,
      paleYellow: visual.livingSurface.paleYellow,
      neonYellowGreen: visual.livingSurface.neonYellowGreen,
      mutedPeach: visual.livingSurface.mutedPeach,
      coral: visual.livingSurface.coral,
      rose: visual.livingSurface.rose,
      verticalActivityZone: ACTIVE_PRESET.verticalActivityZone,
      verticalMaskSoftness: ACTIVE_PRESET.verticalMaskSoftness,
      mainShapePosition: ACTIVE_PRESET.mainShapePosition,
      mainShapeScale: ACTIVE_PRESET.mainShapeScale,
      mainShapeAnisotropy: ACTIVE_PRESET.mainShapeAnisotropy,
      jellyExpansion: ACTIVE_PRESET.jellyExpansion,
      edgeLag: ACTIVE_PRESET.edgeLag,
      compositionDrift: ACTIVE_PRESET.compositionDrift,
      rippleStrength: ACTIVE_PRESET.rippleStrength,
      rippleSpeed: ACTIVE_PRESET.rippleSpeed,
      rippleAnisotropy: ACTIVE_PRESET.rippleAnisotropy,
      rippleStretch: ACTIVE_PRESET.rippleStretch,
      angularDistortionStrength:
        ACTIVE_PRESET.angularDistortionStrength,
      directionalBend: ACTIVE_PRESET.directionalBend,
      frontWidthVariation: ACTIVE_PRESET.frontWidthVariation,
      visibilityVariation: ACTIVE_PRESET.visibilityVariation,
      bandSeparation: ACTIVE_PRESET.bandSeparation,
      secondaryBandDeformation:
        ACTIVE_PRESET.secondaryBandDeformation,
      foldAlignmentStrength: ACTIVE_PRESET.foldAlignmentStrength,
      rippleEvolution,
      originEvolutionA,
      originEvolutionB,
      originEvolutionC,
      originCount: ACTIVE_PRESET.originCount,
      originPositionA: ACTIVE_PRESET.originPositions[0],
      originPositionB: ACTIVE_PRESET.originPositions[1],
      originPositionC: ACTIVE_PRESET.originPositions[2],
      originStrengthA: ACTIVE_PRESET.originStrengths[0],
      originStrengthB: ACTIVE_PRESET.originStrengths[1],
      originStrengthC: ACTIVE_PRESET.originStrengths[2],
      originStretchA: ACTIVE_PRESET.originStretch[0],
      originStretchB: ACTIVE_PRESET.originStretch[1],
      originStretchC: ACTIVE_PRESET.originStretch[2],
      originRotationA: ORIGIN_ROTATIONS[0],
      originRotationB: ORIGIN_ROTATIONS[1],
      originRotationC: ORIGIN_ROTATIONS[2],
      unionSoftness: ACTIVE_PRESET.unionSoftness,
      distributedVisibilityVariation:
        ACTIVE_PRESET.distributedVisibilityVariation,
      waveCount: ACTIVE_PRESET.waveCount,
      waveDirectionA: ACTIVE_PRESET.waveDirections[0],
      waveDirectionB: ACTIVE_PRESET.waveDirections[1],
      waveDirectionC: ACTIVE_PRESET.waveDirections[2],
      wavePhaseOffsetA: ACTIVE_PRESET.wavePhaseOffsets[0],
      wavePhaseOffsetB: ACTIVE_PRESET.wavePhaseOffsets[1],
      wavePhaseOffsetC: ACTIVE_PRESET.wavePhaseOffsets[2],
      waveLengthA: ACTIVE_PRESET.waveLengths[0],
      waveLengthB: ACTIVE_PRESET.waveLengths[1],
      waveLengthC: ACTIVE_PRESET.waveLengths[2],
      waveWidthA: ACTIVE_PRESET.waveWidths[0],
      waveWidthB: ACTIVE_PRESET.waveWidths[1],
      waveWidthC: ACTIVE_PRESET.waveWidths[2],
      waveBendA: ACTIVE_PRESET.waveBendStrength[0],
      waveBendB: ACTIVE_PRESET.waveBendStrength[1],
      waveBendC: ACTIVE_PRESET.waveBendStrength[2],
      waveCurvatureA: ACTIVE_PRESET.waveCurvature[0],
      waveCurvatureB: ACTIVE_PRESET.waveCurvature[1],
      waveCurvatureC: ACTIVE_PRESET.waveCurvature[2],
      waveVisibilityA: ACTIVE_PRESET.waveVisibility[0],
      waveVisibilityB: ACTIVE_PRESET.waveVisibility[1],
      waveVisibilityC: ACTIVE_PRESET.waveVisibility[2],
      waveWidthVariation: ACTIVE_PRESET.waveWidthVariation,
      waveFamilyStrengthA: ACTIVE_PRESET.waveFamilyStrengths[0],
      waveFamilyStrengthB: ACTIVE_PRESET.waveFamilyStrengths[1],
      waveFamilyStrengthC: ACTIVE_PRESET.waveFamilyStrengths[2],
      originPhaseInfluence: ACTIVE_PRESET.originPhaseInfluence,
      originVisibilityInfluence:
        ACTIVE_PRESET.originVisibilityInfluence,
      petalGeometrySuppression:
        ACTIVE_PRESET.petalGeometrySuppression,
      waveContinuityStrength: ACTIVE_PRESET.waveContinuityStrength,
      waveEvolutionA,
      waveEvolutionB,
      waveEvolutionC,
      waveEntryPointA: ACTIVE_PRESET.waveEntryPoints[0],
      waveEntryPointB: ACTIVE_PRESET.waveEntryPoints[1],
      waveEntryPointC: ACTIVE_PRESET.waveEntryPoints[2],
      waveExitDirectionA: ACTIVE_PRESET.waveExitDirections[0],
      waveExitDirectionB: ACTIVE_PRESET.waveExitDirections[1],
      waveExitDirectionC: ACTIVE_PRESET.waveExitDirections[2],
      waveLifecycleA,
      waveLifecycleB,
      waveLifecycleC,
      waveTranslationA: ACTIVE_PRESET.waveTranslationAmounts[0],
      waveTranslationB: ACTIVE_PRESET.waveTranslationAmounts[1],
      waveTranslationC: ACTIVE_PRESET.waveTranslationAmounts[2],
      waveDecayWidthA: ACTIVE_PRESET.waveDecayWidths[0],
      waveDecayWidthB: ACTIVE_PRESET.waveDecayWidths[1],
      waveDecayWidthC: ACTIVE_PRESET.waveDecayWidths[2],
      waveCompetitionStrength: ACTIVE_PRESET.waveCompetitionStrength,
      anchorSuppression: ACTIVE_PRESET.anchorSuppression,
      primarySurfaceStrength: ACTIVE_PRESET.primarySurfaceStrength,
      secondaryDeformationStrengthA:
        ACTIVE_PRESET.secondaryDeformationStrengths[0],
      secondaryDeformationStrengthB:
        ACTIVE_PRESET.secondaryDeformationStrengths[1],
      secondaryDeformationStrengthC:
        ACTIVE_PRESET.secondaryDeformationStrengths[2],
      familyDominanceSharpness:
        ACTIVE_PRESET.familyDominanceSharpness,
      zeroContourSeparationA:
        ACTIVE_PRESET.zeroContourSeparation[0],
      zeroContourSeparationB:
        ACTIVE_PRESET.zeroContourSeparation[1],
      zeroContourSeparationC:
        ACTIVE_PRESET.zeroContourSeparation[2],
      bendReferenceA: ACTIVE_PRESET.bendReferencePoints[0],
      bendReferenceB: ACTIVE_PRESET.bendReferencePoints[1],
      bendReferenceC: ACTIVE_PRESET.bendReferencePoints[2],
      baselineOffsetA: ACTIVE_PRESET.baselineOffsets[0],
      baselineOffsetB: ACTIVE_PRESET.baselineOffsets[1],
      baselineOffsetC: ACTIVE_PRESET.baselineOffsets[2],
      flowCurlStrength: ACTIVE_PRESET.flowCurlStrength,
      minimumFoldWidth: ACTIVE_PRESET.minimumFoldWidth,
      tipSoftness: ACTIVE_PRESET.tipSoftness,
      tipContrastAttenuation:
        ACTIVE_PRESET.tipContrastAttenuation,
      curvatureClamp: ACTIVE_PRESET.curvatureClamp,
      pinchRadius: ACTIVE_PRESET.pinchRadius,
      singularitySuppression: ACTIVE_PRESET.singularitySuppression,
      darkFoldContinuity: ACTIVE_PRESET.darkFoldContinuity,
      dominantFamilyTransitionSoftness:
        ACTIVE_PRESET.dominantFamilyTransitionSoftness,
      foldStrength: ACTIVE_PRESET.foldStrength,
      foldSoftness: ACTIVE_PRESET.foldSoftness,
      curvatureSampleOffset: ACTIVE_PRESET.curvatureSampleOffset,
      curvatureStrength: ACTIVE_PRESET.curvatureStrength,
      surfaceFlowStrength: ACTIVE_PRESET.surfaceFlowStrength,
      baseBodyLuminance: ACTIVE_PRESET.baseBodyLuminance,
      midtoneStrength: ACTIVE_PRESET.midtoneStrength,
      highlightStrength: ACTIVE_PRESET.highlightStrength,
      ridgeWidth: ACTIVE_PRESET.ridgeWidth,
      ridgeCoreWidth: ACTIVE_PRESET.ridgeCoreWidth,
      rimStrength: ACTIVE_PRESET.rimStrength,
      rimBreakup: ACTIVE_PRESET.rimBreakup,
      rippleBandStrength: ACTIVE_PRESET.rippleBandStrength,
      contourSoftness: ACTIVE_PRESET.contourSoftness,
      lightDirection: ACTIVE_PRESET.lightDirection,
      cyanHighlightStrength: ACTIVE_PRESET.cyanHighlightStrength,
      whiteHighlightStrength: ACTIVE_PRESET.whiteHighlightStrength,
      yellowAccentStrength: ACTIVE_PRESET.yellowAccentStrength,
      accentAreaLimit: ACTIVE_PRESET.accentAreaLimit,
      surfaceSaturation: ACTIVE_PRESET.surfaceSaturation,
      warmAccentStrength: ACTIVE_PRESET.warmAccentStrength,
      lowerScreenAttenuation: ACTIVE_PRESET.lowerScreenAttenuation,
    };
  });

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Fill color={colors.background} />
      {LIVING_SURFACE_EFFECT ? (
        <Rect
          x={0}
          y={0}
          width={SCREEN_SIZE.width}
          height={SCREEN_SIZE.height}
        >
          <Shader
            source={LIVING_SURFACE_EFFECT}
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
