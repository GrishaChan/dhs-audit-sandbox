# CP21 — отчёт об испытаниях

Дата: 5 ноября 2026.

## 1. Итог

| Набор | CP20 | CP21 |
|---|---|---|
| Регрессионный набор (190 именованных проверок) | 166 PASS / 24 FAIL | **190 PASS / 0 FAIL** |
| Диагностика свайпов статистики/истории (28 жестов; 300 и 3 000 событий) | 16 / 28 | **28 / 28** |
| То же, пустая история (26 применимых) | 16 / 26 | **26 / 26** |
| Свайп основного каталога (7 траекторий) | 7 / 7 | 7 / 7 |
| Эмуляция ограничений непрозрачного источника (`content://`) | работает, **3 необработанные ошибки** | работает, **0 ошибок** |
| Целостность данных | — | **PASS** |

## 2. Среда и ограничения

- **Chromium 153.0.8010.12 headless, Playwright 1.63, Linux** — единственный доступный движок. Firefox/WebKit не установлены (установка запрещена правилами окружения).
- **Samsung Internet и физический смартфон Samsung не испытывались.** Мобильный режим — эмуляция Chromium (390×844, `isMobile`, `hasTouch`; ширины 360/736), сенсорный ввод через CDP `Input.dispatchTouchEvent` (`isTrusted=true`). **Это не испытание на устройстве.** Критерии ручной проверки — в CP21_PENDING.
- **Открытие через `content://` на Android воспроизвести нельзя.** Вместо этого проверены два заменителя (раздел 5).
- Все проверки — в изолированных профилях через `file://`; реальные пользовательские данные не использовались.

## 3. Регрессионный набор (`tools/regress.js`)

Набор CP20 (186 проверок), адаптированный к намеренным изменениям CP21, плюс 4 новые проверки единой системы переключателей. Изменения ожиданий, все обоснованы заданием CP21:
- «активный пункт выделен» теперь означает: рамка **1 px** как у главной капсулы, форма капсулы, текст в цвете категории, отличие фона ≥ 8, отличие цвета текста ≥ 40, контраст ≥ 4,5:1 (в CP20 требовалась рамка 2 px и отличие фона ≥ 25);
- свайп, начатый на графике или на сегментном переключателе, теперь **должен** переключать категорию (в CP20 — не должен);
- новая проверка «главная капсула и все сегменты — одна система» (рамка 1 px, капсула, одинаковый цвет текста активного пункта) — 2 темы × 2 компоновки.

Остальные проверки CP20 сохранены без изменений:
- открытие экранов из каждого каталога и во время анимации перехода;
- клавиатура;
- все сценарии свайпов (медленные, быстрые, отменённые, `touchcancel`, перехват анимации, края, диагональ, вертикаль, сохранение прокрутки, сниженная анимация);
- кнопка «Назад»;
- статусы и их взаимоисключение, фильтр, описания, копирование;
- статистика по периодам, история;
- работа после полуночи, 10 000 событий;
- совместимость хранилища, миграция, повреждённые данные;
- экспорт/импорт, «Сохранить каталог»;
- тема, адаптивность 360–1440 px;
- отсутствие ошибок JS.

Провалы CP20 на наборе CP21 — ровно намеренные изменения:

| Проверка | Провалов CP20 |
|---|---|
| stats levels 1-3 clearly highlighted on books | 4 |
| stats levels 1-3 clearly highlighted on films | 4 |
| stats levels 1-3 clearly highlighted on songs | 4 |
| history category highlight and theme radio highlight | 4 |
| main capsule and all segment toggles share one style system | 4 |
| stats swipe starting on a chart switches category (charts have no own gestures) | 2 |
| stats swipe starting on a segmented control switches category | 2 |

## 4. Диагностика жестов (`tools/gesture.js`)

См. CP21_GESTURE_REPORT, раздел 1 — таблица по 14 сценариям для обоих экранов: 0, 300 и 3 000 событий, CP20 и CP21. Свайп основного каталога (`tools/catgesture.js`): прямо, дуга 12/18 px, диагональ 30°, после инерционной прокрутки, начало на кнопке карточки, вертикальная прокрутка — 7/7 в обеих версиях.

## 5. Автономность и `content://`

