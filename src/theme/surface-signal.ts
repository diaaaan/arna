import { makeMutable } from 'react-native-reanimated';

import { smearPreset } from './tokens';

// Shared, UI-thread values that let screens talk to the Living Surface without
// re-rendering anything. Writers set them, the background reads them.
export const surfaceSignal = {
  // 0 = idle, 1 = the text field is focused.
  focus: makeMutable(0),
  // 0 = capture screen (alive), 1 = other sections (still, blurred).
  scene: makeMutable(0),
  // Shader mode value from smearModes (0 = dusk, 1 = lava).
  mode: makeMutable(1),
  // Loop phases of the surface, advanced by the background every frame.
  // Shared so glass elements can refract the same picture.
  motionPhase: makeMutable<number>(smearPreset.reducedMotionPhase),
  slowPhase: makeMutable(0.2),
  // A ripple through the surface. It starts from the outline of a rounded
  // rectangle (the text field, [x, y, width, height] in screen points) and
  // runs outward, keeping that shape; radius = how far it has gone, points;
  // strength in points of displacement (0 = no ripple).
  rippleRect: makeMutable<[number, number, number, number]>([0, 0, 0, 0]),
  rippleRadius: makeMutable(0),
  rippleAmp: makeMutable(0),
  // Colour the ripple paints into the matter, and how strongly (0..1).
  rippleTint: makeMutable<[number, number, number]>([0.44, 0.89, 0.78]),
  rippleGlow: makeMutable(0),
  // The text field the surface flows around: [x, y, width, height] in screen
  // points (width 0 = none).
  fieldRect: makeMutable<[number, number, number, number]>([0, 0, 0, 0]),
  // Where the surface canvas sits in the window (measureInWindow). On Android
  // window coordinates may leave out the status bar, so field positions are
  // taken relative to the canvas, measured the same way.
  surfaceOffset: makeMutable<[number, number]>([0, 0]),
};
