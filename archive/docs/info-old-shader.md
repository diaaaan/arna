ANDOFF: Arna / Living Surface

1. ПРОЕКТ

Я работаю над приложением Arna.

Стек:
- React Native
- Expo
- React Native Skia
- Canvas / Rect
- Skia RuntimeEffect
- shader написан на SkSL
- основная визуализация Living Surface полностью процедурная и считается на GPU
- фон не использует видео или готовые изображения

Идея Arna в целом: минималистичное приложение для захвата мыслей/задач. Текущая работа посвящена визуальному фону Living Surface.

2. ЧТО ТАКОЕ LIVING SURFACE

Это процедурный живой фон приложения.

Цели:
- тёмный фон;
- органическое движение;
- плавные волны/потоки;
- ощущение жидкости или поверхности;
- визуализация должна быть постоянно живой, но не выглядеть как частицы;
- элементы должны течь друг через друга;
- хотелось получить что-то между fluid simulation, волнами и абстрактной физической поверхностью.

Первоначальная архитектура:

flow
↓
coordinate advection
↓
scalar relief
↓
curvature / normals
↓
High Relief lighting

3. ГДЕ КОД

Основная реализация:
src/components/ambient-background.tsx

Используется Skia RuntimeEffect / SkSL shader.

4. ПЕРВОНАЧАЛЬНАЯ АРХИТЕКТУРА SHADER

Упрощённо:

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

5. ОСНОВНЫЕ ПРОБЛЕМЫ

5.1 Petals / лепестки

Вместо плавного fluid-поля появились структуры, похожие на:
- лепестки;
- цветочные формы;
- расходящиеся радиальные структуры;
- чёрные контуры вокруг них.

5.2 Чёрные контуры

Вокруг некоторых областей появлялись резкие тёмные линии/контуры.

5.3 Яркая полоса

Есть отдельная яркая волна/полоса. Она остаётся даже при полном отключении curvature.

5.4 Loop discontinuity

При циклической анимации есть заметный скачок/разрыв: поле не идеально возвращается в исходное состояние.

5.5 Периоды почти полной темноты

Есть моменты цикла, когда изображение становится очень тёмным и визуально почти исчезает.

6. DEBUG CONTROLS

Были добавлены:

const DEBUG_VIEW =
  'NORMAL'
| 'RAW_RELIEF'
| 'ADVECTED_COORDINATES'
| 'CURVATURE_VIEW';

И:

const CURVATURE_VIEW =
  'SIGNED_DELTA'
| 'ABS_DELTA'
| 'SCALED_UNCLAMPED'
| 'CLAMPED'
| 'CLAMP_MASK';

7. ЧТО УСТАНОВИЛИ ЭКСПЕРИМЕНТАМИ

ADVECTED_COORDINATES:
- выглядит здоровым;
- сама coordinate advection не выглядит источником основного артефакта.

RAW_RELIEF:
- FULL = в основном размытый blob;
- BASE = размытый;
- MIXED = слабые радиальные лучи;
- LOCAL_EVENTS = ripple-подобные структуры;
- TOPOLOGY_BREAKER = движущаяся hourglass-подобная форма.

Topology breaker:
- его отключение и удаление его вклада из phase skew почти ничего визуально не изменило;
- значит topology breaker не является основной причиной petals.

8. КЛЮЧЕВОЙ ЭКСПЕРИМЕНТ: CURVATURE = 0

Временно было:

curvature = 0.0;

Результат:
- petals исчезли полностью;
- чёрные контуры исчезли полностью;
- яркая волна/полоса осталась;
- loop discontinuity осталась;
- периоды почти полной темноты остались;
- цвета стали темнее.

Вывод:
Petals и black contours появляются через curvature pipeline.

Но curvature не отвечает за остальные проблемы.

9. CLAMP_MASK

При CURVATURE_VIEW = CLAMP_MASK:
- фон чёрный;
- белыми видны petals/waves;
- хорошо видно формирование petals из точки;
- чёрные контуры пространственно совпадают с финальным артефактом.

Вывод:
пространственный pattern, который становится petals, уже присутствует в curvature field.

10. SCALED_UNCLAMPED

Показал практически ту же геометрию:
- petals;
- contours;
- те же основные структуры.

Края только немного мягче.

Вывод:
clamp не создаёт проблему, а лишь усиливает/фиксирует уже существующую структуру.

11. ABS_DELTA

Показал ту же геометрию petals очень явно.

Вывод:
характерная форма существует ещё до финального scaling/clamp.

12. SIGNED_DELTA

Показал более плавную light/dark структуру.

Petals менее очевидны и менее симметричны.

Вывод:
abs() усиливает и объединяет обе стороны signed curvature, но не является первопричиной.