- **`file://` без сети.** Регрессионный набор целиком выполняется через `file://`; внешних запросов нет.
- **Заменитель 1 — изолированный iframe (`sandbox="allow-scripts"`).** Источник действительно непрозрачный (`origin = "null"`); `localStorage` и `history.replaceState` выбрасывают `SecurityError`. CP20 выдаёт необработанную ошибку `replaceState` при смене каталога; **CP21 — без ошибок**. Отметки работают в памяти, настройки предупреждают о недоступном хранилище. Свайп *каталога* внутри iframe не срабатывает в обеих версиях, в том числе в iframe без `sandbox`: это ограничение встраивания в iframe, а не непрозрачного источника. Файл `content://` открывается как страница верхнего уровня.
- **Заменитель 2 — страница верхнего уровня с теми же ограничениями** (`localStorage` и `pushState/replaceState` с URL выбрасывают `SecurityError`, как в iframe выше):

| | CP20 | CP21 |
|---|---|---|
| Смена каталога нажатием и свайпом в обе стороны | да | да |
| Отметки в памяти | да | да |
| История: открытие, запись, возврат, свайп категории | да | да |
| Статистика: свайп; Escape закрывает | да | да |
| Необработанные ошибки JavaScript | **3** | **0** |

Что это **не** доказывает: поведение конкретного Samsung Internet / Chrome Android с `content://` (поддержка `localStorage`, `pushState`, загрузок) не проверено. Ограничение и ручные критерии — в CP21_PENDING.

## 6. Целостность данных (`tools/datacheck.py`, CP20 → CP21)

- `data-books`, `data-films`, `data-songs`, `boot`: побайтно идентичны.
- 496 / 500 / 500 записей; id, порядок и все поля совпадают.
- `ART_IMG` и `MINI` (утверждённые иконки): побайтно идентичны.
- Встроенные скачивания: 201 / 0 / 0; встроенная история пуста.
- Синтаксис JS (`node --check`): OK.
- Ключи `localStorage`, формат резервных копий, миграция CP08: не изменялись. Совместимость с данными CP19/CP20 проверена тестами набора: чтение существующего прогресса, перенос старого ключа, импорт/экспорт.

