# Living Surface Parameter Passport

> Единственный актуальный инженерный источник информации о Living Surface. После каждого изменения shader сначала обновляется код, затем этот документ. Записи из Evolution Log не удаляются; устаревшие параметры переносятся в Deprecated Parameters.

Аудит зафиксирован: **2026-07-18**, preset `livingFlowField`, рабочее дерево после локальных flow-field, deep-shadow и closed-loop итераций. Значения отражают незакоммиченное текущее состояние. Диапазоны ниже — инженерные ориентиры, а не доказанные safe limits; каждое изменение требует длительной проверки на Android.

## Общая архитектура

```text
Reanimated phases
├─ motionPhase (14 s)
└─ compositionPhase (30 s)
        ↓
Analytic curl flow + energy redistribution
        ↓
Two-pass coordinate advection
        ↓
Three cross-coupled relief phases
        ↓
Directional topology skew + distributed contour breaker
        ↓
Scalar relief + secondary events + soft negative compression
        ↓
Material field + central-difference curvature + flow normal
        ↓
Folds / contours / ridge / rim / highlights
        ↓
Palette + screen blend over #09090B-like background
```

Система не содержит wave families, origins, point sources, radial masks, dominant wave или самостоятельных blob-сущностей. Flow вычисляется аналитически, а визуальная форма является следствием advected scalar field.

---

## Parameter Catalog

### Runtime, framing and activity

| Название | Текущее значение / тип | Файл и строка | Используется где → downstream | Прямой визуальный эффект | +20% / −20% | Допустимый ориентир; риск | Появление |
|---|---|---|---|---|---|---|---|
| `LIVING_SURFACE_PRESET` | `livingFlowField`, string literal | `tokens.ts:148`; выбор `ambient-background.tsx:31` | Выбирает весь preset | Меняет всю реализацию параметров | Неприменимо | Только существующий ключ | 2026-07-18, flow-field architecture |
| `resolution` | `Dimensions.get('screen')`, `float2` | `ambient-background.tsx:29-30`, uniform `:34`, use `:223,452` | Aspect normalization, UV, Canvas size | Сохраняет физический масштаб и aspect | +20% без реального resize исказит масштаб; −20% сожмёт координаты | Только фактический screen size | Исходный Skia Canvas |
| `motionPhase` | runtime `0…1`, float | shared value `ambient-background.tsx:722-749`, uniform `:35` | `motionAngle`; flow и relief evolution | Быстрая ambient-фаза | Фазовый сдвиг, не strength | Только циклические `0…1` | Исходная motion system |
| `compositionPhase` | runtime `0…1`, float | `ambient-background.tsx:725-757`, uniform `:36` | Energy, breaker, palette mood, events | Медленная перестройка композиции | Фазовый сдвиг | Только циклические `0…1` | Исходная motion system |
| `verticalActivityZone` | `[0.12, 0.62]`, `float2` | `tokens.ts:152`; uniform `ambient-background.tsx:53`; use `:131-142` | `activity` → все geometry/light masks | Вертикальная зона жизни | +20% сдвигает/расширяет вниз; −20% стягивает вверх | `0≤x<y≤1`; overlap с keyboard composition | High Relief baseline, 2026-07-16 |
| `verticalMaskSoftness` | `0.14`, float | `tokens.ts:153`; uniform `:54`; use `:132-140` | `activity` edge falloff | Мягкость входа/выхода active zone | +20% мягче и шире; −20% заметнее граница | `0.05…0.3`; слишком мало даёт полосу | High Relief baseline |
| `lowerScreenAttenuation` | `0.20`, float | `tokens.ts:228`; uniform `:125`; use `:456,612,705` | `activityLevel` → relief и final light | Остаточная жизнь вне active zone | +20% больше света снизу; −20% спокойнее/темнее низ | `0…0.4`; высокое значение спорит с input | High Relief baseline |

### Flow and advection

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; артефакты | Появление |
|---|---|---|---|---|---|---|---|
| `flowScale` | `[3.4, 2.7]`, `float2` | `tokens.ts:154`; uniform `ambient-background.tsx:55`; `curlFlow :183-207` | Spatial phase и curl amplitude | Размер и анизотропия потоковых ячеек | +20% мельче/активнее изгибы; −20% крупнее/спокойнее | `1…6`; высоко → жилы/частота, низко → большой blob | 2026-07-18 flow field |
| `flowDirectionA` | `[0.82,0.57]`, `float2` | `tokens.ts:155-159`; uniform `:56`; `curlFlow :184-199` | Phase A и curl A | Первое направление течения | +20% magnitude увеличит частоту и вклад; −20% ослабит | Компоненты `[-1,1]`, направления не параллельны | Flow field |
| `flowDirectionB` | `[-0.46,0.89]`, `float2` | `tokens.ts:155-159`; uniform `:57`; `:188-203` | Phase/curl B | Контрнаправление, ломает единый поток | +20% больше поперечной жизни; −20% A начинает доминировать | То же; параллельность A создаёт полосы | Flow field |
| `flowDirectionC` | `[0.97,-0.24]`, `float2` | `tokens.ts:155-159`; uniform `:58`; `:192-207` | Phase/curl C | Третий диагональный компонент | +20% больше локальной вариативности; −20% проще композиция | То же; сильный C может дать жилы | Flow field |
| `flowPhaseOffsets` | `[0.34,2.41,4.79]`, `float3` radians | `tokens.ts:160`; uniform `:59`; `flowEnergy :166-168`, `curlFlow :185-195` | Стартовые фазы flow и energy | Рассинхронизация компонентов | +20% меняет композицию, не силу; −20% может сблизить фазы | Любые radians; близкие offsets → синхронность/лепестки | Flow field |
| `flowEnergyBase` | `[0.42,0.34,0.24]`, `float3` normalized downstream | `tokens.ts:161`; uniform `:60`; `flowEnergy :170-174` | Weights curl и relief strengths | Базовая иерархия направлений | +20% одного канала делает его заметнее; −20% отдаёт энергию другим | Все >0; сумма произвольна из-за normalization | Flow field |
| `flowEnergyVariation` | `0.18`, float | `tokens.ts:162`; uniform `:61`; `flowEnergy :171` | Temporal modulation weights | Насколько энергия мигрирует между направлениями | +20% композиция разнообразнее; −20% стабильнее | `0…0.5`; высоко → исчезновение семейства/цикличность | Flow field |
| `energyRedistributionStrength` | `0.26`, float | `tokens.ts:177`; uniform `:74`; `curlFlow :186-195` | Temporal phase warp curl | Несинхронность движения и медленная смена течения | +20% сильнее перестройка; −20% постояннее траектории | `0…0.6`; высоко → дёрганность/переломы | Flow field |
| `flowCurlStrength` | `0.18`, float | `tokens.ts:163`; uniform `:62`; `curlFlow :208-209` | Curl vector → both advection passes, normals | Сила локального потока | +20% текучее и сильнее деформация; −20% спокойнее/плосче | `0.05…0.35`; высоко → folding/alias-like compression | Flow field |
| `flowAdvection` | `0.22`, float | `tokens.ts:164`; uniform `:63`; `advectedState :232,240-241` | First/second coordinate displacement | Глубина переноса материала | +20% сильнее соединения/разрывы; −20% relief ближе к статичным sin | `0.05…0.4`; вместе с curlStrength может переусилить | Flow field |
| `flowSecondaryAdvection` | `0.62`, float | `tokens.ts:165`; uniform `:64`; `advectedState :241-242` | Second-pass displacement и flow mix | Нелинейность двухступенчатого течения | +20% второй pass заметнее; −20% ближе к одному pass | `0…1`; двойная роль осложняет tuning | Flow field |

### Scalar relief and temporal structure

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; артефакты | Появление |
|---|---|---|---|---|---|---|---|
| `reliefScale` | `[4.8,3.6]`, `float2` | `tokens.ts:166`; uniform `ambient-background.tsx:65`; `reliefPhases :252` | All three relief phases | Масштаб складок | +20% больше/тоньше структур; −20% крупнее формы | `1.5…8`; низко → blob, высоко → жилы/шум | 2026-07-18 flow field |
| `reliefDirectionA` | `[0.91,0.42]`, `float2` | `tokens.ts:167-171`; uniform `:66`; `:253` | Phase A | Направление основной крупной складки | +20% magnitude уменьшает wavelength; −20% укрупняет | Непараллельность обязательна | Flow field |
| `reliefDirectionB` | `[-0.34,0.94]`, `float2` | `tokens.ts:167-171`; uniform `:67`; `:257` | Phase B | Поперечная деформация | +20% больше пересечений; −20% A доминирует | Параллельность A → полосы | Flow field |
| `reliefDirectionC` | `[0.72,-0.69]`, `float2` | `tokens.ts:167-171`; uniform `:68`; `:261` | Phase C | Третий изгиб и локальность | +20% сложнее topology; −20% чище, но беднее | Сильный C → compact extrema | Flow field |
| `reliefFrequencies` | `[1,1.27,0.83]`, `float3` | `tokens.ts:172`; uniform `:69`; `:253-264` | Phase spatial frequency | Несоизмеримость структуры | +20% соответствующего канала мельче; −20% крупнее | `0.4…2`; близкие ratios → повторяемость/лепестки | Flow field |
| `reliefStrengths` | `[0.48,0.33,0.19]`, `float3` | `tokens.ts:173`; uniform `:70`; `reliefValue :317-322` | Weighted scalar relief | Иерархия крупной и secondary складок | +20% канал доминирует; −20% поле равномернее | Все >0; normalized with energy | Flow field |
| `reliefPhaseOffsets` | `[0.2,2.18,4.37]`, `float3` radians | `tokens.ts:174`; uniform `:71`; `:256,260,264` | Relief phase positions | Стартовая композиция | ±20% перестраивает рисунок | Любые radians; совпадение → симметрия | Flow field |
| `reliefCrossCoupling` | `0.28`, float | `tokens.ts:175`; uniform `:72`; `:266-271,323-325` | Phase cross-warp и extra relief term | Материальность, нелинейность, связь складок | +20% живее/сложнее; −20% более синусоидально | `0…0.5`; высоко → extrema, loops, дёрганность | Flow field |
| `reliefEvolutionHarmonics` | `[1,2,3]`, `float3` | `tokens.ts:176`; uniform `:73`; `:255-264` | Motion-angle multiplier per relief phase | Разная temporal скорость каналов | +20% ломает integer loop; −20% тоже | Использовать только целые harmonics для seamless phase | Flow field |
| `rippleSpeed` | `1`, float | `tokens.ts:196`; uniform `:93`; `curlFlow :185,189,193` | Flow temporal frequency only | Скорость curl относительно motionDuration | +20% быстрее течение; −20% медленнее | `0.5…1.5`; нецелое значение ломает loop continuity | Legacy name, reused by flow field |
| `rippleStrength` | `0.055`, float | `tokens.ts:195`; uniform `:92`; `main :598,627` | Field bias in relief and ridge material offset | Насколько scalar relief проявляется в luminance/ridge | +20% больше relief contrast; −20% мягче | `0…0.12`; legacy double duty | High Relief legacy |
| `bandSeparation` | `1.85`, float radians | `tokens.ts:199`; uniform `:96`; `livingField :432-435` | Secondary relief phase | Разнос primary/secondary contours | +20% другая относительная фаза; −20% contours ближе | `0…2π`; не strength | Organic Ripple legacy, adapted |

