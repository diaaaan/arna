import { makeMutable } from 'react-native-reanimated';

// Shared, UI-thread values that let screens talk to the Living Surface without
// re-rendering anything. Writers set them, the background reads them.
export const surfaceSignal = {
  // 0 = idle, 1 = the text field is focused.
  focus: makeMutable(0),
  // Extra calm for screens with a lot of text (0 = capture screen, 1 = fully dimmed).
  scene: makeMutable(0),
  // Shader mode value from smearModes (0 = dusk, 1 = lava).
  mode: makeMutable(1),
};
