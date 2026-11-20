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
};