### Deep-shadow protection and secondary events

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; риск | Появление |
|---|---|---|---|---|---|---|---|
| `reliefSoftSaturation` | `0.06`, float | `tokens.ts:178`; uniform `:75`; `reliefValue :359-360` | Soft saturation all relief | Плавность extrema без plateau | +20% сильнее сжимает всё; −20% больше extrema | `0…0.2`; высоко уплощает | 2026-07-18 black-blob fix |
| `negativeReliefKnee` | `0.52`, float | `tokens.ts:179`; uniform `:76`; `:361-368`, shadow `:599-603` | Start of negative compression and deepShadow | Граница глубоких теней | +20% компрессия включится позже/тени глубже; −20% раньше/плосче | `0.3…0.8` | Black-blob fix |
| `negativeReliefCompression` | `1.8`, float | `tokens.ts:180`; uniform `:77`; `:365-368` | Rational compression negative tail | Насколько минимум остаётся проницаемым | +20% меньше black wells; −20% глубже тени | `0.5…3`; высоко → одинаковые тени | Black-blob fix |
| `shadowPenumbra` | `0.18`, float | `tokens.ts:181`; uniform `:78`; `:370-374,599-603` | Compression transition и deepShadow width | Ширина перехода тени | +20% мягче/шире; −20% резче | `0.05…0.35`; мало → контур | Black-blob fix |
| `shadowPermeability` | `0.72`, float | `tokens.ts:182`; uniform `:79`; `main :604-609` | Softens negative material inside deep relief | Светопроницаемость глубокой тени | +20% меньше чёрного; −20% глубже | `0…1.5`; высоко → серые interiors | Black-blob fix |
| `localDisturbanceStrength` | `0.07`, float | `tokens.ts:183`; uniform `:80`; `reliefValue :343-356` | Adds two enveloped cross-phase events | Слабая локальная жизнь | +20% события заметнее; −20% одна главная складка доминирует | `0…0.15`; высоко → loops/noise | 2026-07-18 local-life iteration |
| `localDisturbancePhaseOffsets` | `[1.37,4.11]`, `float2` | `tokens.ts:184`; uniform `:81`; `:327-342` | Event envelopes | Рассинхронизация событий | ±20% меняет timing, не силу | Любые radians; близость → синхронность | Local-life iteration |
| `localDisturbanceHarmonics` | `[2,3]`, `float2` | `tokens.ts:185`; uniform `:82`; `:330-340` | Composition-phase envelopes | Частота появления событий | +20% нецелое → loop seam; −20% дольше события | Только целые положительные | Local-life iteration |

### Directional topology and closed-contour control

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; риск | Появление |
|---|---|---|---|---|---|---|---|
| `anisotropicPhaseSkew` | `0.18`, float | `tokens.ts:186`; uniform `:83`; `directionalTopology :301` | Tangent skew → all phases/relief | Вытягивает compact minima вдоль flow | +20% меньше кругов, больше жил; −20% больше isotropic minima | `0…0.35`; высоко → черви/полосы | 2026-07-18 closed-loop fix |
| `flowTangentStretch` | `0.22`, float | `tokens.ts:187`; uniform `:84`; `:290-302` | `along` contribution to phase skew | Продолжительность складок вдоль потока | +20% длиннее/открытее; −20% компактнее | `0…0.45`; высоко → capsules/stripes | Closed-loop fix |
| `flowNormalDecorrelation` | `0.13`, float | `tokens.ts:188`; uniform `:85`; `:285-306` | Nonuniform normal offset per phase | Разрушает одинаковую толщину/симметрию | +20% сильнее разрыв; −20% ровнее contours | `0…0.3`; высоко → wobble | Closed-loop fix |
| `contourBreakerStrength` | `0.06`, float | `tokens.ts:189`; uniform `:86`; `:301-302,357` | Phase skew **и** additive relief breaker | Размыкает level sets | +20% больше gaps/локальной жизни; −20% loops вероятнее | `0…0.12`; двойная роль делает чувствительным | Closed-loop fix |
| `contourBreakerScale` | `[2.7,1.1]`, `float2` | `tokens.ts:190`; uniform `:87`; `:285-299` | Along/normal breaker frequencies | Размер и анизотропия gaps | +20% чаще/мельче разрывы; −20% длиннее и реже | `[1…5,0.4…2]`; ratios близки → striping | Closed-loop fix |
| `contourBreakerPhaseOffset` | `2.73`, float radians | `tokens.ts:191`; uniform `:88`; `:285-299` | Normal offset + breaker phase | Расположение gaps | ±20% только меняет композицию | Любые radians | Closed-loop fix |
| `contourBreakerLightingAttenuation` | `0.28`, float | `tokens.ts:192`; uniform `:89`; `main :461-473,577-580,645-646` | `breakerContinuity` → arc/contours/ridge | Насколько lighting разрывается вместе с topology | +20% gaps заметнее; −20% relief разомкнут, но outline может остаться | `0…0.5`; высоко → пунктир | Closed-loop fix |
| `parallelContourSuppression` | `0.38`, float | `tokens.ts:193`; uniform `:90`; `ridgeCore :640-644` | Limits contourA reuse in specular core | Ослабляет двойную линию | +20% сильнее вторая линия; −20% чище single fold | `0…1`; 0 удаляет reuse | Double-line fix, 2026-07-18 |
| `parallelContourOffsetVariation` | `0.14`, float | `tokens.ts:194`; uniform `:91`; `contourA :553-562` | Moves contourA target with breaker | Делает расстояние между линиями неравномерным | +20% меньше параллельности, больше wobble; −20% ровнее double line | `0…0.3`; высоко → contour collisions | Double-line fix |

### Curvature, folds and contour geometry

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; риск | Появление |
|---|---|---|---|---|---|---|---|
| `frontWidthVariation` | `0.28`, float | `tokens.ts:197`; uniform `ambient-background.tsx:94`; `widthFactor :517-525` | Material/normal/curvature → contour widths | Неравномерность толщины folds | +20% органичнее, но резче width changes; −20% ровнее/UI-like | `0…0.5`; высоко → thin lines | Organic Ripple / High Relief |
| `visibilityVariation` | `0.55`, float | `tokens.ts:198`; uniform `:95`; `primary/secondaryVisibility :529-543` | Material visibility → contourA/B | Частичность видимых contours | +20% больше растворённых сегментов; −20% contours непрерывнее | `0…0.8`; высоко → flicker/gaps | Organic Ripple |
| `distributedVisibilityVariation` | `0.58`, float | `tokens.ts:201`; uniform `:98`; `:526-532` | Difference `field-secondaryField` into visibility | Распределение видимости между folds | +20% контрастнее сегментация; −20% material доминирует | `0…1`; высоко → popping | Distributed Ripple legacy, adapted |
| `minimumFoldWidth` | `0.18`, float | `tokens.ts:202`; uniform `:99`; `contourInner :545-570` | Minimum contour inner widths | Запрет игольчатых folds | +20% толще/мягче; −20% тоньше/детальнее | `0.08…0.3`; низко → digital lines | Singularity/tip fix, 2026-07-16 |
| `tipSoftness` | `0.22`, float | `tokens.ts:203`; uniform `:100`; `curvatureRisk :501-507`, contour outer widths | Tip attenuation и contour penumbra | Мягкость напряжённых концов | +20% мягче/шире; −20% острее | `0.08…0.35`; двойная роль | High Relief tip fix |
| `tipContrastAttenuation` | `0.56`, float | `tokens.ts:204`; uniform `:101`; `tipSafety :506-507` | Reduces extreme-curvature contrast | Защита от игольчатых highlights | +20% безопаснее/плосче peaks; −20% ярче/острее | `0…1`; high → потеря tension | High Relief tip fix |
| `curvatureClamp` | `0.86`, float | `tokens.ts:205`; uniform `:102`; `curvature :488-504` | Max curvature and risk threshold | Peak relief ceiling | +20% ярче extreme bends; −20% мягче | `0.4…1.2`; high → clipping/bright points | High Relief |
| `darkFoldContinuity` | `0.78`, float | `tokens.ts:206`; uniform `:103`; `foldSafety :591-596` | Mixes tipSafety back toward 1 for folds | Сохранение длинных тёмных folds | +20% folds непрерывнее; −20% сильнее распадаются | `0…1`; high может вернуть closed outline | Tip/continuity fix |
| `foldStrength` | `0.42`, float | `tokens.ts:207`; uniform `:104`; `fold :582-596`, material offset indirectly | Сила fold contribution into ridge | Выразительность ткани/складки | +20% folds сильнее; −20% поверхность мягче | `0.15…0.7`; high → жилы | High Relief |
| `foldSoftness` | `[0.055,0.32]`, `float2` | `tokens.ts:208`; uniform `:105`; `primaryArc :468-473` | Inner/outer smoothstep of field≈0 | Ширина базовой складки | +20% шире/мягче; −20% уже/контрастнее | `x<y`, x `0.02…0.15`, y `0.15…0.5` | High Relief |
| `curvatureSampleOffset` | `0.012`, float UV | `tokens.ts:209`; uniform `:106`; samples `:474-497` | Finite-difference baseline | Пространственный масштаб curvature | +20% broader curvature, less micro detail; −20% sharper/noisier derivative | `0.006…0.025`; too low precision risk | High Relief |
| `curvatureStrength` | `0.32`, float | `tokens.ts:210`; uniform `:107`; `:485-493` | Scales second derivative | Объём и tension lighting | +20% рельефнее; −20% мягче/blurrier | `0.1…0.6`; high → contour emphasis | High Relief |
| `surfaceFlowStrength` | `0.72`, float | `tokens.ts:211`; uniform `:108`; material coordinates `:436-439` | Flow offset in material field | Насколько texture следует течению | +20% жидче/подвижнее texture; −20% texture статичнее | `0…1.2`; high → smeared material | High Relief / flow adaptation |
| `foldAlignmentStrength` | `0.82`, float | `tokens.ts:200`; uniform `:97`; `foldGeometry :582-590`, ridgeCore | Blend base arc with contour folds | Согласованность folds и relief bands | +20% (clamp conceptually at 1) contours доминируют; −20% base arc сильнее | `0…1`; high can duplicate contour | Organic Ripple |
| `contourSoftness` | `[0.20,0.68]`, `float2` | `tokens.ts:220`; uniform `:117`; `contourA/B :545-576` | Inner/outer contour transitions | Толщина и penumbra secondary bands | +20% шире/мягче; −20% тоньше/графичнее | `x<y`; high y overlaps folds | High Relief |

