
# HANDOFF: Arna / Living Surface

## 1. Проект

Я работаю над приложением **Arna**.

Стек:

* **React Native**
* **Expo**
* **React Native Skia**
* `Canvas` / `Rect`
* **Skia RuntimeEffect**
* shader написан на **SkSL**
* основная визуализация Living Surface полностью процедурная и считается **на GPU**
* фон не использует видео или готовые изображения

Идея Arna в целом: минималистичное приложение для захвата мыслей/задач. Но текущая работа в этом чате почти полностью посвящена визуальному фону **Living Surface**.

---

# 2. Что такое Living Surface

Это процедурный живой фон приложения.

Изначально цель была примерно такая:

* тёмный фон;
* органическое движение;
* плавные волны/потоки;
* ощущение жидкости или поверхности;
* визуализация должна быть постоянно живой, но не выглядеть как частицы;
* элементы должны течь друг через друга;
* хотелось получить что-то между fluid simulation, волнами и абстрактной физической поверхностью.

Главная первоначальная идея была:

```text
flow
↓
coordinate advection
↓
scalar relief
↓
curvature / normals
↓
High Relief lighting
```

То есть мы пытались сделать не просто 2D-анимацию, а псевдо-3D рельефную поверхность.

---

# 3. Где находится код

Основная реализация:

```text
src/components/ambient-background.tsx
```

Внутри используется Skia RuntimeEffect / SkSL shader.

Текущий shader довольно большой. В какой-то момент его audit passport насчитывал примерно:

* **92 uniforms**
* **15 стадий pipeline**

То есть shader постепенно разросся из простого эксперимента в довольно сложную систему.

---

# 4. Первоначальная архитектура shader

Упрощённо pipeline выглядел так:

```text
screen UV
↓
flow
↓
curl flow
↓
coordinate advection
↓
relief phases
↓
topology deformation
↓
raw relief
↓
artistic processing
↓
curvature
↓
normals / lighting
↓
palette / final image
```

Изначально предполагалось, что проблема может находиться практически в любой части этой цепочки.

---

# 5. Что именно пошло не так

В процессе работы появились характерные визуальные артефакты.

Основные:

### 5.1. Petals / лепестки

Вместо ожидаемого плавного fluid-поля появились структуры, похожие на:

* лепестки;
* цветочные формы;
* расходящиеся радиальные структуры;
* чёрные контуры вокруг них.

Особенно это было заметно в финальном освещённом варианте.

---

### 5.2. Чёрные контуры

Вокруг некоторых областей появлялись резкие тёмные линии/контуры.

Они визуально усиливали ощущение, что поверхность превратилась в странный рельеф с очертаниями, а не в плавное поле.

---

### 5.3. Яркая полоса

В shader присутствовала отдельная яркая волна/полоса.

Она оставалась даже когда curvature полностью отключался.

Поэтому стало понятно, что:

> яркая полоса не является следствием curvature.

---

### 5.4. Discontinuity / loop jump

При циклической анимации есть заметный скачок/разрыв.

То есть поле не идеально возвращается в исходное состояние при завершении цикла.

Это отдельная проблема, не решённая во время curvature investigation.

---

### 5.5. Периоды почти полной темноты

Есть моменты цикла, когда изображение становится очень тёмным и визуально почти исчезает.

Это тоже осталось нерешённым.

---

# 6. Диагностические режимы

Для расследования были добавлены debug controls:

```ts
const DEBUG_VIEW =
  'NORMAL'
| 'RAW_RELIEF'
| 'ADVECTED_COORDINATES'
| 'CURVATURE_VIEW';
```

И:

```ts
const CURVATURE_VIEW =
  'SIGNED_DELTA'
| 'ABS_DELTA'
| 'SCALED_UNCLAMPED'
| 'CLAMPED'
| 'CLAMP_MASK';
```

Они использовались для изоляции различных стадий pipeline.

---

# 7. Что удалось установить экспериментами

Это очень важно: мы уже довольно хорошо локализовали источник главного артефакта.

---

## 7.1. ADVECTED_COORDINATES

Режим:

```text
ADVECTED_COORDINATES
```

выглядит здоровым.

То есть сама coordinate advection не выглядит сломанной.

Это уменьшило вероятность, что основной источник petals находится непосредственно в flow/advection.

---

# 8. RAW_RELIEF

При исследовании raw relief были разные составляющие.