13. POSITIVE-ONLY CURVATURE

Изначально:

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

Было заменено на:

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

Результат:
- petals не исчезли;
- структура стала несколько мягче;
- стала менее симметричной.

Вывод:
abs() вторичен. Основная проблема возникает раньше, в самом поле, из которого вычисляется curvature.

14. CODEX FORENSIC ANALYSIS

Был проведён forensic analysis shader с трассировкой data path.

Главный вывод:

curvature считается НЕ из rawRelief.

Он считается из уже художественно обработанного reliefValue.

Фактический pipeline:

screen UV
↓
flowEnergy
↓
curlFlow first pass
↓
coordinate advection
↓
curlFlow second pass
↓
advected coordinates
↓
relief phases A/B/C
↓
directional topology deformation
↓
base + mixed + local events + topology breaker
↓
rawRelief
↓
soft saturation
↓
negative-depth compression
↓
processed reliefValue
↓
field / forwardField / backwardField
↓
directional second difference
↓
curvatureStrength
↓
max(signedCurvature, 0)
↓
clamp(curvatureClamp)
↓
High Relief lighting

15. КАК ФОРМИРУЕТСЯ RAW RELIEF

rawRelief состоит из:
- base sin(phases)
- mixed sin(linear combination of phases)
- local event sin functions
- topology breaker

Упрощённо:

base
+
mixed
+
local events
+
topology breaker
=
rawRelief

16. ARTISTIC PROCESSING ПЕРЕД CURVATURE

Сначала soft saturation:

softlySaturated =
  rawRelief /
  (1.0 + reliefSoftSaturation * abs(rawRelief));

Потом negative depth:

negativeDepth =
  max(-softlySaturated - negativeReliefKnee, 0.0);

compressedDepth =
  negativeDepth /
  (1.0 + negativeReliefCompression * negativeDepth);

compressionMix =
  smoothstep(0.0, shadowPenumbra, negativeDepth);

Затем формируется processed reliefValue через mix.

Именно этот processed signal идёт дальше в curvature.

17. ПОЧЕМУ ЭТО ПОДОЗРИТЕЛЬНО

Pipeline:

raw relief
↓
artistic nonlinear transformation
↓
curvature

Нелинейные операции:
- saturation;
- negative depth compression;
- signal-dependent mix.

Second derivative очень чувствителен к локальным нелинейным изменениям.

Гипотеза:
petals могут появляться не из самого relief, а из-за того, что curvature вычисляется после artistic compression/saturation.

18. КАК СЧИТАЕТСЯ CURVATURE

Это не полноценная геометрическая curvature поверхности.

Это directional second difference:

forwardField + backwardField - 2.0 * field

Затем:
- деление на sampleOffset²;
- умножение на curvatureStrength;
- positive-side extraction;
- clamp.

То есть фактически second derivative вдоль lightDirection, а не полноценный Laplacian/geometric curvature.

19. ПАРАМЕТРЫ CURVATURE

По forensic analysis:

curvatureSampleOffset = 0.012
curvatureStrength = 0.32
curvatureClamp = 0.86

curvatureSampleOffset² = 0.000144

Поэтому небольшие различия между field / forwardField / backwardField сильно усиливаются.

20. LIGHT DIRECTION

lightDirection примерно:

(-0.58, -0.82)

Он практически unit vector.

Но на фактический sampling влияют:
- aspect correction;
- coordinate advection;
- directional sampling.

21. NORMALS

surfaceNormal не вычисляется напрямую из gradient relief.

Normals формируются из flow/perpendicular.

То есть система смешивает:
- relief curvature;
- flow-derived normal.

22. CURVATURE ИМЕЕТ МНОГО DOWNSTREAM USES

Curvature влияет на:
- relief/palette luminance;
- cyan highlight;
- contour widths;
- ridge/rim attenuation;
- warm accent eligibility;
- другие элементы High Relief lighting.

Поэтому curvature является high-leverage частью shader.

23. НЕЗАВЕРШЁННЫЙ ЭКСПЕРИМЕНТ СТАРОГО SHADER

Следующий эксперимент:

raw/clean relief
   ├──→ curvature
   │
   └──→ artistic processing → final color

Вместо:

raw relief
↓
artistic processing
↓
processed relief
↓
curvature

Нужно сравнить, исчезнут ли petals.

24. РАЗДЕЛЕНИЕ ПРОБЛЕМ

A. Petals / black contours
Практически локализованы в:

processed relief
↓
directional second difference
↓
curvature

Следующая проверка: curvature от raw/clean relief.

B. Bright band
Не исчезает при curvature = 0.
Искать отдельно:
- relief;
- phase composition;
- directional waves;
- palette;
- direct luminance/highlight pipeline.