### Lighting and color response

| Название | Значение / тип | Файл и строка | Используется где → downstream | Визуально | +20% / −20% | Диапазон; риск | Появление |
|---|---|---|---|---|---|---|---|
| `baseBodyLuminance` | `0.34`, float | `tokens.ts:212`; uniform `ambient-background.tsx:109`; `luminousColor :676-678` | Base multiplier palette body | Общая видимость поверхности | +20% светлее всё body; −20% глубже/может исчезнуть | `0.2…0.5`; глобальная ручка | High Relief |
| `midtoneStrength` | `0.28`, float | `tokens.ts:213`; uniform `:110`; `relief :610`, luminous multiplier `:677` | Curvature into relief and surfaceBody midtone | Средний объём | +20% больше cobalt/cyan relief; −20% глубже body | `0.1…0.5`; high compresses hierarchy | High Relief |
| `highlightStrength` | `0.82`, float | `tokens.ts:214`; uniform `:111`; lavender ridge `:681-682` | Ridge highlight amplitude | Яркость гребней | +20% выразительнее/неон; −20% спокойнее | `0.4…1.2`; high → UI outline | High Relief |
| `ridgeWidth` | `0.26`, float | `tokens.ts:215`; uniform `:112`; `ridge :626-633` | Broad field≈0 ridge | Ширина светового гребня | +20% шире/мягче; −20% тоньше | `0.1…0.45`; broad may outline blobs | High Relief |
| `ridgeCoreWidth` | `0.075`, float | `tokens.ts:216`; uniform `:113`; `ridgeCore :634-644` | Narrow specular core | Тонкая tension line | +20% шире/видимее; −20% тоньше/может мерцать | `0.03…0.15`; low → digital line | High Relief |
| `rimStrength` | `0.48`, float | `tokens.ts:217`; uniform `:114`; `rim :654-660`, accents | Directional edge-like highlight | Ощущение объёма и ткани | +20% сильнее дуги; −20% меньше отделение формы | `0.15…0.8`; high → object boundary | High Relief |
| `rimBreakup` | `0.42`, float | `tokens.ts:218`; uniform `:115`; `materialBreakup :654-658` | Material modulation of rim | Непрерывность rim | +20% больше разрывов; −20% ровнее rim | `0…0.8`; low → closed outline | High Relief |
| `rippleBandStrength` | `0.24`, float | `tokens.ts:219`; uniform `:116`; contour color `:683-693` | Cyan contour and saturation response | Видимость secondary relief | +20% больше bands; −20% спокойнее | `0…0.5`; legacy name, high → rings | High Relief legacy |
| `lightDirection` | `[-0.58,-0.82]`, `float2` | `tokens.ts:221`; uniform `:118`; curvature offset `:474`, directional light `:648` | Derivative axis and illumination direction | Направление света/теневой стороны | +20% magnitude enlarges derivative offset effectively only through offset product; −20% слабее sample baseline | Лучше normalized; rotation more meaningful than scaling | High Relief |
| `cyanHighlightStrength` | `0.34`, float | `tokens.ts:222`; uniform `:119`; `:679-680` | Curvature pale-cyan contribution | Холодный объём | +20% ярче curvature; −20% темнее folds | `0…0.7`; high → cyan wash | High Relief |
| `whiteHighlightStrength` | `0.40`, float | `tokens.ts:223`; uniform `:120`; `:695-698` | Neutral ridgeCore + lavender rim | Peak specular | +20% дороже/ярче; −20% мягче | `0…0.8`; high → blown whites | High Relief |
| `yellowAccentStrength` | `0.12`, float | `tokens.ts:224`; uniform `:121`; `rareAccent :700-701` | Rare pale-yellow/green accent | Редкая тёплая искра | +20% заметнее; −20% холоднее | `0…0.25`; high → neon/oil effect | High Relief palette |
| `accentAreaLimit` | `0.90`, float | `tokens.ts:225`; uniform `:122`; `accentArea :662-664` | Threshold for warm accents | Площадь редких акцентов | +20% >1 почти отключит; −20% резко расширит | `0.65…0.98`; обратная чувствительность | High Relief palette |
| `surfaceSaturation` | `1.08`, float | `tokens.ts:226`; uniform `:123`; `fieldColor :616-624` | Mix from luminance to palette | Общая насыщенность поверхности | +20% ярче hues; −20% спокойнее/серее | `0.7…1.3`; high → oil/rainbow | High Relief palette |
| `warmAccentStrength` | `0.08`, float | `tokens.ts:227`; uniform `:124`; `fieldColor :665-674` | Peach/coral/rose mix | Тёплые локальные accents | +20% заметнее; −20% холоднее | `0…0.2`; high → palette drift | High Relief palette |

### Palette uniforms

Все значения — linear-like RGB tuples `float3` из `visual.livingSurface`, `tokens.ts:248-265`, передаются в uniforms `ambient-background.tsx:769-784`. Допустимый компонентный диапазон — `0…1`. Изменение на ±20% означает изменение RGB-компонентов с ограничением до `0…1`, а не hue-aware коррекцию.

| Параметр | Значение | Shader use | Прямой эффект; +20% / −20% | Downstream и риск | Появление |
|---|---|---|---|---|---|
| `backgroundColor` | `[0.035,0.035,0.043]` | Screen blend `:703-705` | +20% светлее весь экран; −20% ближе к black | Все цвета; слишком светло теряет depth | Dark-first baseline |
| `deepNavy` | `[0.035,0.075,0.20]` | shadow palette `:151-161` | +20% читаемее shadow; −20% black-well risk | Body shadows | High Relief palette |
| `indigo` | `[0.18,0.16,0.56]` | shadow mix | +20% violet shadows; −20% navy dominates | Shadow hue hierarchy | High Relief palette |
| `cobalt` | `[0.08,0.36,0.82]` | body mix | +20% vivid blue; −20% darker mids | Main mid relief | High Relief palette |
| `violet` | `[0.48,0.31,0.76]` | body mix | +20% violet presence; −20% cobalt dominates | Mid relief | High Relief palette |
| `cyan` | `[0.18,0.62,0.72]` | highlight palette | +20% brighter cool relief; −20% teal dominates | Broad highlights | High Relief palette |
| `teal` | `[0.04,0.38,0.42]` | highlight mix | +20% greener/deeper; −20% cyan dominates | Highlight mood | High Relief palette |
| `lavender` | `[0.56,0.48,0.82]` | body mood mix | +20% softer/lighter body; −20% harder cobalt-violet | Composition mood | High Relief palette |
| `paleCyan` | `[0.62,0.90,0.96]` | curvature + contourA | +20% clips toward white; −20% less luminous curvature | High-curvature peaks | High Relief palette |
| `lavenderWhite` | `[0.86,0.82,0.98]` | ridge + rim | +20% clips/white; −20% calmer folds | Specular relief | High Relief palette |
| `neutralWhite` | `[0.94,0.95,0.97]` | ridgeCore | +20% no meaningful headroom; −20% softer cores | Peak highlight | High Relief palette |
| `paleYellow` | `[0.94,0.88,0.58]` | rare accent mix | +20% clipping; −20% subdued warmth | Accent only | High Relief palette |
| `neonYellowGreen` | `[0.66,0.90,0.28]` | 16% of rare accent | +20% more neon; −20% less green | Oil/neon risk | High Relief palette |
| `mutedPeach` | `[0.74,0.42,0.34]` | warmColor base | +20% warmer/lighter; −20% deeper | Rare accent | High Relief palette |
| `coral` | `[0.74,0.28,0.30]` | warmColor mix | +20% stronger coral; −20% rose/peach dominate | Rare accent | High Relief palette |
| `rose` | `[0.58,0.25,0.44]` | warmColor mix | +20% magenta presence; −20% coral dominates | Rare accent | High Relief palette |

### Animation and reduced motion

| Название | Значение / тип | Файл и строка | Используется где | Визуально | +20% / −20% | Риск | Появление |
|---|---|---|---|---|---|---|---|
| `motionDuration` | `14000 ms`, integer | `tokens.ts:229`; `ambient-background.tsx:742-749` | Linear `motionPhase 0→1` | Основная скорость flow/relief | +20% медленнее; −20% быстрее | С `compositionDuration` задаёт общий repeat | Living Light motion baseline |
| `compositionDuration` | `30000 ms`, integer | `tokens.ts:230`; `ambient-background.tsx:750-757` | Linear `compositionPhase 0→1` | Скорость energy/mood/breaker/events | +20% медленнее перестройка; −20% заметнее цикличность | Combined loop currently LCM 210 s | Living Light motion baseline |
| `reducedMotionPhase` | `0.31`, float | `tokens.ts:231`; shared init/use `:722-736` | Fixed motion phase when reduced motion | Статичный relief state | ±20% выбирает другой still frame | `0…1`; проверить отсутствие loop/blob | Accessibility baseline |
| `reducedCompositionPhase` | `0.18`, float | `tokens.ts:232`; `ambient-background.tsx:725-736` | Fixed composition state | Static energy/palette/breaker | ±20% меняет static composition | `0…1`; pair must be visually safe | Accessibility baseline |

### Computed parameters and state

Эти величины не имеют собственного preset-значения, но являются полноценными узлами pipeline. Строки относятся к `src/components/ambient-background.tsx`.