Наблюдения:

### FULL

Получался в основном размытый blob.

### BASE

Тоже преимущественно размытая структура.

### MIXED

Появлялись слабые радиальные лучи.

### LOCAL_EVENTS

Появлялись ripple-подобные структуры.

### TOPOLOGY_BREAKER

Появлялась движущаяся форма, похожая на hourglass.

---

# 9. Проверка topology breaker

Была сделана попытка полностью отключить topology breaker и убрать его вклад из phase skew.

Визуально это **не изменило основной проблемный артефакт**.

Следовательно:

> topology breaker не является основной причиной petals.

Это важно, потому что раньше была гипотеза, что именно он ломает топологию поля.

---

# 10. Самый важный эксперимент: отключение curvature

Было временно установлено:

```glsl
curvature = 0.0;
```

Это дало очень информативный результат.

### Исчезло:

* petals;
* чёрные контуры.

### Осталось:

* яркая волна/полоса;
* loop discontinuity;
* периоды почти полной темноты.

### Также:

* цвета стали темнее.

Из этого сделали очень сильный вывод:

> **Petals и black contour появляются именно через curvature pipeline.**

Но:

> curvature не отвечает за все остальные проблемы.

---

# 11. Исследование CLAMP_MASK

Был сделан debug view:

```text
CURVATURE_VIEW = CLAMP_MASK
```

На видео/визуализации:

* фон чёрный;
* белыми видны petals/waves;
* хорошо видно, как petals формируются из точки;
* чёрные контуры пространственно совпадают с финальным артефактом.

Это показало:

> spatial pattern, который позже становится petals, уже присутствует внутри curvature field.

То есть финальное освещение не создаёт эту геометрию с нуля.

---

# 12. Проверка clamp

Следующий эксперимент:

```text
SCALED_UNCLAMPED
```

То есть curvature показывался до финального clamp.

Получилась практически та же геометрия:

* petals;
* contours;
* те же основные структуры.

Только края были немного более мягкими.

Следовательно:

> `clamp()` не является источником petals.

Он скорее усиливает/фиксирует уже существующую структуру.

---

# 13. ABS_DELTA

Был проверен:

```text
ABS_DELTA
```

Он показал ту же геометрию petals очень явно.

Это означало:

> характерная форма существует ещё до финального scaling/clamp.

`abs()` усиливает её, потому что объединяет обе стороны signed curvature, но не создаёт её с нуля.

---

# 14. SIGNED_DELTA

Проверка:

```text
SIGNED_DELTA
```

дала более плавную light/dark структуру.

Petals были менее очевидны и менее симметричны.

Это подтвердило:

* `abs()` действительно усиливает эффект;
* но `abs()` не является первопричиной;
* сама форма возникает из second-difference структуры.

---

# 15. Эксперимент с positive-only curvature

Изначально curvature был:

```glsl
float curvatureDelta = abs(
  forwardField + backwardField - field * 2.0
);

float curvature = clamp(
  curvatureDelta /
    max(curvatureSampleOffset * curvatureSampleOffset, 0.000001) *
    curvatureStrength,
  0.0,
  curvatureClamp
);
```

Мы заменили это на signed curvature и оставили только положительную сторону:

```glsl
float curvatureDenominator = max(
  curvatureSampleOffset * curvatureSampleOffset,
  0.000001
);

float signedCurvature =
  (forwardField + backwardField - field * 2.0) /
  curvatureDenominator * curvatureStrength;

float curvature = clamp(
  max(signedCurvature, 0.0),
  0.0,
  curvatureClamp
);
```

Результат:

* petals **не исчезли**;
* структура стала несколько мягче;
* стала менее симметричной.

Вывод:

> `abs()` вторичен. Основная проблема возникает раньше, в самом поле, из которого вычисляется curvature.

---

# 16. Самый важный forensic report от Codex

Мы попросили Codex провести forensic analysis shader и проследить, **из какого именно сигнала вычисляется curvature**.

Отчёт очень важный.

Он доступен в текущем контексте как:

```text
:contentReference[oaicite:0]{index=0}
```

Если нужно ссылаться на него в новом чате, файл/отчёт нужно будет снова предоставить туда.

---

# 17. Главный вывод forensic analysis

Оказалось, что curvature считается **не из rawRelief**.

Он считается из уже художественно обработанного:

```text
reliefValue
```

То есть pipeline на самом деле:

