# CP20 — отчёт об испытаниях

Дата: 4–5 ноября 2026.

## 1. Итог

**186 именованных автоматических браузерных проверок итоговой сборки CP20: 186 PASS, 0 FAIL.**
Тот же набор на исходной CP19: **141 PASS, 45 FAIL** — провалы CP19 воспроизводят исправленные дефекты (раздел 6).

Целостность данных (машинная проверка, `tools/datacheck.py`): **PASS** — см. раздел 2.

## 2. Среда и методика

- Движок: **Chromium 153.0.8010.12 (headless shell), Playwright 1.63**, Linux. Единственный доступный в окружении движок: Firefox и WebKit не установлены, установка запрещена правилами окружения. **Второй движок не испытывался.**
- **Samsung Internet, браузеры Android и iOS, физический смартфон не испытывались** — недоступны. Мобильный режим — эмуляция 390×844 (`isMobile`, `hasTouch`), а также ширины 360 и 736; сенсорный ввод подаётся через Chrome DevTools Protocol `Input.dispatchTouchEvent` (события `isTrusted=true`). Это эмуляция, а не реальный палец и не реальный экран.
- Все испытания — через **`file://`** (автономное открытие), каждое — в изолированном браузерном контексте; реальные пользовательские данные не использовались. Подготовка данных — через пустую страницу того же источника (см. T-01 в реестре).
- Плавность оценивалась **по кадрам**, а не по факту переключения: в странице ведётся запись каждого кадра `requestAnimationFrame` — положение входящего содержимого, текущего содержимого, прокрутка, интервалы кадров; долгие задачи — `PerformanceObserver('longtask')`; причины пауз — трассировка Chrome (`devtools.timeline`) и профиль CPU. Для оценки на «слабом телефоне» использовалось замедление CPU в 4 раза (`Emulation.setCPUThrottlingRate`). Скорость пальца в испытаниях: 220 px за 260 мс = 14,1 px/кадр.
- Скрипты испытаний приложены (`verification/tools/`): `regress.js` (186 проверок), `perf.js` (замеры до/после), `catswipe.js`, `trace.js` (свайп каталога), `datacheck.py` (данные).

### Целостность данных (итоговый файл против CP19)

| Проверка | Результат |
|---|---|
| `data-books`, `data-films`, `data-songs`, `boot` | побайтно идентичны (SHA-256 `45e347bc…`, `83d844ad…`, `f3f5b68c…`, `d9626d68…`) |
| Записи, id, порядок, все поля | 496 / 500 / 500, совпадают полностью; id непрерывны 1…N |
| Утверждённые иконки `ART_IMG` (55 812 байт) и `MINI` | побайтно идентичны |
| Отметки скачивания | 201 (поле записей) / 201 (`boot`); фильмы и музыка — 0 |
| Встроенные история и прогресс | 0 событий, отметок нет, `savedAt:null` |
| Синтаксис JS (`node --check`), баланс тегов HTML | OK |
| Внешние ресурсы при работе | нет (только `file:`/`data:`/`blob:`) |

## 3. Проверки по требованиям (CP20, все PASS)