| Вычисляемая величина | Тип / формула | Строки | Получает | Передаёт дальше | Визуальное значение и риск |
|---|---|---|---|---|---|
| `motionAngle` | float, `motionPhase·2π` | `453` | motionPhase | curl phases, relief phases | Непрерывная быстрая фаза; нецелые harmonics создадут seam |
| `compositionAngle` | float, `compositionPhase·2π` | `454` | compositionPhase | energy, topology, events, palette | Медленная композиционная фаза |
| `activity` | float `0…1` | `131-142`, `455` | zone, softness, UV.y | geometry/light masks | Ограничивает активную область; резкий mask выглядит полосой |
| `activityLevel` | float | `456` | activity, lowerScreenAttenuation | ripple, relief mix, final blend | Сохраняет слабый свет вне active zone |
| `flow modulation` | float3 sin harmonics | `164-169` | compositionAngle, offsets | `energy` | Перераспределяет внимание между curl components |
| `energy` | normalized float3 | `170-174` | base weights, variation | curl A/B/C, relief strengths | Сумма всегда 1; может скрывать абсолютное увеличение всех base weights |
| `flow phase A/B/C` | three floats | `183-195` | scaled point, directions, motion, composition | curl A/B/C | Пространственно-временные фазы curl field |
| `curlA/B/C` | three float2 | `196-207` | phase cosines, directions, scale | weighted `flow` | Локальные divergence-free-like components |
| `point` | aspect-corrected float2 | `223-224` | UV, resolution | first pass | Базовые screen coordinates; y-shift 0.38 задаёт framing |
| `firstFlow` | float2 | `226-231` | point, energy | `firstPass`, final flow | Первый flow sample |
| `firstPass` | float2 | `232` | point, flowAdvection | second flow | Первая coordinate advection |
| `secondFlow` | float2 | `233-238` | firstPass, phase-shifted curl | final point/flow | Добавляет нелинейность без loop in shader code |
| `AdvectedState.point` | float2 | `240-241` | firstPass, secondFlow, advection | relief/material/topology | Главные material coordinates |
| `AdvectedState.flow` | float2 mix | `242` | firstFlow, secondFlow | tangent/normal, material | Локальное направление среды |
| `reliefPoint` | float2 | `252` | advected point, reliefScale | phase A/B/C | Пространственный масштаб scalar relief |
| `phaseA/B/C` | float3 | `253-271` | relief directions/frequencies/offsets, motion, cross-coupling | directional topology | Три несоизмеримых relief basis fields |
| `flowLength` | float | `280` | local flow | tangent normalization | Около stagnation point направление становится чувствительным |
| `tangent`, `normal` | float2 | `281-282` | flow | along/across, lighting | Локальная система координат без fixed screen direction |
| `along`, `across` | floats | `283-284` | advected point, tangent/normal | topology skew/breaker | Проекции материала вдоль/поперёк течения |
| `normalOffset` | float | `285-289` | across, composition, breaker params | tangentSkew, per-phase decorrelation | Ломает равномерную толщину; избыток даёт wobble |
| `tangentSkew` | float | `290-291` | along stretch + normalOffset | phaseSkew | Вытягивает minima вдоль потока |
| `breakerPhase` | float | `292-299` | along/across, local direction, composition | breaker | Нерадиальная распределённая фаза |
| `topologyBreaker` | float `[-1,1]` | `300`, state `405,446` | breakerPhase | phase skew, relief, contour target, lighting continuity | Размыкает level sets; слишком силён создаёт собственный pattern |
| `phaseSkew` | float | `301-307` | tangentSkew, breaker | modified phase A/B/C | Анизотропная topology до relief |
| `weightedStrength` | float3 | `317` | reliefStrengths, energy | rawRelief | Локальные веса relief channels |
| `strengthTotal` | float | `318-321` | weightedStrength | normalization | Защищает absolute amplitude от sum changes |
| `rawRelief` | float | `322-357` | phases, coupling, events, breaker | soft saturation | Главный unconstrained scalar field; источник extrema |
| `localEnvelopeA/B` | floats `0…1` | `327-342` | composition phase, event harmonics/offsets | local events | Временная видимость secondary events |
| `localEventA/B` | floats | `343-348` | cross-combinations of phases | rawRelief | Локальная жизнь; correlation может создавать compact minima |
| `localNormalization` | float | `349-356` | event envelopes | event amplitude | Не даёт двум событиям линейно удвоить strength |
| `softlySaturated` | float | `359-360` | rawRelief, soft saturation | negative-tail logic | Smooth global extreme compression |
| `negativeDepth` | float ≥0 | `361-364` | softlySaturated, knee | compressedDepth, mix | Насколько relief глубже negative knee |
| `compressedDepth` | float | `365-366` | negativeDepth, compression | compressedNegative | Rational, без hard plateau |
| `compressionMix` | float | `370-375` | negativeDepth, penumbra | final scalar relief | Плавное включение black-well protection |
| `FieldState.relief` / `field` | float | `425-448`, `458` | topology-aware reliefValue | curvature, body, contours, palette | Итоговая topology поверхности |
| `secondaryRelief` | float | `432-435` | modified phases, bandSeparation | contourB, visibility | Secondary band; способен создать соседние level sets |
| `material` | float | `145-149`, `436-440` | advected point, flow, composition | width, visibility, palette, rim | Текстурная вариативность без texture asset |
| `breakerContinuity` | float `0.72…1` current | `461-465` | breaker, lighting attenuation | arc, contours, ridge | Мягкие gaps в lighting, не binary mask |
| `surfaceBody` | float | `467` | field, activity | relief/luminance | Body occupancy response; steep thresholds make objects readable |
| `primaryArc` | float | `468-473` | abs(field), fold softness, breaker | folds/rim | Базовый field≈0 fold |
| `forwardField`, `backwardField` | floats | `474-484` | neighboring sampleRelief | curvature/slope | Два дополнительных full flow+relief evaluations |
| `curvatureDelta` | float | `485-487` | neighbor/center field | curvature | Directional second difference |
| `curvature` | float | `488-494` | delta, offset, strength, clamp | relief, width, highlights, accents | Главный High Relief volume channel |
| `directionalSlope` | float | `495-500` | forward-backward difference | directionalLight | Теневая/светлая сторона along light axis |
| `curvatureRisk` | float | `501-505` | curvature, clamp, softness | tipSafety, contour width | Выделяет extreme curvature |
| `tipSafety` | float | `506-507` | risk, attenuation | contours/folds/ridge/rim | Локально смягчает острые tips |
| `surfaceTangent`, `surfaceNormal` | float2 | `509-515` | flow | width, directional light | Flow-derived orientation, не true gradient normal |
| `localDirection` | float | `516` | surfaceNormal, lightDirection | widthFactor | Анизотропная ширина folds |
| `widthFactor` | float | `517-525` | material, normal, curvature, width variation | contour widths | Изменяет толщину вдоль поверхности |
| `distributedVisibility` | float | `526-528` | field-secondary field | visibilityBase | Разводит видимость двух contour channels |
| `visibilityBase` | float | `529-533` | material + distributed visibility | primary/secondary visibility | Material-controlled continuity |
| `primaryVisibility`, `secondaryVisibility` | floats | `534-543` | visibilityBase, variation | contourA/B | Сегментация folds |
| `contourInner/Outer A/B` | floats | `545-576` | widths, softness, tip risk | contourA/B | Толщина и penumbra bands |
| `contourA` | float | `553-562,577-578` | field, breaker-shifted target, visibility | folds, ridgeCore, cyan highlight | Второй level set; источник double-line risk |
| `contourB` | float | `572-580` | secondaryRelief, visibility | folds, saturation | Secondary saturation/fold channel |
| `rippleAlignedFold` | float | `582-585` | primaryArc, contours | foldGeometry | Soft union fold channels |
| `foldGeometry` | float | `586-590` | arc vs aligned fold | fold | Какая geometry определяет складку |
| `foldSafety`, `fold` | floats | `591-596` | tip safety, continuity, strength | ridge | Сохраняет fold, attenuates tips |
| `deepShadow` | float | `599-603` | negative field, knee, penumbra | permeableMaterial | Локализует shadow protection |
| `permeableMaterial` | float | `604-609` | material, deepShadow, permeability | scalar lighting relief | Предотвращает двойное blackening |
| lighting `relief` | float | `607-612` | body, material, curvature, ripple | palette | Не topology field; luminance-control scalar |
| `colorMood` | float | `614` | compositionAngle | palette/warm color | Медленный hue mood |
| `fieldColor` | float3 | `615-624,665-674` | palette, saturation, accent | luminousColor | Base semantic color |
| `variableDistance` | float | `626-628` | field + material offset | ridge/core | Смещённый field≈0 distance; может дублировать primaryArc |
| `ridge`, `ridgeCore` | floats | `629-646` | variableDistance, fold, contourA, breaker | white/lavender highlights | Broad and narrow specular folds |
| `directionalLight` | float | `648-653` | flow normal, light direction, slope | ridgeCore | Направленность peak light |
| `materialBreakup` | float | `654-658` | material, rimBreakup | rim | Разрывает равномерный rim |
| `rim` | float | `659-660` | arc, light, material, activity, tip | lavender highlight, accent | Edge-like volume; high values create object outline |
| `warmEnvelope` | float | `662` | composition phase | accentSeed | Редкое temporal окно warm accent |
| `accentSeed`, `accentArea` | floats | `663-664` | ridgeCore, curvature/rim, threshold | warm/rare accents | Ограничивает площадь тёплого/жёлтого |
| `luminousColor` | float3 | `676-701` | body, curvature, ridge, contours, accents | final blend | Сумма всех световых вкладов |
| `finalColor` | float3 | `703-707` | background, luminousColor, activityLevel | fragment output | Screen-like blend; последний clamp |

### Embedded shader constants not yet tokenized

Это реальные управляющие коэффициенты. Они не имеют записи в preset и потому являются скрытыми параметрами/техническим долгом.

