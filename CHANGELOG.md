# Changelog

## 1.2.2
- Исправлена ошибка «the value would result in an illegal text range» на готовом тексте с пустыми абзацами (например, между карточками).
  Fixed “the value would result in an illegal text range” on existing text with empty paragraphs (e.g. between cards).

## 1.2.1
- Новый текст всегда ложится наверх — в верхний видимый незаблокированный слой, поверх плашек и фонов.
  New text is always placed on top — in the topmost visible unlocked layer, above plates and backgrounds.
- Столбец значков или чисел, выделенный отдельно от таблицы, склеивается построчно, а не в один абзац.
  A column of symbols or numbers selected apart from its table is glued row by row instead of into one paragraph.
- Склеенный текст в области снова можно выделить и склеить (раньше считался связанным).
  Glued area text can be selected and glued again (it was mistaken for threaded text).

## 1.2
- Режим «Авто»: деление выделения на блоки — заголовки, абзацы, списки, таблицы по ячейкам, колонки; мини-карта блоков и рамки на артборде.
  Auto mode: splits the selection into blocks — headings, paragraphs, lists, tables by cell, columns; block map and artboard frames.
- Перевёрстка готового текста (точечного и в области): склейка порезанных абзацев, отбивки вместо пустых абзацев, сохранение ручных разрывов.
  Re-layout of existing point and area text: rejoins hand-broken paragraphs, spacing instead of empty paragraphs, keeps intentional breaks.
- Списки с висячим отступом; подчёркивание и зачёркивание; линии и маркеры-кружки из PDF.
  Lists with hanging indents; underline and strikethrough; lines and circle bullets from PDF.
- Точные базовые линии: интерлиньяж по стилям, отбивки, крупные слова в строке, красная строка, выключка по абзацам.
  Exact baselines: per-style leading, spacing, large words in a line, first-line indents, per-paragraph alignment.
- Пропуск текста по контуру, связанного, повёрнутого и вертикального текста.
  Text on a path, threaded, rotated and vertical text are skipped.
- Установщик для macOS. / macOS installer.

## 1.1
- Новый интерфейс: переключатель режимов, секция «Найдено в выделении», пороги распознавания, русский и английский, кнопка поддержки автора.
  New UI: mode switch, “Found in selection” section, recognition thresholds, Russian and English, support button.
- Кернинг для кириллицы, атрибуты отрезками (быстрее), обводка букв, подгонка высоты рамки.
  Cyrillic kerning, attributes applied in runs (faster), letter strokes, frame height fitting.

## 1.0
- Первая версия: склейка букв и строк в абзацы, четыре режима.
  First version: gluing letters and lines into paragraphs, four modes.