| Требование | Что проверено |
|---|---|
| Открытие статистики/истории из каждого каталога | 2 конфигурации × 3 каталога × 2 экрана через общее меню |
| Открытие во время анимации перехода | выбирается целевой каталог; меню не закрывается переходом |
| Отменённый свайп каталога | не переключает каталог при открытии меню |
| Независимость состояний | смена категории внутри экрана не меняет каталог и другой экран; повторное открытие привязано к каталогу |
| Активные переключатели | 3 уровня × 3 категории × светлая/тёмная × desktop/mobile: ровно один активный, есть рамка, отличие фона от неактивных ≥ 25 (RGB-расстояние), контраст текста активного и неактивных ≥ 4,5:1; история и выбор темы |
| Клавиатура | стрелки с границами, Home/End, фокус, Escape с возвратом фокуса, вкладки каталога |
| Свайпы статистики и истории | влево/вправо по всем категориям в обеих темах; содержимое видно в промежуточных положениях (≥ 8 кадров), шаг за кадр ≤ max(22 px; 1,7 × скорость пальца), без скачка прокрутки, слой убран, `transform` очищен |
| Крайние вкладки | без перехода, «резинка» возвращается |
| Короткое касание, диагональ, вертикаль | не переключают; вертикальная прокрутка нативная (> 100 px) |
| Медленный/быстрый, незавершённый, отменённый, `touchcancel` | короткий медленный — возврат; длинный медленный — переключение; быстрый взмах 70 px за 70 мс — переключение; «туда и обратно» — возврат; `touchcancel` — восстановление |
| Один жест — одно переключение | взмах 330 px — ровно одна категория |
| Перехват незавершённого движения | палец подхватывает анимацию без скачка |
| Исключения | график SVG и сегментные переключатели не перехватываются; по строке истории свайп работает, касание открывает запись; в карточке записи свайпа нет |
| Позиция прокрутки | сохраняется, при меньшей высоте — ограничена максимумом; скачка нет |
| Сниженная анимация | свайп мгновенный, без анимации содержимого; свайп каталога работает |
| Свайп каталога | влево/вправо, край, частичный жест, вертикальная прокрутка, собственная позиция прокрутки каждого каталога |
| Навигация «Назад» | системная «Назад» из записи → список той же категории; вторая → каталог; кнопка экрана; Escape из записи; запись из статистики; «Открыть в каталоге»; восстановление экрана после перезагрузки |
| Статусы | взаимоисключение «Читаю/Прочитано/Брошено», «Сейчас читаю» и листание, скачивания (201 ± 1), «следующий» фильм и кнопка «Следующее», музыка (прослушано/избранное/Spotify/брошено), 160 случайных переключений — нет противоречивых комбинаций, интерфейс совпадает с состоянием |
| Фильтр «Брошено», описания, копирование | показ/скрытие, пустое состояние; раскрытие/сворачивание по высоте; уведомление о копировании |
| Статистика | «Моя активность» по событиям, День/Месяц/Год/Всё время, стрелки периода, скрытие стрелок для «Всё время», «Коллекция» (плитки, кольцо, карточки) |
| История | события по категориям с датами, без чужих категорий |
| Длительная работа | вкладка открыта после полуночи — «Сегодня» обновляется, выбор пользователя сохраняется; 10 000 событий |
| Хранение и совместимость | прогресс формата CP19 читается без сброса; повреждённый JSON — нет сбоя, копия в `…-recovery`; повреждённые типы очищаются; старый ключ CP07 — перенос только скачиваний и однократно; недоступный `localStorage` — приложение работает, настройки предупреждают |
| Резервные копии | экспорт JSON → импорт в чистый профиль: состояние и история совпадают точно, сохраняются после перезагрузки; неверные файлы — ошибка без изменений; старый формат `catalogues-v3`; сброс раздела и очистка истории сохраняют скачивания |
| «Сохранить каталог с отметками» | данные побайтно те же, отметки и история встроены, служебные слои не попадают; сохранённый файл открывается через `file://` в чистом профиле с отметками |
| Тема | светлая/тёмная/как в системе, сохранение после перезагрузки |
| Адаптивность | 360, 390, 736, 1024, 1280, 1440 px — нет горизонтального переполнения, вкладки и сегменты помещаются |
| Ошибки JavaScript | нет необработанных исключений и `console.error` во всех прогонах |

## 4. Плавность свайпов — измерения по кадрам

Мобильная эмуляция 390×844, история 3 000 событий, **CPU замедлен в 4 раза**, свайп 220 px за 260 мс (14,1 px/кадр). Файлы: `results_perf_CP19.json`, `results_perf_CP20.json`.

