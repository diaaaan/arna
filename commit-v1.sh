#!/bin/sh
# Коммиты для Arna: SDK 57, надёжное хранилище, новый фон. Запускать из корня проекта.
set -e
git add package.json package-lock.json "app/(tabs)/_layout.tsx" src/components/thought-input.tsx
git commit -m "chore: upgrade to Expo SDK 57 and fix tab bar icons"
git add src/storage src/entities/thought/thought.ts src/mind/mind-engine.ts "app/(tabs)/thoughts.tsx"
git commit -m "fix: make thought storage tolerant to corrupt or partial data"
git add src/components/ambient-background.tsx src/components/living-surface-smear.ts src/theme/tokens.ts "app/(tabs)/index.tsx" archive
git commit -m "feat: replace Living Surface with viscous smear and lava background"
git log --oneline -4