## 7. Поимённый протокол CP21

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
34. **PASS** — desktop/light: main capsule and all segment toggles share one style system
35. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on books
36. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on films
37. **PASS** — desktop/dark: stats levels 1-3 clearly highlighted on songs
38. **PASS** — desktop/dark: history category highlight and theme radio highlight
39. **PASS** — desktop/dark: main capsule and all segment toggles share one style system
40. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on books
41. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on films
42. **PASS** — mobile/light: stats levels 1-3 clearly highlighted on songs
43. **PASS** — mobile/light: history category highlight and theme radio highlight
44. **PASS** — mobile/light: main capsule and all segment toggles share one style system
45. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on books
46. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on films
47. **PASS** — mobile/dark: stats levels 1-3 clearly highlighted on songs
48. **PASS** — mobile/dark: history category highlight and theme radio highlight
49. **PASS** — mobile/dark: main capsule and all segment toggles share one style system
50. **PASS** — keyboard: stats category arrows bounded, Home/End, focus kept
51. **PASS** — keyboard: history arrows bounded; Escape closes sheet and restores focus
52. **PASS** — keyboard: main tabs arrow navigation
53. **PASS** — dark: stats swipe left → films, content follows finger without jumps
54. **PASS** — dark: stats swipe left → songs, content follows finger without jumps
55. **PASS** — dark: stats swipe right → films, content follows finger without jumps
56. **PASS** — dark: stats swipe right → books, content follows finger without jumps
57. **PASS** — dark: stats edge books → right swipe does nothing, rubber-band returns
58. **PASS** — dark: stats edge songs → left swipe does nothing
59. **PASS** — dark: stats short tap does not switch category
60. **PASS** — dark: stats small slow partial swipe (60px, 700ms) returns smoothly
61. **PASS** — dark: stats slow long swipe (190px, 900ms) commits
62. **PASS** — dark: stats quick short fling (70px, 70ms) commits
63. **PASS** — dark: stats drag out and back (cancelled) keeps category
64. **PASS** — dark: stats one very long swipe = one switch
65. **PASS** — dark: stats diagonal gesture does not switch
66. **PASS** — dark: stats vertical scroll is native and does not switch
67. **PASS** — dark: stats touchcancel mid-drag restores state
68. **PASS** — dark: stats finger catches the settling animation without a jump
69. **PASS** — dark: stats swipe starting on a chart switches category (charts have no own gestures)
70. **PASS** — dark: stats swipe starting on a segmented control switches category
71. **PASS** — dark: stats swipe preserves scroll (clamped to new content)
72. **PASS** — dark: history swipe left → films, content follows finger without jumps
73. **PASS** — dark: history swipe left → songs, content follows finger without jumps
74. **PASS** — dark: history swipe right → films, content follows finger without jumps
75. **PASS** — dark: history swipe right → books, content follows finger without jumps
76. **PASS** — dark: history edge books → right swipe does nothing, rubber-band returns
77. **PASS** — dark: history edge songs → left swipe does nothing
78. **PASS** — dark: history short tap does not switch category
79. **PASS** — dark: history small slow partial swipe (60px, 700ms) returns smoothly
80. **PASS** — dark: history slow long swipe (190px, 900ms) commits
81. **PASS** — dark: history quick short fling (70px, 70ms) commits
82. **PASS** — dark: history drag out and back (cancelled) keeps category
83. **PASS** — dark: history one very long swipe = one switch
84. **PASS** — dark: history diagonal gesture does not switch
85. **PASS** — dark: history vertical scroll is native and does not switch
86. **PASS** — dark: history touchcancel mid-drag restores state
87. **PASS** — dark: history finger catches the settling animation without a jump
88. **PASS** — dark: history swipe starting on an event row switches; tap on row opens record
89. **PASS** — dark: record view does not swipe categories
90. **PASS** — dark: catalog stays unchanged after all sheet swipes
91. **PASS** — light: stats swipe left → films, content follows finger without jumps
92. **PASS** — light: stats swipe left → songs, content follows finger without jumps
93. **PASS** — light: stats swipe right → films, content follows finger without jumps
94. **PASS** — light: stats swipe right → books, content follows finger without jumps
95. **PASS** — light: stats edge books → right swipe does nothing, rubber-band returns
96. **PASS** — light: stats edge songs → left swipe does nothing
97. **PASS** — light: stats short tap does not switch category
98. **PASS** — light: stats small slow partial swipe (60px, 700ms) returns smoothly
99. **PASS** — light: stats slow long swipe (190px, 900ms) commits
100. **PASS** — light: stats quick short fling (70px, 70ms) commits
101. **PASS** — light: stats drag out and back (cancelled) keeps category
102. **PASS** — light: stats one very long swipe = one switch
103. **PASS** — light: stats diagonal gesture does not switch
104. **PASS** — light: stats vertical scroll is native and does not switch
105. **PASS** — light: stats touchcancel mid-drag restores state
106. **PASS** — light: stats finger catches the settling animation without a jump
107. **PASS** — light: stats swipe starting on a chart switches category (charts have no own gestures)
108. **PASS** — light: stats swipe starting on a segmented control switches category
109. **PASS** — light: stats swipe preserves scroll (clamped to new content)
110. **PASS** — light: history swipe left → films, content follows finger without jumps
111. **PASS** — light: history swipe left → songs, content follows finger without jumps
112. **PASS** — light: history swipe right → films, content follows finger without jumps
113. **PASS** — light: history swipe right → books, content follows finger without jumps
114. **PASS** — light: history edge books → right swipe does nothing, rubber-band returns
115. **PASS** — light: history edge songs → left swipe does nothing
116. **PASS** — light: history short tap does not switch category
117. **PASS** — light: history small slow partial swipe (60px, 700ms) returns smoothly
118. **PASS** — light: history slow long swipe (190px, 900ms) commits
119. **PASS** — light: history quick short fling (70px, 70ms) commits
120. **PASS** — light: history drag out and back (cancelled) keeps category
121. **PASS** — light: history one very long swipe = one switch
122. **PASS** — light: history diagonal gesture does not switch
123. **PASS** — light: history vertical scroll is native and does not switch
124. **PASS** — light: history touchcancel mid-drag restores state
125. **PASS** — light: history finger catches the settling animation without a jump
126. **PASS** — light: history swipe starting on an event row switches; tap on row opens record
127. **PASS** — light: record view does not swipe categories
128. **PASS** — light: catalog stays unchanged after all sheet swipes
129. **PASS** — reduced motion: sheet swipe switches instantly, no content animation
130. **PASS** — reduced motion: catalog swipe still switches
131. **PASS** — catalog: swipe left books → films, right back to books
132. **PASS** — catalog: edge (books, swipe right) does not wrap
133. **PASS** — catalog: partial drag returns and leaves no transforms
134. **PASS** — catalog: vertical scroll native, no switch
135. **PASS** — catalog: each catalog keeps its own scroll position
136. **PASS** — catalog: cancelled swipe followed by opening the menu keeps the original catalog
137. **PASS** — system Back from a record returns to the history list (same category)
138. **PASS** — second system Back closes history and returns to the catalog
139. **PASS** — in-app back from record → list; Escape from record closes without reopening
140. **PASS** — record opened from statistics: in-app back shows history list; close returns to catalog
141. **PASS** — «Открыть в каталоге» closes sheet and jumps to the record
142. **PASS** — reload with a sheet in history state restores that sheet
143. **PASS** — desktop: books reading → read → abandoned are mutually exclusive
144. **PASS** — desktop: «Сейчас читаю» card and pager reflect reading books
145. **PASS** — desktop: download toggle logs history and keeps 201±1 counts
146. **PASS** — desktop: films watching → seen; next card and FAB target advance
147. **PASS** — desktop: FAB «следующее» scrolls to the next record
148. **PASS** — desktop: songs listened/favorite/added/abandoned interplay
149. **PASS** — desktop: filter «Брошено» shows only abandoned, empty message otherwise
150. **PASS** — desktop: description expands and collapses
151. **PASS** — desktop: copy title button gives feedback
152. **PASS** — desktop: many random status toggles keep state consistent
153. **PASS** — desktop: reload preserves marks and history exactly
154. **PASS** — desktop: statistics «Моя активность» and «Коллекция» reflect actions; all periods render
155. **PASS** — desktop: history shows events per category with dates
156. **PASS** — mobile: books reading → read → abandoned are mutually exclusive
157. **PASS** — mobile: «Сейчас читаю» card and pager reflect reading books
158. **PASS** — mobile: download toggle logs history and keeps 201±1 counts
159. **PASS** — mobile: films watching → seen; next card and FAB target advance
160. **PASS** — mobile: FAB «следующее» scrolls to the next record
161. **PASS** — mobile: songs listened/favorite/added/abandoned interplay
162. **PASS** — mobile: filter «Брошено» shows only abandoned, empty message otherwise
163. **PASS** — mobile: description expands and collapses
164. **PASS** — mobile: copy title button gives feedback
165. **PASS** — mobile: many random status toggles keep state consistent
166. **PASS** — mobile: reload preserves marks and history exactly
167. **PASS** — mobile: statistics «Моя активность» and «Коллекция» reflect actions; all periods render
168. **PASS** — mobile: history shows events per category with dates
169. **PASS** — existing CP19 progress in localStorage is read without reset
170. **PASS** — corrupted store: no crash, raw kept in recovery key, notice shown
171. **PASS** — corrupted field types are sanitised (non-boolean / unknown ids ignored)
172. **PASS** — legacy (pre-CP08) key migrates downloads only, once
173. **PASS** — localStorage unavailable: app still works, settings warn
174. **PASS** — export backup JSON (schema 4, signatures, history)
175. **PASS** — import backup into a fresh profile restores marks and history
176. **PASS** — import of invalid / foreign files reports an error and changes nothing
177. **PASS** — «Сохранить каталог с отметками»: saved HTML keeps all data blocks byte-identical and embeds marks
178. **PASS** — saved HTML opens via file:// in a fresh profile with marks and history
179. **PASS** — legacy single-catalog backup (catalogues-v3) restores downloads only
180. **PASS** — clear history and per-section reset keep downloads
181. **PASS** — theme: light/dark/system choice applied and persisted
182. **PASS** — app left open past midnight: «День» in statistics shows the new today
183. **PASS** — layout 360px: no horizontal overflow; tabs, sheets and segments fit
184. **PASS** — layout 390px: no horizontal overflow; tabs, sheets and segments fit
185. **PASS** — layout 736px: no horizontal overflow; tabs, sheets and segments fit
186. **PASS** — layout 1024px: no horizontal overflow; tabs, sheets and segments fit
187. **PASS** — layout 1280px: no horizontal overflow; tabs, sheets and segments fit
188. **PASS** — layout 1440px: no horizontal overflow; tabs, sheets and segments fit
189. **PASS** — 10 000 events: loads, history paginates, stats render, toggles stay fast
190. **PASS** — no uncaught JavaScript exceptions or console.error in any run