| Показатель (статистика / история) | CP19 | CP20 |
|---|---|---|
| Кадры перетаскивания, в которых содержимое движется за пальцем | **0** из 12–13 | 8–11 из 12–13 (первые 1–2 кадра — порог распознавания 10 px) |
| Наибольший сдвиг входящего содержимого за один кадр | **378 px** (появление скачком) | 17–27,5 px (≈ скорость пальца; при 4× замедлении иногда 2 события за кадр) |
| Первые кадры после отпускания | — (дискретная смена) | 13,8 px/кадр — продолжение со скоростью пальца |
| Пауза кадров > 34 мс во время видимого движения | 1 (50–100 мс, в момент смены содержимого) | **0** |
| Паузы после завершения (содержимое неподвижно, x = 16 px) | — | 50–83 мс через 0,7 с после отпускания: подготовка соседних категорий в простое |
| Скачок вертикальной прокрутки | 0 | 0 |
| Свайп сразу (0,3 с) после смены категории | то же, что выше | 0 пауз во время движения |

Регрессионные проверки (раздел 3) дополнительно требуют для каждого свайпа: видимость входящего содержимого минимум в 8 промежуточных кадрах и шаг ≤ max(22 px; 1,7 × скорость пальца). **На CP19 эти проверки не проходят** (16 провалов), на CP20 проходят.

### Свайп каталога (книги → фильмы, 4× замедление, 5 повторов, `results_catswipe.jsonl`)

| Показатель | CP19 | CP20 |
|---|---|---|
| Наибольшая пауза кадров за жест, медиана | 116,7 мс | 83,3 мс |
| Самая долгая задача за жест, медиана | 125 мс | 86 мс |
| Трассировка: задача в момент фиксации жеста | 114–150 мс (Layout 54–83 мс входящего экрана) | 44–64 мс (Layout 0–2 мс) |
| Трассировка: задача в конце | два полных пересчёта стилей (67 + 64 мс) | один (24–66 мс), содержимое уже неподвижно |
| Наибольший шаг за кадр | 43–46 px | 43–46 px (не изменено: «догоняющий» сдвиг утверждённого механизма при фиксации, D-02) |

## 5. Производительность

| Показатель | CP19 | CP20 | Примечание |
|---|---|---|---|
| Загрузка, DOMContentLoaded (медиана 5 загрузок, desktop) | 164–191 мс (4 серии) | 172–194 мс (4 серии) | различие в пределах разброса; ускорение **не заявляется** |
| Куча JS после загрузки | 9,5 МБ | 9,5 МБ | |
| Открытие статистики (4×, 3 000 событий, медиана) | 67,7 мс | 68,6 мс | без изменений |
| Смена категории статистики | 74,4 мс | 38,3 мс | |
| Режим «Коллекция» | 53,2 мс | 50,5 мс | без изменений |
| Открытие истории | 95,5 мс | 51,7 мс | |
| Смена категории истории | 68,1 мс | 37,7 мс | |
| Переключение статуса (4×, 3 000 событий) | 93,2 мс | 60,7 мс | M-01 |
| Статистика «Всё время», 10 000 событий (без замедления) | 964–1 404 мс | 69–72 мс | B-10 |
| Переключение статуса, 10 000 событий (без замедления, медиана) | 52–68 мс | 35–79 мс | **разброс перекрывается — улучшение не заявляется**; доминирует запись ~2 МБ (D-05) |

Значения «до/после» сняты одним и тем же скриптом на одной машине последовательно; разброс между сериями ±20–30 %. Ускорения смены категории частично объясняются тем, что форматирование дат больше не создаёт объекты `Intl` (B-10).

## 6. Сравнение с CP19 (тот же набор проверок)

Провалы CP19 на итоговом наборе — воспроизведение исправленных дефектов:

| Проверка (без префикса конфигурации) | Провалов | Дефект |
|---|---|---|
| stats levels 1-3 clearly highlighted on books | 4 | B-06 |
| stats levels 1-3 clearly highlighted on films | 4 | B-06 |
| stats levels 1-3 clearly highlighted on songs | 4 | B-06 |
| history category highlight and theme radio highlight | 4 | B-06 |
| stats swipe left → films, content follows finger without jumps | 2 | B-01, B-02 |
| stats swipe left → songs, content follows finger without jumps | 2 | B-01, B-02 |
| stats swipe right → films, content follows finger without jumps | 2 | B-01, B-02 |
| stats swipe right → books, content follows finger without jumps | 2 | B-01, B-02 |
| stats slow long swipe (190px, 900ms) commits | 2 | B-01 (в CP19 жест > 1 с не засчитывался) |
| history swipe left → films, content follows finger without jumps | 2 | B-01, B-02 |
| history swipe left → songs, content follows finger without jumps | 2 | B-01, B-02 |
| history swipe right → films, content follows finger without jumps | 2 | B-01, B-02 |
| history swipe right → books, content follows finger without jumps | 2 | B-01, B-02 |
| history slow long swipe (190px, 900ms) commits | 2 | B-01 (в CP19 жест > 1 с не засчитывался) |
| idle pre-render: other catalogs have first 24 cards before any swipe | 1 | M-03 (функция CP20) |
| catalog: cancelled swipe followed by opening the menu keeps the original catalog | 1 | B-07 |
| system Back from a record returns to the history list (same category) | 1 | B-08 |
| second system Back closes history and returns to the catalog | 1 | B-08 (следствие: в CP19 первая «Назад» уже закрыла экран) |
| in-app back from record → list; Escape from record closes without reopening | 1 | следствие B-08: в CP19 вторая системная «Назад» уводит вкладку со страницы приложения, следующие проверки в ней невыполнимы |
| record opened from statistics: in-app back shows history list; close returns to catalog | 1 | следствие B-08: в CP19 вторая системная «Назад» уводит вкладку со страницы приложения, следующие проверки в ней невыполнимы |
| «Открыть в каталоге» closes sheet and jumps to the record | 1 | следствие B-08: в CP19 вторая системная «Назад» уводит вкладку со страницы приложения, следующие проверки в ней невыполнимы |
| reload with a sheet in history state restores that sheet | 1 | следствие B-08: в CP19 вторая системная «Назад» уводит вкладку со страницы приложения, следующие проверки в ней невыполнимы |
| app left open past midnight: «День» in statistics shows the new today | 1 | B-09 |

Проверка «10 000 событий» на CP19 формально проходит (порог 150 мс), но статистика строится 966 мс против 72 мс в CP20 (B-10).

Пояснения: «idle pre-render» — новая функция CP20 (в CP19 отсутствует по определению); «медленный длинный свайп» — в CP19 жест длиннее 1 с не засчитывался.

## 7. Ограничения испытаний

- Не испытывались: Firefox, Safari/WebKit, **Samsung Internet**, Chrome для Android, физические устройства. Совместимость с Samsung Internet оценена только по используемым возможностям платформы (аудит, раздел 2): всё используемое поддерживается Chromium ≥ 111 (Samsung Internet ≥ 23), необязательные API защищены проверками. **Это оценка, а не испытание.**
- Плавность измерена в эмуляции с замедлением CPU, а не на реальном экране с реальной частотой обновления и задержкой сенсора. Субъективную плавность на телефоне пользователю следует подтвердить на своём устройстве.
- Скорость пальца в автоматических жестах постоянна; реальные жесты неравномерны.
- Проверка контраста — по WCAG-формуле для вычисленных цветов фона и текста кнопок; восприятие на конкретном экране не проверялось.
- Повторный редакторский аудит текстов не проводился (вне задачи).

## 8. Поимённый протокол итогового прогона CP20

Файл: `results_regress_CP20.json` (с подробностями каждой проверки). CP19: `results_regress_CP19.json`.