```text
rawRelief
↓
soft saturation
↓
negative-depth compression
↓
processed reliefValue
↓
field
forwardField
backwardField
↓
second difference
↓
curvature
```

Это оказалось главным подозрительным местом.

---

# 18. Как формируется rawRelief

`rawRelief` состоит из нескольких составляющих:

* base `sin(phases)`
* mixed `sin(linear combination of phases)`
* local event `sin`s
* topology breaker

Упрощённо:

```text
base
+
mixed
+
local events
+
topology breaker
=
rawRelief
```

---

# 19. Но затем rawRelief дополнительно обрабатывается

Перед curvature применяется nonlinear artistic processing.

Сначала soft saturation:

```glsl
softlySaturated =
  rawRelief /
  (1.0 + reliefSoftSaturation * abs(rawRelief));
```

Потом отдельно обрабатывается negative depth:

```glsl
negativeDepth =
  max(-softlySaturated - negativeReliefKnee, 0.0);
```

Далее:

```glsl
compressedDepth =
  negativeDepth /
  (1.0 + negativeReliefCompression * negativeDepth);
```

И затем:

```glsl
compressionMix =
  smoothstep(
    0.0,
    shadowPenumbra,
    negativeDepth
  );
```

После этого формируется итоговый processed signal через `mix`.

И именно этот сигнал используется дальше.

---

# 20. Почему это подозрительно

Получается довольно опасная архитектура:

```text
raw relief
↓
artistic nonlinear transformation
↓
curvature
```

То есть мы сначала специально изменяем форму сигнала:

* сжимаем;
* насыщаем;
* отдельно деформируем negative depth;

а потом вычисляем вторую производную уже от **изменённого сигнала**.

Second derivative очень чувствителен к локальным нелинейным изменениям.

Поэтому гипотеза была:

> возможно, petals появляются не из-за самого relief, а из-за того, что curvature вычисляется после artistic compression/saturation.

---

# 21. Как именно считается curvature

Curvature — это не полноценная геометрическая curvature поверхности.

Это directional second difference.

Упрощённо:

```glsl
forwardField + backwardField - 2.0 * field
```

Затем:

```text
÷ sampleOffset²
× curvatureStrength
↓
positive side
↓
clamp
```

То есть это фактически:

```text
second derivative along lightDirection
```

а не полноценный Laplacian или geometric curvature.

---

# 22. Параметры curvature

По forensic report:

```text
curvatureSampleOffset = 0.012
curvatureStrength = 0.32
curvatureClamp = 0.86
```

Поэтому знаменатель:

```text
0.012² = 0.000144
```

Очень маленький.

Следовательно, даже относительно небольшие различия между:

```text
forwardField
field
backwardField
```

сильно усиливаются.

---

# 23. Направление curvature sampling

Используется:

```text
lightDirection ≈ (-0.58, -0.82)
```

Он практически unit vector.

При этом есть:

* aspect correction;
* coordinate advection;
* directional sampling.

То есть фактическая геометрия зависит не только от relief, но и от того, как именно направление семплирования проходит через warped/advection field.

---

# 24. Ещё одна важная архитектурная проблема

Curvature потом используется сразу в нескольких местах.

Он влияет на:

* relief/palette luminance;
* cyan highlight;
* contour widths;
* ridge/rim attenuation;
* warm accent eligibility;
* другие элементы High Relief lighting.

То есть curvature — очень high-leverage параметр.

Поэтому одна ошибка там распространяется сразу на большое количество визуальных эффектов.

---

# 25. Normals

Важно:

Normals здесь **не вычисляются напрямую из gradient relief**.

`surfaceNormal` формируется из flow/perpendicular.

То есть система смешивает:

```text
relief curvature
+
flow-derived normal
```

Это ещё одна причина, почему pipeline довольно сложный.

---

# 26. Что ещё осталось проверить

Последний **не выполненный** важный эксперимент:

### Посчитать curvature из raw/clean relief

То есть сделать два параллельных сигнала:

```text
rawRelief
    ↓
    ├──→ curvature
    │
    └──→ artistic processing → final color
```

вместо:

```text
rawRelief
↓
artistic processing
↓
processed reliefValue
↓
curvature
```

И сравнить визуально.

Это был следующий эксперимент, на котором мы остановились.

---

# 27. Важное разделение проблем

Сейчас мы считаем, что есть минимум **три независимые проблемы**.