| Константа / группа | Значение | Строки | Назначение | Риск / кандидат на tokenization |
|---|---|---|---|---|
| Coordinate framing Y | `uv.y - 0.38` | `224` | Вертикальный origin математических координат | Влияет на композицию как скрытая scale/position ручка |
| Second-pass phase offsets | `π/3`, `2π/3` | `235-236` | Рассинхронизирует второй curl sample | Может формировать узнаваемую repeat geometry |
| Flow temporal harmonics | `1, -2, 3` | `185-195` | Скорости curl A/B/C | Дублирует relief harmonics concept |
| Flow energy floor | `0.02` | `172` | Не даёт каналу исчезнуть | Скрытый minimum contribution |
| Relief cross frequencies | `0.43, 0.37, 0.31` | `266-271` | A←B, B←C, C←A coupling | Главный источник complex extrema; стоит вынести |
| Relief C coupling multiplier | `0.72` | `271` | Ослабляет обратную связь C | Скрытая channel strength |
| Breaker internal ratios | `0.37, 0.63, 0.28` | `294-297` | Нелинейная along/across phase | Влияют на striping, не видны в preset |
| Per-phase skew weights | `[1,-0.61,0.37]` plus normal `[0,0.52,-0.34]` | `303-307` | Неодинаково меняют phases | Критичны для topology; высокий приоритет tokenization |
| Relief extra-term weights | `[0.58,-0.42,0.24]`, multiplier `0.26` | `323-325` | Четвёртый cross-relief channel | Может создавать compact minima |
| Event envelope thresholds | A `.18/.78`, B `.22/.82` | `327-342` | Emergence/decay events | Определяют lifetime, скрыты от preset |
| Event phase mixes | A `[.47,.31,-.19]`, B `[.17,.39,-.53]` | `343-348` | Spatial form secondary events | Возможный источник blobs/жил |
| Global surfaceBody thresholds | `-0.82, 0.78` | `467` | Field→body response | Главный object-readability contrast; стоит вынести |
| Arc breaker mix | `0.56` | `473` | Сколько breaker attenuates primaryArc | Конфликтует с lighting attenuation parameter |
| Curvature tip multiplier | `0.18` | `507` | Реальная сила tipContrastAttenuation | Делает публичный параметр слабее ожидаемого |
| Width mix coefficients | material `.48`, normal `.24`, curvature `.28`; clamp `.68…1.34` | `517-525` | WidthFactor | Определяют ткань/линию, скрыты |
| Visibility thresholds/mixes | `-.82/.82`, `.62/.38`, `.74` | `529-543` | Segment visibility | Возможны popping и duplication |
| Contour target A/B | `+0.48`, `-0.42` | `557-560,575` | Два level-set центра | Прямая причина nested/double contours |
| Fold union weights | contourA `.52`, contourB `.30` | `582-585` | Secondary fold participation | Дублируют rippleBandStrength role |
| Deep-light formula | base `.30`, body `.24`, material `.16`, ripple `.12`, inactive `.34` | `607-612` | Luminance relief | Главная скрытая value hierarchy |
| Palette thresholds | `.16/.62/.96` and mood coefficients | `151-161` | Shadow→body→highlight interpolation | Тонально очень чувствительны, не tokenized |
| Ridge internal ratios | broad `.38`, core `.32`, fold `.34`, contour `.16` | `629-644` | Shape/width of specular channels | Double-response risk |
| Directional light weights | normal `.35`, slope `.15`, base `.5` | `648-653` | Diffuse/specular direction | Flow normal dominates, not true relief normal |
| Warm timing | offset `4.56`, power `6` | `662` | Rare accent envelope | Controls rarity independently of preset |
| Color luminance coefficients | Rec.709 `[.2126,.7152,.0722]` | `616-619,686-689` | Saturation-preserving conversion | Standard; should remain constant |
| Final luminous clamp | `0…0.94` | `705` | Prevents full white | Hard output ceiling, not relief topology clamp |

---

## Pipeline Map

### 1. Temporal drivers

**Inputs:** `motionDuration`, `compositionDuration`, reduced-motion phases.
**Computes:** two independent linear phases and angles.
**Passes:** `motionAngle` to curl/relief; `compositionAngle` to energy, coupling, topology, events, palette and accents.
**Visual result:** 14-second local evolution inside a 30-second compositional evolution; their exact joint repeat is 210 seconds.

### 2. Activity framing

**Inputs:** `verticalActivityZone`, `verticalMaskSoftness`, `lowerScreenAttenuation`.
**Computes:** `activity`, `activityLevel`.
**Passes:** masks to geometry, folds, highlights and final blend.
**Visual result:** active upper/middle atmosphere and quiet lower screen.

### 3. Flow energy

**Inputs:** `flowEnergyBase`, `flowEnergyVariation`, `flowPhaseOffsets`, `compositionAngle`.
**Computes:** normalized float3 `energy`.
**Passes:** weights to curl components and scalar relief channels.
**Visual result:** energy migrates between directions without turning components into objects.

### 4. Analytic curl flow

**Inputs:** `flowScale`, three flow directions, phase offsets, `rippleSpeed`, `energyRedistributionStrength`, `flowCurlStrength`, phases.
**Computes:** three analytic curl-like vectors and their weighted sum.
**Passes:** local vector to both advection passes and flow-derived normal.
**Visual result:** continuous local current without point sources or radial expansion.

### 5. Two-pass advection

**Inputs:** flow, `flowAdvection`, `flowSecondaryAdvection`, fixed second-pass offsets.
**Computes:** `firstPass`, `secondFlow`, final advected coordinates and mixed flow.
**Passes:** advected coordinates to relief/material; flow to topology/lighting.
**Visual result:** material stretches and reconnects rather than translating as a rigid gradient.

### 6. Base scalar phases

**Inputs:** `reliefScale`, directions, frequencies, offsets, evolution harmonics, `reliefCrossCoupling`.
**Computes:** cross-coupled `phaseA/B/C`.
**Passes:** phases to topology, raw relief, local events and secondary relief.
**Visual result:** large fold plus weaker nonparallel structures; excessive correlation creates blobs/petals.

### 7. Directional topology

**Inputs:** advected point/flow, `anisotropicPhaseSkew`, tangent stretch, normal decorrelation, breaker parameters.
**Computes:** tangent/normal frame, along/across coordinates, phase skew and `topologyBreaker`.
**Passes:** modified phases and breaker to scalar relief; breaker to contour lighting.
**Visual result:** compact minima are elongated and locally opened without circle detection.

### 8. Scalar relief and secondary events

**Inputs:** modified phases, relief strengths, energy, coupling, local disturbance parameters, breaker.
**Computes:** `rawRelief`, two event envelopes/events and normalized event mix.
**Passes:** raw scalar to soft saturation.
**Visual result:** primary material relief plus low-amplitude temporary bends.

### 9. Negative-tail shaping

**Inputs:** soft saturation, knee, compression, penumbra.
**Computes:** softly saturated relief and asymmetric compressed negative tail.
**Passes:** final `field` to all geometry and lighting.
**Visual result:** deep navy shadows remain, but no hard black plateau.

### 10. Material and secondary relief

**Inputs:** advected point, flow, `surfaceFlowStrength`, composition phase, `bandSeparation`.
**Computes:** procedural `material` and `secondaryRelief`.
**Passes:** width, visibility, contours, palette, rim.
**Visual result:** texture and secondary folds do not require bitmap/noise assets.

### 11. Curvature and flow normal

**Inputs:** center/forward/backward field samples, `curvatureSampleOffset`, strength/clamp, flow vector, `lightDirection`.
**Computes:** directional second derivative, slope, tangent, normal, tip risk/safety.
**Passes:** width, relief, ridge, rim and highlights.
**Visual result:** High Relief volume and light-facing tension.

### 12. Folds and contours

**Inputs:** field, secondary field, material, visibility parameters, width parameters, breaker, fold settings.
**Computes:** `primaryArc`, `contourA/B`, fold union and safety.
**Passes:** fold to ridge; contours to color/saturation.
**Visual result:** long folds, partial bands and local gaps. Nested level sets remain the main double-line risk.

### 13. Lighting relief

**Inputs:** body response, permeable material, curvature, ripple strength, luminance controls.
**Computes:** scalar lighting `relief`, palette color and saturation.
**Passes:** color to luminous accumulation.
**Visual result:** dark body → saturated midtone → bright highlight hierarchy.

### 14. Ridge, rim and accents

**Inputs:** field/material distance, folds, contours, breaker continuity, widths, light direction, curvature, accent parameters.
**Computes:** broad ridge, core, rim, warm and rare accent masks.
**Passes:** additive light contributions.
**Visual result:** specular tension, pale-cyan curvature and rare warm highlights.

### 15. Final color

**Inputs:** background, luminous color, activity.
**Computes:** screen-like blend and final clamp.
**Visual result:** dark-first atmospheric surface behind UI.

---

## Dependency Graph

```text
motionDuration ──> motionPhase ──> motionAngle
                                   ├─> curl phases <─ rippleSpeed
                                   └─> relief phases <─ reliefEvolutionHarmonics

compositionDuration ─> compositionPhase ─> compositionAngle
                                            ├─> flowEnergy
                                            ├─> flow phase redistribution
                                            ├─> cross-coupling
                                            ├─> local event envelopes
                                            ├─> topology breaker
                                            └─> palette/accent mood

flowScale + flowDirections + flowPhaseOffsets
                   ↓
flowEnergyBase + flowEnergyVariation ─> curlFlow × flowCurlStrength
                                                    ↓
flowAdvection + flowSecondaryAdvection ───────> advectedPoint + localFlow
                                                    ↓
reliefScale + reliefDirections + reliefFrequencies + reliefPhaseOffsets
                                                    ↓
reliefCrossCoupling + reliefStrengths + energy ─> rawRelief
localDisturbance* ────────────────────────────────┘

localFlow + advectedPoint
    └─> anisotropicPhaseSkew + flowTangentStretch + flowNormalDecorrelation
          + contourBreaker* ─> topology-aware phases ─> rawRelief

rawRelief
    └─> reliefSoftSaturation
          └─> negativeReliefKnee + negativeReliefCompression + shadowPenumbra
                └─> field

field + neighbor fields
    └─> curvatureSampleOffset + curvatureStrength + curvatureClamp
          └─> curvature + tipSafety

field + secondaryRelief + material + breakerContinuity
    └─> visibility/width/contour/fold parameters
          ├─> contourA/B
          └─> fold

field + material ─> ridgeWidth/ridgeCoreWidth
contourA + parallelContourSuppression ─> ridgeCore
breakerLightingAttenuation ─> arc/contours/ridge continuity

curvature + ridge + rim + body
    └─> luminance/highlight parameters + palette
          └─> luminousColor + accents
                └─> backgroundColor + activityLevel ─> finalColor
```

### Important parameter interactions

