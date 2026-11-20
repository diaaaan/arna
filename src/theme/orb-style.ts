import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Experiment: several looks for the navigation orb, switched by a long press on
// the "arna" logo on the capture screen. The choice is remembered.
export type OrbStyle = 'glass' | 'lava' | 'aura' | 'ripples';

export const ORB_STYLES: readonly { id: OrbStyle; label: string }[] = [
  { id: 'glass', label: 'Liquid glass' },
  { id: 'lava', label: 'Piece of lava' },
  { id: 'aura', label: 'Aura' },
  { id: 'ripples', label: 'Ripples' },
];

const STORAGE_KEY = 'arna.ui.orb-style';
let current: OrbStyle = 'glass';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (ORB_STYLES.some((style) => style.id === stored)) {
      current = stored as OrbStyle;
      emit();
    }
  })
  .catch(() => undefined);

export function cycleOrbStyle(): OrbStyle {
  const index = ORB_STYLES.findIndex((style) => style.id === current);
  current = ORB_STYLES[(index + 1) % ORB_STYLES.length].id;
  AsyncStorage.setItem(STORAGE_KEY, current).catch(() => undefined);
  emit();
  return current;
}

export function orbStyleLabel(style: OrbStyle) {
  return ORB_STYLES.find((item) => item.id === style)?.label ?? style;
}

export function useOrbStyle(): OrbStyle {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
