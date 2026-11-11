import { makeMutable } from 'react-native-reanimated';

// Shared, UI-thread values that let screens talk to the Living Surface without
// re-rendering anything. Writers set them, the background reads them.
export const surfaceSignal = {
  // 0 = idle, 1 = the text field is focused.
  focus: makeMutable(0),
};