| Связь | Совместный результат | Failure mode |
|---|---|---|
| `flowCurlStrength × flowAdvection` | Фактическая глубина first-pass coordinate deformation | Оба +20% дают примерно +44% displacement, возможны compressed cells |
| `flowCurlStrength × flowAdvection × flowSecondaryAdvection` | Нелинейность two-pass flow | Слишком высоко — tangled veins; низко — moving gradient |
| `motionDuration + rippleSpeed + reliefEvolutionHarmonics` | Воспринимаемая скорость flow и relief | Flow и relief могут визуально рассинхронизироваться |
| `compositionDuration + flowEnergyVariation + energyRedistributionStrength` | Скорость и масштаб смены общего направления | Высокие variation/redistribution при коротком duration выглядят дёрганно |
| `reliefScale × reliefFrequencies × \|reliefDirection\|` | Реальная spatial frequency folds | Одновременное увеличение быстро создаёт жилы |
| `reliefStrengths × flowEnergyBase` | Локальный вклад каждого relief channel | Две нормализации скрывают абсолютные изменения |
| `reliefCrossCoupling + localDisturbanceStrength` | Complex extrema и secondary life | Слишком высоко — blobs/closed loops |
| `anisotropicPhaseSkew + flowTangentStretch` | Вытягивание topology вдоль flow | Слишком высоко — круг становится capsule/worm |
| `flowNormalDecorrelation + contourBreakerScale.y` | Поперечная нерегулярность contours | Слишком высоко — wobble/мелкая рябь |
| `contourBreakerStrength + contourBreakerLightingAttenuation` | Geometry gap + perceptual gap | Двойное подавление может создать пунктир |
| `negativeReliefKnee + negativeReliefCompression + shadowPenumbra` | Форма negative transfer curve | Низкий knee + high compression = плоские серые тени |
| `shadowPermeability + material contribution 0.16` | Глубина darkest material inside minima | Высокая permeability убирает массу |
| `curvatureSampleOffset × curvatureStrength ÷ offset²` | Чувствительность second derivative | Малый offset при high strength — precision noise/clamp |
| `curvatureClamp + tipSoftness + tipContrastAttenuation` | Peak handling | Может бороться с highlightStrength и скрывать tension |
| `foldSoftness + minimumFoldWidth + contourSoftness` | Общая толщина folds | Несогласованность создаёт несколько параллельных widths |
| `foldAlignmentStrength + contourA/B weights` | Насколько secondary contours становятся folds | High alignment возвращает rings/parallel lines |
| `parallelContourSuppression + ridgeCoreWidth` | Сила второй specular линии | Wide core + high suppression value делает double line заметной |
| `parallelContourOffsetVariation + contourBreakerStrength` | Непараллельность nested contours | Слишком высоко — contour collisions/knots |
| `rimStrength + rimBreakup` | Непрерывность edge-like highlight | High rim + low breakup рисует объектную границу |
| `baseBodyLuminance + midtoneStrength + surfaceSaturation` | Главная value/color hierarchy | Все high → luminous wash; все low → невидимая масса |
| `accentAreaLimit + warmAccentStrength + yellowAccentStrength` | Площадь и сила rare accents | Lower limit dominates nonlinear area expansion |
| `verticalActivityZone + lowerScreenAttenuation` | Распределение света по экрану | Wide zone + high attenuation конкурируют с input/tab bar |

---

## Parameter Conflicts

| Конфликт | Что борется | Текущий эффект | Рекомендация аудита |
|---|---|---|---|
| Geometry breaker vs lighting breaker | `contourBreakerStrength` размыкает relief, затем `contourBreakerLightingAttenuation` повторно ослабляет свет | Полезно против loops, но может дать пунктирные gaps | Тестировать раздельно; geometry должна решать topology первой |
| Local life vs compact extrema | `localDisturbanceStrength` добавляет жизнь, topology controls пытаются разомкнуть её minima | Возможен возврат blobs при усилении events | Не повышать events без проверки Hessian/closed contours |
| Deep shadow vs permeability | Compression сохраняет форму тени, permeability ослабляет negative material | Два механизма частично делают одно | Сначала tune transfer curve, затем permeability |
| Fold continuity vs tip safety | `darkFoldContinuity` возвращает fold после `tipSafety` | Длинные folds сохраняются, но dangerous tips могут вернуться | Не повышать continuity вместе с foldStrength |
| ContourA vs ridgeCore | contourA — отдельный level set; ridgeCore повторно его усиливает | Остаточный double-line risk | `parallelContourSuppression` — временная защита, не topology solution |
| PrimaryArc vs variableDistance ridge | Оба реагируют около field≈0, но ridge смещён material | Две близкие зоны одного fold | Возможен будущий unified fold coordinate |
| Flow speed split | `rippleSpeed` ускоряет curl, но relief harmonics не умножаются на него | Flow и relief могут скользить с разной скоростью | Переименовать/разделить осознанно, не крутить вслепую |
| Flow amplitude duplication | `flowCurlStrength` и `flowAdvection` почти мультипликативны | Два параметра делают близкую работу | Один может стать master flow amount, второй — integration step |
| Secondary pass double duty | `flowSecondaryAdvection` задаёт displacement и mix vectors | Изменение одновременно меняет shape и normals | Кандидат на разделение, не удаление сейчас |
| Tip softness double duty | Влияет на curvature risk threshold и contour outer width | Tune tips одновременно меняет band thickness | Кандидат на split |
| Visibility duplication | `visibilityVariation` и `distributedVisibilityVariation` | Оба управляют contour continuity разными входами | Возможна единая visibility model |
| Legacy ripple parameters | `rippleStrength`, `rippleSpeed`, `rippleBandStrength` уже не описывают ripple architecture | Naming вводит в заблуждение | Переименовать отдельным безопасным рефакторингом |
| Global activity double attenuation | activity участвует в geometry, light и final blend | Края зоны могут затухать сильнее ожидаемого | Не менять mask без проверки суммарной степени attenuation |

---

## Sensitivity Ranking

Рейтинг оценивает влияние небольшого изменения на общий кадр, topology и motion. Пять звёзд означают, что изменение на 10–20% почти наверняка заметно без side-by-side comparison.

| Место | Параметр | Влияние | Почему чувствителен |
|---:|---|:---:|---|
| 1 | `flowCurlStrength` | ★★★★★ | Одновременно меняет coordinate deformation, local flow orientation и material offset |
| 2 | `flowAdvection` | ★★★★★ | Мультипликативно усиливает curl и определяет глубину обеих стадий переноса |
| 3 | `reliefScale` | ★★★★★ | Меняет размер всех складок и границу между large blob и fine veins |
| 4 | `reliefCrossCoupling` | ★★★★★ | Управляет nonlinear topology и вероятностью extrema/loops |
| 5 | `motionDuration` | ★★★★★ | Непосредственно определяет ощущение спокойствия, скорости и читаемость continuity |
| 6 | `baseBodyLuminance` | ★★★★★ | Глобальная видимость всей поверхности и глубина navy body |
| 7 | `reliefStrengths` | ★★★★☆ | Определяет, существует ли одна главная складка или распределённая среда |
| 8 | `anisotropicPhaseSkew` | ★★★★☆ | Сильно меняет compact vs elongated topology |
| 9 | `contourBreakerStrength` | ★★★★☆ | Используется дважды: в phase skew и непосредственно в relief |
| 10 | `curvatureStrength` | ★★★★☆ | Главный источник читаемого High Relief и outline amplification |
| 11 | `foldStrength` | ★★★★☆ | Быстро переводит мягкую поверхность в ткань/жилы |
| 12 | `ridgeWidth` | ★★★★☆ | Определяет, читается ли fold как объём или графическая обводка |
| 13 | `flowScale` | ★★★★☆ | Меняет пространственный масштаб curl и его фактическую amplitude |
| 14 | `compositionDuration` | ★★★★☆ | Управляет воспринимаемой цикличностью energy, breaker и events |
| 15 | `negativeReliefCompression` | ★★★☆☆ | Сильно влияет только на глубокий отрицательный хвост, но критичен для black blobs |

Параметры с типичной чувствительностью ★★★☆☆: `flowEnergyVariation`, `energyRedistributionStrength`, `localDisturbanceStrength`, `flowTangentStretch`, `curvatureSampleOffset`, `highlightStrength`, `rimStrength`, `surfaceSaturation`, `verticalActivityZone`. Остальные преимущественно ★★☆☆☆ или ★☆☆☆☆ по отдельности, но могут стать сильными через взаимодействия.

---

## Redundancy Audit

Ничего из списка сейчас не удаляется. Это кандидаты для будущего упрощения после визуальной стабилизации.

| Параметр/группа | Что произойдёт без него | Возможная замена | Оценка дублирования |
|---|---|---|---|
| `flowCurlStrength` vs `flowAdvection` | Удаление любого можно компенсировать другим для first pass, но не полностью для normals/second pass | Один `flowAmount` + фиксированный integration step | Высокое функциональное пересечение |
| `flowSecondaryAdvection` | Второй pass станет либо фиксированным, либо исчезнет; поле проще | Разделить на `secondaryStep` и `flowMix` | Не избыточен, но перегружен двумя ролями |
| `rippleSpeed` | Flow будет зависеть только от motionDuration | Ввести `flowTemporalRate`; значение можно зафиксировать в 1 | Legacy naming, частично избыточен |
| `rippleStrength` | Ослабнет field→luminance bias и material shift ridge | Два отдельных параметра или встроенные coefficients | Один параметр управляет несвязанными downstream effects |
| `distributedVisibilityVariation` | Visibility будет определяться material без field-secondary difference | `visibilityVariation` с richer input | Среднее дублирование |
| `visibilityVariation` | Contours станут равномерно видимыми | Оставить distributed control и фиксировать base | Оба нужны сейчас, но модель сложна |
| `tipSoftness` | Curvature tips и contour penumbra потеряют общий safety control | Разделить `curvatureTipSoftness`/`contourTipSoftness` | Не избыточен, перегружен |
| `contourBreakerStrength` | Phase skew останется tangent-driven, но direct relief gaps ослабнут | Разделить topology и relief breaker amounts | Не удалять; двойная роль скрывает tuning |
| `contourBreakerLightingAttenuation` | Geometry может быть разомкнута, но light всё ещё замкнёт outline | Усилить geometry breaker либо coherence-based ridge | Временная perceptual страховка |
| `parallelContourSuppression` | contourA снова заметнее попадёт в ridgeCore | Убрать contourA→ridgeCore connection совсем | Кандидат на удаление вместе с duplicate lighting path |
| `parallelContourOffsetVariation` | contourA станет более параллелен field≈0 ridge | Полностью отделить contourA от primary field | Временная topology mitigation |
| `foldAlignmentStrength` | Fold будет в основном primaryArc | Пересобрать один unified fold coordinate | Частично дублирует contour weights |
| `darkFoldContinuity` | tipSafety сильнее разорвёт folds | Уменьшить tip attenuation только для fold channel | Временный counter-control |
| `rimStrength` + `rimBreakup` | Без rim теряется часть объёма; без breakup rim становится object-like | Directional ridge может частично заменить rim | Пара полезна, но rim — object-risk |
| `shadowPermeability` | Deep negative material снова темнее | Более точная negative transfer curve | Может стать лишним после финализации transfer function |
| `reliefSoftSaturation` + negative compression | Без global saturation positive peaks выше; negative pipeline остаётся | Единая asymmetric transfer function | Можно объединить математически |
| `surfaceFlowStrength` | Material не будет следовать flow, но relief останется текучим | Использовать advectedPoint без дополнительного flow offset | Низкое дублирование, визуальная роль самостоятельна |
| Palette accents (`yellowAccentStrength`, `warmAccentStrength`) | Поверхность станет полностью холодной | Один semantic accent strength с color balance | Разные цвета, но shared envelope |