### A. Petals / black contours

Практически локализованы в:

```text
processed relief
↓
directional second difference
↓
curvature
```

Следующая проверка:

> curvature от raw/clean relief вместо processed relief.

---

### B. Bright band

Не исчезает при:

```glsl
curvature = 0.0;
```

Следовательно:

> искать отдельно от curvature.

Вероятнее всего смотреть в:

* relief;
* phase composition;
* directional waves;
* palette;
* direct luminance/highlight pipeline.

---

### C. Loop discontinuity

Также остаётся при отключении curvature.

Следовательно:

> это отдельная проблема animation/phase/flow loop.

Нужно будет отдельно исследовать циклическую параметризацию.

---

### D. Near-black periods

Тоже остаются при:

```glsl
curvature = 0.0;
```

Следовательно:

> это не curvature problem.

Искать в:

* palette;
* luminance;
* phase cancellation;
* flow energy;
* возможно, временной синхронизации нескольких компонентов.

---

# 28. Почему мы начали думать, что shader стал слишком сложным

В процессе debugging стало очевидно, что первоначальная архитектура:

```text
flow
→ advection
→ relief
→ topology deformation
→ nonlinear artistic processing
→ curvature
→ normal
→ high-relief lighting
→ palette
```

сильно усложнилась.

Каждый новый эффект добавлялся поверх предыдущего.

В итоге стало трудно понять:

> это физически осмысленное поле или набор визуальных коррекций, которые случайно взаимодействуют?

Именно поэтому было принято решение **не обязательно бесконечно чинить текущий shader**.

---

# 29. Новая идея: Krea.ai

После этого я показал тебе:

```text
https://www.krea.ai/
```

и попросил посмотреть на их realtime visual field и особенно на эффект, похожий на:

> чёрную дыру / препятствие, вокруг которого поток огибает объект.

Мы посмотрели Krea через web.

Официальные материалы Krea:

* `https://www.krea.ai/`
* `https://www.krea.ai/blog/announcing-realtime-video`
* `https://www.krea.ai/blog/prompt-to-workflow`

Krea говорит о realtime rendering и интерактивном visual generation, но **публичного подтверждения конкретной реализации именно этого black-hole visual field мы не нашли**.

Поэтому нельзя утверждать:

> «Krea делает это именно через такой-то shader».

Это только визуальная/концептуальная референсная точка.

---

# 30. Что именно нам понравилось в Krea-подобной идее

Визуально эффект ближе не к:

```text
relief
↓
curvature
↓
3D lighting
```

а к:

```text
velocity field
↓
distortion / advection
↓
local obstacle / attractor
↓
visualization of field
```

То есть вместо того, чтобы строить псевдо-3D поверхность, можно построить **поле скоростей**.

---

# 31. Концепция нового shader

Упрощённая идея:

```text
base flow
      ↓
local obstacle / black hole
      ↓
velocity deflection
      ↓
coordinate advection
      ↓
soft bands / warped gradient
      ↓
dark center / negative space
```

Визуально:

```text
→ → → → →

→ → ↗     ↘ → →

→ ↑     ●     ↓ →

→ → ↘     ↗ → →

→ → → → →
```

Где:

```text
●
```

это виртуальный obstacle / black hole.

---

# 32. Важное требование к новой версии

Я **не хочу превращать это в particle system**.

Мне всё ещё нужен:

* fluid feeling;
* continuous field;
* waves;
* flowing surface;
* органическое движение.

То есть:

**не частицы.**

Смысл именно в непрерывном velocity field.

---

# 33. Какой новый prototype был предложен

Сделать отдельный prototype, **не переписывая текущий Living Surface**.

Например:

```ts
FLOW_FIELD_MODE = 'KREA_FLOW'
```

или отдельный компонент.

Текущий shader оставить как fallback/reference.

---

# 34. Первый Krea-inspired prototype должен быть максимально простым

Не надо сразу переносить туда старую систему.

На первом этапе только:

### 1. Base directional flow

Например:

```text
→ → → → →
```

---

### 2. Один obstacle / attractor

В центре:

```text
●
```

---

### 3. Deflection around obstacle

Velocity vector около объекта меняется таким образом, чтобы поток обходил его.

Не просто radial push.

Нужна **tangential component**, чтобы поток огибал объект.

---

### 4. Coordinate advection

Получаем warped coordinates:

```text
uv
↓
velocity field
↓
advected uv
```

---

### 5. Простая визуализация

Пока без curvature.

Например:

```text
sin(advected coordinates)
```

или несколько мягких полос/градиентов.

---

### 6. Мягкий чёрный центр

В центре obstacle можно сделать:

```text
soft radial darkening
```

чтобы появился эффект black-hole / negative space.

---

# 35. Что НЕ надо сразу переносить из старого shader

На первом prototype **не добавлять**:

* topology breaker;
* сложную relief composition;
* negative-depth compression;
* curvature;
* High Relief;
* сложные normals;
* множество local events;
* сложную palette system;
* десятки управляющих uniforms.

Сначала нужно проверить саму базовую механику:

> velocity field + obstacle + advection действительно дают нужное ощущение?

---

# 36. Почему это имеет смысл

Старый подход пытался создать:

> поверхность, которая выглядит как жидкий рельеф.

Новый подход пытается создать:

> поле, которое ведёт себя как поток.

Это ближе к тому визуальному эффекту, который понравился в Krea.

И технически это всё ещё хорошо ложится на наш существующий стек:

```text
React Native
+
Expo
+
React Native Skia
+
Skia RuntimeEffect
+
SkSL
+
GPU
```

То есть не нужно менять технологию.

Меняется **математическая модель**.

---

# 37. Важный принцип при продолжении работы

Не нужно сразу пытаться сделать новую версию «красивой».

Первый prototype должен быть почти debug visualization:

```text
velocity field
+
obstacle
+
advected bands
```

Если это визуально уже похоже на нужное поведение, дальше можно добавлять:

```text
soft lighting
+
depth impression
+
color
+
multiple flow structures
```

Но только после того, как базовая динамика хорошая.

---

# 38. Текущая точка остановки

Мы остановились **не на готовом Krea-прототипе**, а на этапе принятия решения перейти к нему.

Последнее состояние:

### Старый Living Surface

Главный артефакт:

```text
petals + black contours
```

локализован в curvature pipeline.

Последняя техническая гипотеза:

```text
curvature вычисляется слишком поздно,
после artistic processing relief.
```

Следующий незавершённый эксперимент:

```text
raw/clean relief
        ↓
    curvature
```

вместо:

```text
raw relief
↓
soft saturation
↓
negative compression
↓
processed relief
↓
curvature
```

Но параллельно возникло решение, что **возможно, выгоднее начать новый упрощённый prototype**, вдохновлённый Krea.

---

# 39. Что делать дальше

Я бы продолжал в таком порядке:

### Вариант A — закончить forensic test старого shader

Сделать:

```text
rawRelief
   ├──→ curvature
   │
   └──→ artistic processing → color
```

и посмотреть:

> исчезают ли petals.

Если исчезли — гипотеза подтверждена.

---

### Затем отдельно:

исследовать:

```text
bright band
loop jump
dark periods
```

Но только если старый shader всё ещё имеет смысл спасать.

---

### Вариант B — начать Krea Flow prototype

Создать отдельный shader/component.

Минимум:

```text
UV
↓
base velocity
↓
obstacle velocity field
↓
advect UV
↓
sinusoidal bands
↓
soft black obstacle
```

И только после этого добавлять визуальную сложность.

**Это сейчас выглядит более перспективным направлением.**

---

# 40. Главный контекст, который нельзя потерять

Если продолжать проект в новом чате, важно помнить:

1. **Мы не ищем способ сделать particle animation.**
2. Нам нужен **continuous fluid-like field**.
3. React Native / Expo / Skia менять не нужно.
4. RuntimeEffect + SkSL на GPU остаётся основной технологией.
5. Старый shader не надо сразу удалять.
6. `curvature` действительно доказанно является источником petals/black contours.
7. `clamp` не является причиной.
8. `abs()` усиливает эффект, но не является корнем проблемы.
9. `topology breaker` не является основной причиной.
10. `ADVECTED_COORDINATES` выглядят нормально.
11. Bright band, loop discontinuity и near-black periods — **отдельные проблемы**.
12. Главная незавершённая гипотеза старого shader: curvature считается от уже нелинейно обработанного relief.
13. Новый потенциальный путь: **velocity field + obstacle + advection**, вдохновлённый визуальным поведением Krea.
14. Новый prototype лучше делать отдельно, не ломая старый.

---

## Короткая версия для нового чата