1. **PASS** — file:// autonomous open: app initialised, no external requests
2. **PASS** — runtime record counts 496/500/500 and tab counters
3. **PASS** — 201 embedded book downloads shown and stored; films/songs 0
4. **PASS** — clean initial progress and empty history
5. **PASS** — unique ids and every aria-controls/aria-labelledby target exists
6. **PASS** — inactive catalogs are inert, hidden from a11y, not hit-testable
7. **PASS** — idle pre-render: other catalogs have first 24 cards before any swipe
8. **PASS** — hidden catalogs do not inflate page scroll height (filter «Брошено»)
9. **PASS** — desktop: stats opens on books from its catalog
10. **PASS** — desktop: history opens on books from its catalog
11. **PASS** — desktop: stats opens on films from its catalog
12. **PASS** — desktop: history opens on films from its catalog
13. **PASS** — desktop: stats opens on songs from its catalog
14. **PASS** — desktop: history opens on songs from its catalog
15. **PASS** — desktop: entry during running catalog transition uses the chosen target
16. **PASS** — desktop: menu stays open when opened during a transition
17. **PASS** — desktop: internal category switch does not change the catalog or the other sheet
18. **PASS** — desktop: reopening stats binds to current catalog again
19. **PASS** — mobile: stats opens on books from its catalog
20. **PASS** — mobile: history opens on books from its catalog
21. **PASS** — mobile: stats opens on films from its catalog
22. **PASS** — mobile: history opens on films from its catalog
23. **PASS** — mobile: stats opens on songs from its catalog
24. **PASS** — mobile: history opens on songs from its catalog
25. **PASS** — mobile: entry during running catalog transition uses the chosen target
26. **PASS** — mobile: menu stays open when opened during a transition
27. **PASS** — mobile: internal category switch does not change the catalog or the other sheet
28. **PASS** — mobile: reopening stats binds to current catalog again
29. **PASS** — unknown initial category (#xyz) defaults to books; #films opens films
30. **PASS** — desktop/light: stats levels 1-3 clearly highlighted on books
31. **PASS** — desktop/light: stats levels 1-3 clearly highlighted on films
32. **PASS** — desktop/light: stats levels 1-3 clearly highlighted on songs
33. **PASS** — desktop/light: history category highlight and theme radio highlight
34. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on books
35. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on films
36. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on songs
37. **PASS** — desktop/dark: history category highlight and theme radio highlight
38. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on books
39. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on films
40. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on songs
41. **PASS** — mobile/light: history category highlight and theme radio highlight
42. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on books
43. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on films
44. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on songs
45. **PASS** — mobile/dark: history category highlight and theme radio highlight
46. **PASS** — keyboard: stats category arrows bounded, Home/End, focus kept
47. **PASS** — keyboard: history arrows bounded; Escape closes sheet and restores focus
48. **PASS** — keyboard: main tabs arrow navigation
49. **PASS** — dark: stats swipe left → films, content follows finger without jumps
50. **PASS** — dark: stats swipe left → songs, content follows finger without jumps
51. **PASS** — dark: stats swipe right → films, content follows finger without jumps
52. **PASS** — dark: stats swipe right → books, content follows finger without jumps
53. **PASS** — dark: stats edge books → right swipe does nothing, rubber-band returns
54. **PASS** — dark: stats edge songs → left swipe does nothing
55. **PASS** — dark: stats short tap does not switch category
56. **PASS** — dark: stats small slow partial swipe (60px, 700ms) returns smoothly
57. **PASS** — dark: stats slow long swipe (190px, 900ms) commits
58. **PASS** — dark: stats quick short fling (70px, 70ms) commits
59. **PASS** — dark: stats drag out and back (cancelled) keeps category
60. **PASS** — dark: stats one very long swipe = one switch
61. **PASS** — dark: stats diagonal gesture does not switch
62. **PASS** — dark: stats vertical scroll is native and does not switch
63. **PASS** — dark: stats touchcancel mid-drag restores state
64. **PASS** — dark: stats finger catches the settling animation without a jump
65. **PASS** — dark: stats swipe starting on a chart is not intercepted
66. **PASS** — dark: stats swipe on segmented controls is not intercepted
67. **PASS** — dark: stats swipe preserves scroll (clamped to new content)
68. **PASS** — dark: history swipe left → films, content follows finger without jumps
69. **PASS** — dark: history swipe left → songs, content follows finger without jumps
70. **PASS** — dark: history swipe right → films, content follows finger without jumps
71. **PASS** — dark: history swipe right → books, content follows finger without jumps
72. **PASS** — dark: history edge books → right swipe does nothing, rubber-band returns
73. **PASS** — dark: history edge songs → left swipe does nothing
74. **PASS** — dark: history short tap does not switch category
75. **PASS** — dark: history small slow partial swipe (60px, 700ms) returns smoothly
76. **PASS** — dark: history slow long swipe (190px, 900ms) commits
77. **PASS** — dark: history quick short fling (70px, 70ms) commits
78. **PASS** — dark: history drag out and back (cancelled) keeps category
79. **PASS** — dark: history one very long swipe = one switch
80. **PASS** — dark: history diagonal gesture does not switch
81. **PASS** — dark: history vertical scroll is native and does not switch
82. **PASS** — dark: history touchcancel mid-drag restores state
83. **PASS** — dark: history finger catches the settling animation without a jump
84. **PASS** — dark: history swipe starting on an event row switches; tap on row opens record
85. **PASS** — dark: record view does not swipe categories
86. **PASS** — dark: catalog stays unchanged after all sheet swipes
87. **PASS** — light: stats swipe left → films, content follows finger without jumps
88. **PASS** — light: stats swipe left → songs, content follows finger without jumps
89. **PASS** — light: stats swipe right → films, content follows finger without jumps
90. **PASS** — light: stats swipe right → books, content follows finger without jumps
91. **PASS** — light: stats edge books → right swipe does nothing, rubber-band returns
92. **PASS** — light: stats edge songs → left swipe does nothing
93. **PASS** — light: stats short tap does not switch category
94. **PASS** — light: stats small slow partial swipe (60px, 700ms) returns smoothly
95. **PASS** — light: stats slow long swipe (190px, 900ms) commits
96. **PASS** — light: stats quick short fling (70px, 70ms) commits
97. **PASS** — light: stats drag out and back (cancelled) keeps category
98. **PASS** — light: stats one very long swipe = one switch
99. **PASS** — light: stats diagonal gesture does not switch
100. **PASS** — light: stats vertical scroll is native and does not switch
101. **PASS** — light: stats touchcancel mid-drag restores state
102. **PASS** — light: stats finger catches the settling animation without a jump
103. **PASS** — light: stats swipe starting on a chart is not intercepted
104. **PASS** — light: stats swipe on segmented controls is not intercepted
105. **PASS** — light: stats swipe preserves scroll (clamped to new content)
106. **PASS** — light: history swipe left → films, content follows finger without jumps
107. **PASS** — light: history swipe left → songs, content follows finger without jumps
108. **PASS** — light: history swipe right → films, content follows finger without jumps
109. **PASS** — light: history swipe right → books, content follows finger without jumps
110. **PASS** — light: history edge books → right swipe does nothing, rubber-band returns
111. **PASS** — light: history edge songs → left swipe does nothing
112. **PASS** — light: history short tap does not switch category
113. **PASS** — light: history small slow partial swipe (60px, 700ms) returns smoothly
114. **PASS** — light: history slow long swipe (190px, 900ms) commits
115. **PASS** — light: history quick short fling (70px, 70ms) commits
116. **PASS** — light: history drag out and back (cancelled) keeps category
117. **PASS** — light: history one very long swipe = one switch
118. **PASS** — light: history diagonal gesture does not switch
119. **PASS** — light: history vertical scroll is native and does not switch
120. **PASS** — light: history touchcancel mid-drag restores state
121. **PASS** — light: history finger catches the settling animation without a jump
122. **PASS** — light: history swipe starting on an event row switches; tap on row opens record
123. **PASS** — light: record view does not swipe categories
124. **PASS** — light: catalog stays unchanged after all sheet swipes
125. **PASS** — reduced motion: sheet swipe switches instantly, no content animation
126. **PASS** — reduced motion: catalog swipe still switches
127. **PASS** — catalog: swipe left books → films, right back to books
128. **PASS** — catalog: edge (books, swipe right) does not wrap
129. **PASS** — catalog: partial drag returns and leaves no transforms
130. **PASS** — catalog: vertical scroll native, no switch
131. **PASS** — catalog: each catalog keeps its own scroll position
132. **PASS** — catalog: cancelled swipe followed by opening the menu keeps the original catalog
133. **PASS** — system Back from a record returns to the history list (same category)
134. **PASS** — second system Back closes history and returns to the catalog
135. **PASS** — in-app back from record → list; Escape from record closes without reopening
136. **PASS** — record opened from statistics: in-app back shows history list; close returns to catalog
137. **PASS** — «Открыть в каталоге» closes sheet and jumps to the record
138. **PASS** — reload with a sheet in history state restores that sheet
139. **PASS** — desktop: books reading → read → abandoned are mutually exclusive
140. **PASS** — desktop: «Сейчас читаю» card and pager reflect reading books
141. **PASS** — desktop: download toggle logs history and keeps 201±1 counts
142. **PASS** — desktop: films watching → seen; next card and FAB target advance
143. **PASS** — desktop: FAB «следующее» scrolls to the next record
144. **PASS** — desktop: songs listened/favorite/added/abandoned interplay
145. **PASS** — desktop: filter «Брошено» shows only abandoned, empty message otherwise
146. **PASS** — desktop: description expands and collapses
147. **PASS** — desktop: copy title button gives feedback
148. **PASS** — desktop: many random status toggles keep state consistent
149. **PASS** — desktop: reload preserves marks and history exactly
150. **PASS** — desktop: statistics «Моя активность» and «Коллекция» reflect actions; all periods render
151. **PASS** — desktop: history shows events per category with dates
152. **PASS** — mobile: books reading → read → abandoned are mutually exclusive
153. **PASS** — mobile: «Сейчас читаю» card and pager reflect reading books
154. **PASS** — mobile: download toggle logs history and keeps 201±1 counts
155. **PASS** — mobile: films watching → seen; next card and FAB target advance
156. **PASS** — mobile: FAB «следующее» scrolls to the next record
157. **PASS** — mobile: songs listened/favorite/added/abandoned interplay
158. **PASS** — mobile: filter «Брошено» shows only abandoned, empty message otherwise
159. **PASS** — mobile: description expands and collapses
160. **PASS** — mobile: copy title button gives feedback
161. **PASS** — mobile: many random status toggles keep state consistent
162. **PASS** — mobile: reload preserves marks and history exactly
163. **PASS** — mobile: statistics «Моя активность» and «Коллекция» reflect actions; all periods render
164. **PASS** — mobile: history shows events per category with dates
165. **PASS** — existing CP19 progress in localStorage is read without reset
166. **PASS** — corrupted store: no crash, raw kept in recovery key, notice shown
167. **PASS** — corrupted field types are sanitised (non-boolean / unknown ids ignored)
168. **PASS** — legacy (pre-CP08) key migrates downloads only, once
169. **PASS** — localStorage unavailable: app still works, settings warn
170. **PASS** — export backup JSON (schema 4, signatures, history)
171. **PASS** — import backup into a fresh profile restores marks and history
172. **PASS** — import of invalid / foreign files reports an error and changes nothing
173. **PASS** — «Сохранить каталог с отметками»: saved HTML keeps all data blocks byte-identical and embeds marks
174. **PASS** — saved HTML opens via file:// in a fresh profile with marks and history
175. **PASS** — legacy single-catalog backup (catalogues-v3) restores downloads only
176. **PASS** — clear history and per-section reset keep downloads
177. **PASS** — theme: light/dark/system choice applied and persisted
178. **PASS** — app left open past midnight: «День» in statistics shows the new today
179. **PASS** — layout 360px: no horizontal overflow; tabs, sheets and segments fit
180. **PASS** — layout 390px: no horizontal overflow; tabs, sheets and segments fit
181. **PASS** — layout 736px: no horizontal overflow; tabs, sheets and segments fit
182. **PASS** — layout 1024px: no horizontal overflow; tabs, sheets and segments fit
183. **PASS** — layout 1280px: no horizontal overflow; tabs, sheets and segments fit
184. **PASS** — layout 1440px: no horizontal overflow; tabs, sheets and segments fit
185. **PASS** — 10 000 events: loads, history paginates, stats render, toggles stay fast
186. **PASS** — no uncaught JavaScript exceptions or console.error in any run