---

## Visual Controls

Это не полный каталог, а рекомендуемые ручки для осознанной настройки ощущений. Параметры перечислены в порядке приоритета.

### Mass

- `reliefScale` — крупность массы; ниже создаёт большие тела, выше дробит.
- `baseBodyLuminance` — насколько масса вообще присутствует в кадре.
- `negativeReliefKnee` и `negativeReliefCompression` — глубина тяжёлой тени.
- `flowAdvection` — насколько материал деформирован, а не просто окрашен.
- `foldSoftness` — широкая масса против тонкой линии.

### Flow

- `flowCurlStrength` — сила локальных течений.
- `flowAdvection` — глубина переноса координат.
- `flowSecondaryAdvection` — нелинейность второго pass.
- `flowEnergyVariation` — миграция энергии между направлениями.
- `energyRedistributionStrength` — изменение траекторий во времени.

### Depth

- `curvatureStrength` — читаемость кривизны.
- `midtoneStrength` — разделение body/mid relief.
- `ridgeWidth` и `ridgeCoreWidth` — broad vs specular relief.
- `rimStrength`/`rimBreakup` — объём против object outline.
- `shadowPermeability` — глубина без black fill.

### Topology

- `reliefCrossCoupling` — complexity и extrema.
- `reliefStrengths` — dominance компонентов.
- `anisotropicPhaseSkew` — compact vs elongated forms.
- `flowTangentStretch` — длина folds.
- `flowNormalDecorrelation` — неравномерность contours.
- `contourBreakerStrength` и `contourBreakerScale` — вероятность closed loop.

### Lighting

- `baseBodyLuminance` — общий body level.
- `highlightStrength` — ridge intensity.
- `cyanHighlightStrength` — curvature light.
- `whiteHighlightStrength` — specular peaks.
- `lightDirection` — светлая/тёмная сторона folds.
- `surfaceSaturation` — chroma без изменения geometry.

### Texture

- `surfaceFlowStrength` — следование material flow.
- `frontWidthVariation` — thickness variation.
- `visibilityVariation` — локальное растворение.
- `distributedVisibilityVariation` — связь primary/secondary visibility.
- `rimBreakup` — material interruption of rim.

### Motion

- `motionDuration` — базовая скорость.
- `compositionDuration` — скорость медленной перестройки.
- `rippleSpeed` — скорость curl относительно relief.
- `reliefEvolutionHarmonics` — относительные temporal rates.
- `localDisturbanceHarmonics` — частота secondary events.

### Scale

- `flowScale` — размер curl cells.
- `reliefScale` — размер folds.
- `reliefFrequencies` — channel-specific wavelength.
- `curvatureSampleOffset` — масштаб воспринимаемой curvature.
- `contourSoftness` — visual scale bands.

### Calmness

- `motionDuration` и `compositionDuration` — главные ручки.
- `flowEnergyVariation` — амплитуда compositional change.
- `localDisturbanceStrength` — количество локальных событий.
- `energyRedistributionStrength` — predictability trajectories.
- `visibilityVariation` — мягкое исчезновение против popping.

### Secondary Events

- `localDisturbanceStrength` — amplitude.
- `localDisturbancePhaseOffsets` — temporal separation.
- `localDisturbanceHarmonics` — recurrence.
- `reliefStrengths[1..2]` — background relief channels.
- `bandSeparation` и `rippleBandStrength` — secondary contour visibility.

### Tissue

- `foldStrength`, `foldSoftness` — основная тканевая складка.
- `frontWidthVariation` — неодинаковая толщина.
- `darkFoldContinuity` — протяжённость тёмной стороны.
- `ridgeWidth` — мягкость натяжения.

### Liquid

- `flowCurlStrength × flowAdvection` — текучесть координат.
- `flowSecondaryAdvection` — нелинейное течение.
- `surfaceFlowStrength` — движение material light.
- `reliefCrossCoupling` — мягкое соединение форм.

### Light

- `baseBodyLuminance`, `midtoneStrength`, `highlightStrength` — value hierarchy.
- `cyanHighlightStrength`, `whiteHighlightStrength` — peak color.
- `rimStrength`, `rimBreakup` — directional volume.
- `accentAreaLimit`, accent strengths — редкие цветовые события.

### Volume

- `curvatureStrength`, `curvatureClamp` — curvature magnitude.
- `ridgeWidth`, `ridgeCoreWidth` — broad/core specular.
- `lightDirection` — directional read.
- `surfaceBody` thresholds (сейчас embedded) — body separation.

---

## Evolution Log

### 2026-07-16 — High Relief baseline

| Параметры | Зачем появились | Решаемая проблема | Побочный эффект / наследие |
|---|---|---|---|
| `verticalActivityZone`, `verticalMaskSoftness`, `lowerScreenAttenuation` | Композиционная active zone | Свет спорил с UI и клавиатурой | Многократное activity attenuation усложняет края |
| `rippleStrength`, `rippleSpeed`, `frontWidthVariation`, `visibilityVariation`, `bandSeparation`, `distributedVisibilityVariation` | Управление ripple/contours | Плоский blur без читаемой deformation | Имена `ripple*` устарели после flow field |
| `minimumFoldWidth`, `tipSoftness`, `tipContrastAttenuation`, `curvatureClamp`, `darkFoldContinuity` | Mobile-safe tip control | Игольчатые folds и singularities | Часть параметров борется друг с другом |
| `foldStrength`, `foldSoftness`, `foldAlignmentStrength`, `contourSoftness` | Fold geometry | Рельеф не читался | Несколько level sets могут дать double line |
| `curvatureSampleOffset`, `curvatureStrength`, `surfaceFlowStrength` | High Relief curvature/material response | Форма выглядела blur | Directional derivative не является полной curvature |
| `baseBodyLuminance`, `midtoneStrength`, `highlightStrength` | Value hierarchy | Все цвета имели одинаковую luminance | Глобально очень чувствительные knobs |
| `ridgeWidth`, `ridgeCoreWidth`, `rimStrength`, `rimBreakup`, `rippleBandStrength` | Ridge/rim/contour light | Не читались натяжение и folds | При избытке создают object outline |
| `lightDirection`, cyan/white/yellow/warm strengths, `accentAreaLimit`, `surfaceSaturation`, palette vectors | Семантический свет и цвет | Тёмная однородная масса | Accent threshold нелинеен и чувствителен |
| `motionDuration`, `compositionDuration`, reduced phases | Seamless motion/accessibility | Резкие loop/reset и отсутствие reduced motion | Общий pattern повторяется через 210 s |

### 2026-07-18 — Flow-field architecture

| Параметр | Причина появления | Что решил | Побочный эффект |
|---|---|---|---|
| `flowScale` | Нужен spatial scale аналитического curl | Убрал object-based wave origins | Низкое значение может дать большие blobs |
| `flowDirections` | Несколько нерадиальных basis directions | Нет единого центра/направления | Неудачные ratios дают сетку/полосы |
| `flowPhaseOffsets` | Детерминированная рассинхронизация | Убрал синхронные components | Случайный tuning затруднён |
| `flowEnergyBase` | Базовое распределение энергии | Управляемая иерархия течений | Normalization скрывает absolute changes |
| `flowEnergyVariation` | Энергия должна мигрировать | Среда не стоит на месте | Может сделать цикличность очевидной |
| `energyRedistributionStrength` | Медленный temporal phase warp | Траектории меняются | Высоко выглядит дёрганно |
| `flowCurlStrength` | Master curl amplitude | Появилось течение | Пересекается с flowAdvection |
| `flowAdvection` | Перенос material coordinates | Flow стал причиной формы | Слишком высоко сжимает field |
| `flowSecondaryAdvection` | Второй nonlinear pass | Более живая связность | Один knob меняет displacement и normal |
| `reliefScale`, `reliefDirections`, `reliefFrequencies`, `reliefPhaseOffsets` | Scalar relief после flow | Убрали wave-front objects | Всё ещё могут создавать compact critical points |
| `reliefStrengths` | Иерархия scalar channels | Одна fold читается, остальные слабее | Сильный A снова становится главным событием |
| `reliefCrossCoupling` | Material continuity между phases | Мягкое соединение/разделение | Главный источник complex extrema |
| `reliefEvolutionHarmonics` | Разные temporal rates | Среда не движется синхронно | Только integers сохраняют seamless loop |

### 2026-07-18 — Black minimum and local-life iteration

| Параметр | Причина появления | Что решил | Побочный эффект |
|---|---|---|---|
| `reliefSoftSaturation` | Убрать hard clamp plateau | Smooth extrema | Может слегка снизить positive peaks |
| `negativeReliefKnee` | Отделить обычные тени от dangerous minima | Компрессия только deep tail | Одновременно управляет deepShadow mask |
| `negativeReliefCompression` | Убрать почти чёрную заливку | Проницаемые minima | Высоко делает тени похожими |
| `shadowPenumbra` | Распределить переход | Нет резкого shadow boundary | Используется в двух разных transfer stages |
| `shadowPermeability` | Убрать double-negative material | Deep shadow сохраняет цвет | Может ослабить массу |
| `localDisturbanceStrength` | Одна fold доминировала | Добавил слабую локальную жизнь | Может вернуть compact minima |
| `localDisturbancePhaseOffsets` | Рассинхронизировать events | Нет simultaneous peak | Composition становится сложнее предсказывать |
| `localDisturbanceHarmonics` | Детерминированный event timing | Events появляются/исчезают | Higher rates усиливают цикличность |