Если не хочется переносить весь текст, можно отправить новому чату вот этот блок:

```text
Я продолжаю проект Arna.

Стек:
- React Native
- Expo
- React Native Skia
- Canvas/Rect
- Skia RuntimeEffect
- SkSL shader
- procedural GPU background

Основной файл:
src/components/ambient-background.tsx

Работаем над процедурным фоном Living Surface. Цель: тёмное органическое fluid-like поле с плавным непрерывным движением, волнами и flow. Не particles.

Старый pipeline:

flow
→ coordinate advection
→ relief phases
→ topology deformation
→ rawRelief
→ soft saturation
→ negative-depth compression
→ processed reliefValue
→ directional second difference
→ curvature
→ flow-derived normals
→ High Relief lighting
→ palette

Shader разросся примерно до 92 uniforms / 15 pipeline stages.

Основная проблема старого shader:
появляются странные petals/цветочные структуры и чёрные контуры.

Мы провели forensic debugging.

Доказано:
- ADVECTED_COORDINATES выглядят нормально.
- отключение topology breaker почти ничего не меняет.
- curvature = 0 полностью убирает petals и black contour.
- при curvature = 0 яркая полоса остаётся.
- loop discontinuity остаётся.
- периоды почти полной темноты остаются.
- значит petals/black contours связаны с curvature, остальные проблемы отдельные.
- CLAMP_MASK показывает ту же геометрию.
- SCALED_UNCLAMPED показывает ту же геометрию, значит clamp не создаёт проблему.
- ABS_DELTA показывает ту же геометрию.
- SIGNED_DELTA делает её мягче, но не убирает.
- positive-only signed curvature тоже не убирает petals.
- значит abs() не является root cause.

Очень важный forensic вывод:
curvature считается НЕ из rawRelief, а из processed reliefValue после nonlinear artistic processing.

rawRelief
→
soft saturation:
rawRelief / (1 + reliefSoftSaturation * abs(rawRelief))
→
negative depth:
max(-softlySaturated - negativeReliefKnee, 0)
→
compressed negative depth
→
mix
→
processed reliefValue
→
field / forwardField / backwardField
→
second difference
→
curvature

Curvature:
forwardField + backwardField - 2*field
делится на curvatureSampleOffset²
и умножается на curvatureStrength, затем positive-only + clamp.

Параметры:
curvatureSampleOffset ≈ 0.012
curvatureStrength ≈ 0.32
curvatureClamp ≈ 0.86

lightDirection ≈ (-0.58, -0.82)

Последний незавершённый эксперимент:
считать curvature из raw/clean relief ДО artistic saturation/compression, но использовать processed relief для финального цвета.

То есть попробовать:

rawRelief
├──→ curvature
└──→ artistic processing → color

вместо:

rawRelief
→ artistic processing
→ processed relief
→ curvature

Есть Codex forensic report, который подробно описывает pipeline: :contentReference[oaicite:1]{index=1}

Параллельно мы решили, что старый shader, возможно, стал чрезмерно сложным, и начали рассматривать новый prototype.

Новая референсная идея — визуальное поведение Krea.ai:
https://www.krea.ai/

Нам понравился realtime visual field с эффектом, похожим на чёрную дыру/препятствие, вокруг которого поток огибает объект.

Важно: мы НЕ знаем точную реализацию Krea и не утверждаем, что они используют конкретный shader.

Концептуально новый подход:

velocity field
→ local obstacle / black hole
→ velocity deflection
→ coordinate advection
→ soft bands / warped gradient
→ soft dark center

Например:

→ → → → →
→ → ↗   ↘ → →
→ ↑   ●   ↓ →
→ → ↘   ↗ → →
→ → → → →

Не particles.

Первый prototype должен быть максимально простым:
1. base directional flow
2. один obstacle
3. tangential deflection вокруг obstacle
4. advected coordinates
5. простые sinusoidal bands / gradient
6. мягкий чёрный центр

Без:
- curvature
- topology breaker
- High Relief
- сложных normals
- negative-depth compression
- множества local events
- огромного количества uniforms

Старый shader не удалять. Лучше отдельный component или feature flag вроде:
FLOW_FIELD_MODE = 'KREA_FLOW'

Цель первого prototype — проверить саму динамику velocity field + obstacle + advection. Если она уже выглядит правильно, потом постепенно добавить depth/light/color.

На данный момент именно на этом мы остановились.