C. Loop discontinuity
Остаётся при curvature = 0.
Искать отдельно:
- animation;
- phase;
- flow loop;
- временную параметризацию.

D. Near-black periods
Остаются при curvature = 0.
Искать отдельно:
- palette;
- luminance;
- phase cancellation;
- flow energy;
- временную синхронизацию компонентов.

25. ПОЧЕМУ НАЧАЛИ РАССМАТРИВАТЬ НОВЫЙ SHADER

Старый pipeline стал очень сложным:

flow
→ advection
→ relief
→ topology deformation
→ nonlinear artistic processing
→ curvature
→ normal
→ high-relief lighting
→ palette

Shader постепенно превратился в систему с большим количеством взаимодействующих эффектов.

Возник вопрос:
не проще ли перейти к более прямой математической модели fluid-like field?

26. НОВАЯ РЕФЕРЕНСНАЯ ИДЕЯ: KREA.AI

Референс:
https://www.krea.ai/

Нас заинтересовал визуальный эффект realtime visual field, похожий на чёрную дыру/препятствие, вокруг которого поток огибает объект.

Важно:
- точная реализация Krea не известна;
- публичного подтверждения конкретной shader-реализации этого эффекта не найдено;
- Krea используется только как визуальная/концептуальная референсная точка.

Концептуально новый подход ближе к:

velocity field
↓
distortion / advection
↓
local obstacle / attractor
↓
visualization of field

а не:

flow
↓
relief
↓
curvature
↓
3D lighting

27. НОВЫЙ KREA-INSPIRED PROTOTYPE

Не переписывать сразу текущий shader.

Лучше:
- отдельный prototype;
- отдельный component;
- или feature flag.

Например:

FLOW_FIELD_MODE = 'KREA_FLOW'

Старый Living Surface сохранить.

28. МИНИМАЛЬНАЯ АРХИТЕКТУРА НОВОГО PROTOTYPE

base directional flow
↓
local obstacle / black hole
↓
velocity deflection
↓
coordinate advection
↓
soft bands / warped gradient
↓
soft dark center

Визуально:

→ → → → →
→ → ↗   ↘ → →
→ ↑   ●   ↓ →
→ → ↘   ↗ → →
→ → → → →

29. ПЕРВЫЙ ПРОТОТИП ДОЛЖЕН БЫТЬ ПРОСТЫМ

1. Base directional flow.
2. Один obstacle.
3. Tangential deflection вокруг obstacle.
4. Coordinate advection.
5. Простые sinusoidal bands или warped gradient.
6. Мягкое затемнение в центре.

Пока НЕ добавлять:
- curvature;
- topology breaker;
- High Relief;
- сложные normals;
- negative-depth compression;
- множество local events;
- сложную palette system;
- десятки uniforms.

Сначала проверить саму механику:
velocity field + obstacle + advection.

30. ВАЖНО: НЕ ДЕЛАТЬ PARTICLES

Новая система всё ещё должна ощущаться как:
- continuous fluid-like field;
- waves;
- flowing surface;
- органическое движение.

Не нужна particle animation.

31. ПОЧЕМУ НОВЫЙ ПОДХОД ИМЕЕТ СМЫСЛ

Старый подход:

«поверхность, которая выглядит как жидкий рельеф»

Новый подход:

«поле, которое ведёт себя как поток»

Новый подход всё ещё полностью совместим с текущим стеком:

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

Меняется математическая модель, а не технологический стек.

32. КАК ПРОДОЛЖАТЬ

Вариант A:
Сначала закончить эксперимент старого shader:
rawRelief → curvature
до artistic processing.

Если petals исчезнут, гипотеза подтверждена.

Затем отдельно исследовать bright band / loop jump / dark periods.

Вариант B:
Сразу начать Krea Flow prototype.

Рекомендуемая структура:

UV
↓
base velocity
↓
obstacle velocity field
↓
advected UV
↓
sinusoidal bands
↓
soft black obstacle

После того как базовая динамика будет правильной:
- добавить depth;
- lighting;
- color;
- несколько flow structures.

33. ГЛАВНЫЕ НЕПЕРЕХОДИМЫЕ УСЛОВИЯ

- Не превращать систему в particles.
- Не менять React Native / Expo / Skia stack.
- Старый shader не удалять.
- Curvature доказанно является источником petals/black contours.
- Clamp не является root cause.
- abs() усиливает проблему, но не является root cause.
- topology breaker не является основной причиной.
- ADVECTED_COORDINATES выглядят нормально.
- Bright band, loop discontinuity и dark periods — отдельные проблемы.
- Главная незавершённая гипотеза старого shader: curvature считается от уже нелинейно обработанного relief.
- Новый перспективный путь: velocity field + obstacle + advection.