### 2026-07-18 — Closed-loop topology iteration

| Параметр | Причина появления | Что решил | Побочный эффект |
|---|---|---|---|
| `anisotropicPhaseSkew` | Compact minima давали elliptical level sets | Вытягивает minima вдоль flow | Может превратить circle в capsule |
| `flowTangentStretch` | Нужны открытые протяжённые folds | Увеличивает continuity along flow | Высоко создаёт worms/stripes |
| `flowNormalDecorrelation` | Contours были равной толщины | Ломает normal symmetry | Высоко создаёт wobble |
| `contourBreakerStrength` | Нужен distributed nonradial gap | Размыкает topology | Двойная роль повышает чувствительность |
| `contourBreakerScale` | Контроль spatial размера gaps | Breaker не равен fixed screen stripe | Неудачный ratio создаёт полосы |
| `contourBreakerPhaseOffset` | Размещение breaker composition | Детерминированная вариативность | Не влияет на силу, только snapshot |
| `contourBreakerLightingAttenuation` | Lighting мог замкнуть уже разомкнутый relief | Perceptual gaps | Может дать пунктир |

### 2026-07-18 — Double-line iteration

| Параметр | Причина появления | Что решил | Побочный эффект |
|---|---|---|---|
| `parallelContourSuppression` | contourA повторно входил в ridgeCore | Ослабляет вторую specular line | Маскирует duplicate path, не удаляет его |
| `parallelContourOffsetVariation` | field≈0 и field≈.48 были параллельны | Делает separation неравномерным | Высоко вызывает contour collision |

### 2026-07-19 — Independent relief phases diagnostic experiment

- **Цель:** изолировать влияние sequential cyclic cross-phase modulation на появление лепестков.
- **Временно отключено:** только phase modulation `A ← B`, `B ← C`, `C ← modified A`; base phases A/B/C остаются независимыми.
- **Сохранено:** advected coordinates, flow, base relief parameters, mixed relief term с `reliefCrossCoupling`, additive local disturbances и envelopes, directional topology, contour breaker, lighting, palette и animation timing.
- **Ожидание:** petals/lobed contours станут слабее или реже; compact blobs могут сохраниться из-за independent phase interference; lifecycle local disturbances должен остаться.
- **Статус:** awaiting Android visual validation.

---

## Deprecated Parameters

Параметры ниже удалены из активного preset при переходе от object/wave topology к flow field. Записи сохраняются как история; возвращать их без отдельного архитектурного решения нельзя.

| Параметры (последние известные значения) | Статус с | Почему deprecated | Чем заменены |
|---|---|---|---|
| `mainShapePosition [0.5,.28]`, `mainShapeScale [.86,.43]`, `mainShapeAnisotropy [.82,1.08]` | 2026-07-18 | Задавали одну главную форму/объект | Full-screen flow coordinates + active zone |
| `jellyExpansion .075`, `edgeLag .82`, `compositionDrift [.035,.025]` | 2026-07-18 | Анимировали identifiable surface object | Curl advection and energy redistribution |
| `rippleWidth .72`, `rippleAnisotropy .08`, `rippleStretch [1.08,.94]`, `angularDistortionStrength .06`, `directionalBend .045`, `secondaryBandDeformation .22`, `rippleEvolutionAmount .24` | 2026-07-18 | Строили radial/organic ripple distance | Cross-coupled scalar relief |
| `originCount 3`, all `originPositions`, `originStrengths`, `originStretch`, `originAngles`, `originPhaseOffsets`, `originEvolutionAmount` | 2026-07-18 | Origins оставались perceptual sources | Analytic curl basis without point origins |
| `unionSoftness .46`, `originPhaseInfluence .16`, `originVisibilityInfluence .22` | 2026-07-18 | Смешивали origin control fields | Normalized flow energy |
| `waveCount 3`, `waveDirections`, `wavePhaseOffsets`, `waveLengths`, `waveWidths`, `waveBendStrength`, `waveCurvature`, `waveVisibility`, `waveWidthVariation`, `waveFamilyStrengths` | 2026-07-18 | Wave families читались как объекты/лепестки | Relief directions/frequencies/strengths |
| `petalGeometrySuppression .94`, `waveContinuityStrength .88` | 2026-07-18 | Counter-controls против артефактов wave model | Архитектурное удаление petal geometry |
| `waveEntryPoints`, `waveExitDirections`, `waveLifecycleOffsets`, `waveLifecycleDurations`, `waveActiveWindows`, `waveVisibilityEnvelopes`, `waveTranslationAmounts`, `waveDecayWidths` | 2026-07-18 | Lifecycle создавал появляющиеся объекты | Continuous phases and flow energy |
| `waveCompetitionStrength .58`, `anchorSuppression .82` | 2026-07-18 | Боролись с общим anchor, сохраняя wave objects | No dominant wave architecture |
| `topologyBlendMode dominantPrimary`, `primarySurfaceStrength 1`, `secondaryDeformationStrengths [.1,.12,.08]`, `familyDominanceSharpness 1.8`, `dominantFamilyTransitionSoftness .22` | 2026-07-18 | Winner-takes-most всё равно создавал primary object | Equal flow basis + scalar relief |
| `zeroContourSeparation [.18,-.27,.41]`, `bendReferencePoints [-.46,.37,.12]`, `baselineOffsets [.16,-.21,.34]` | 2026-07-18 | Разносили zero contours wave families | Nonparallel relief basis and breaker |
| `pinchRadius .24`, `singularitySuppression .9` | 2026-07-18 | Маскировали singularity старой topology | Topology generated without signed-distance blend |

Активные параметры с legacy-name (`rippleStrength`, `rippleSpeed`, `rippleBandStrength`, `distributedVisibilityVariation`) **не deprecated**, но требуют будущего semantic rename.

---

## Current Artifact Sources

| Артефакт | Главный математический источник сейчас | Усиливающие параметры |
|---|---|---|
| Blob | Изолированный extremum суммы cross-coupled phases и local events; smooth field около critical point имеет elliptical level sets | `reliefCrossCoupling`, `localDisturbanceStrength`, low `reliefScale`, correlated strengths/directions |
| Жилы | Узкие field≈0 bands, curvature peaks и specular core | High `reliefScale`, `curvatureStrength`, `foldStrength`, low widths/softness |
| Лепестки | Симметричные или близко-кратные phase directions/frequencies/offsets | `reliefDirections`, `reliefFrequencies`, `flowPhaseOffsets`, high coupling |
| Скорость | Motion period и flow multiplier; composition меняет perceived speed indirectly | `motionDuration`, `rippleSpeed`, `compositionDuration`, harmonics |
| Дёрганность | Быстрый energy redistribution, high coupling, high curvature sensitivity, orientation instability near low-flow points | `energyRedistributionStrength`, `flowEnergyVariation`, `reliefCrossCoupling`, `curvatureSampleOffset/Strength`, event harmonics |
| Цикличность | Integer harmonic repeat двух master phases; exact joint loop 210 s | `motionDuration 14 s`, `compositionDuration 30 s`, offsets и harmonics |
| Closed loop | Compact relief minimum plus multiple nested lighting level sets | `reliefCrossCoupling`, events, insufficient topology skew/breaker, contourA/ridge coupling |
| Double line | `primaryArc/ridge` around field≈0 plus `contourA` around field≈0.48 and contourA→ridgeCore reuse | `parallelContourSuppression`, `parallelContourOffsetVariation`, widths/softness |

---

## Primary Manual Controls Going Forward

Не рекомендуется одновременно менять больше двух ручек из списка.

1. `motionDuration` — спокойствие и читаемость движения.
2. `flowCurlStrength` — сила течения.
3. `flowAdvection` — глубина coordinate deformation.
4. `flowEnergyVariation` — перераспределение энергии.
5. `reliefScale` — масштаб folds.
6. `reliefStrengths` — иерархия главной и secondary деформаций.
7. `reliefCrossCoupling` — topology complexity.
8. `localDisturbanceStrength` — локальная жизнь.
9. `anisotropicPhaseSkew` — compact vs open topology.
10. `contourBreakerStrength` — вероятность closed contours.
11. `curvatureStrength` — читаемость High Relief.
12. `foldStrength` — ткань/жилы.
13. `ridgeWidth` — объём против outline.
14. `baseBodyLuminance` — общая видимость массы.
15. `negativeReliefCompression` — глубина darkest minima.

Минимальный core-набор для большинства будущих сессий: **`flowCurlStrength`, `flowAdvection`, `reliefScale`, `reliefStrengths`, `reliefCrossCoupling`, `localDisturbanceStrength`, `anisotropicPhaseSkew`, `contourBreakerStrength`, `curvatureStrength`, `baseBodyLuminance`**.

Перед tuning следует зафиксировать baseline-видео минимум на 210 секунд, менять одну topology/flow ручку и максимум одну lighting ручку, затем повторять запись на том же Android-устройстве.

---

## Итог

Living Surface сейчас является детерминированным analytic flow field с two-pass advection и cross-coupled scalar relief. Его главное достоинство — отсутствие явных origins и самостоятельных wave objects. Главный оставшийся topology-риск — generic compact extrema гладкого двумерного scalar field; breaker и anisotropic skew снижают вероятность closed loops, но математически не гарантируют их отсутствие.

Система содержит несколько слоёв counter-controls, появившихся в ответ на последовательные визуальные дефекты. Наиболее заметны пары `negative compression ↔ shadow permeability`, `tip safety ↔ dark fold continuity`, `topology breaker ↔ lighting attenuation` и `contourA ↔ ridgeCore suppression`. До следующего расширения модели полезнее сократить количество двойных обязанностей и вынести embedded constants, чем добавлять новые коэффициенты.

Главная стратегия дальнейшей настройки:

1. Сначала motion и flow: `motionDuration`, `flowCurlStrength`, `flowAdvection`.
2. Затем spatial relief: `reliefScale`, `reliefStrengths`, `reliefCrossCoupling`.
3. Затем topology safety: `anisotropicPhaseSkew`, `contourBreakerStrength`.
4. После стабилизации geometry — `curvatureStrength`, `ridgeWidth`, `baseBodyLuminance`.
5. Palette и High Relief colors менять только после подтверждённой topology, иначе lighting будет скрывать причину артефакта.
