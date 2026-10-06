# Архив анимаций фона (Living Surface)

Снимок на 2026-10-06. Файлы с расширением `.archived` не участвуют в сборке.

- `ambient-background-legacy.tsx.archived` — компонент с вариантами А (flowField), Б (warpLiquid), В (gel), Г (smear)
- `living-surface-warp.ts.archived` — вариант Б: доменно-искажённая жидкость с освещением
- `living-surface-gel.ts.archived` — вариант В: тяжёлые гелевые массы (метаболлы)
- `tokens.snapshot.ts.archived` — токены на момент архивации (пресеты А/Б/В/Г)

Вариант А (flowField) — шейдер внутри `ambient-background-legacy.tsx.archived`.
Чтобы вернуть вариант: переименовать файлы обратно и восстановить импорты и токены из снимка.
Активный фон теперь — «мазок» (`src/components/living-surface-smear.ts`).
