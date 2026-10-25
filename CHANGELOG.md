# Changelog

## 1.2.9
- Принудительный разрыв строки (Shift+Enter) в готовом тексте в области сохраняется — раньше при склейке он заменялся пробелом, а в запасном разборе строки слипались без пробела. В точечном тексте ручные разрывы строк по-прежнему перевёрстываются в абзац.
  A forced line break (Shift+Enter) in existing area text is kept — it used to be replaced with a space, and the fallback parser glued the lines without a space. In point text, manual line breaks are still re-laid out into a paragraph.

## 1.2.8
- Готовые тексты, стоящие столбиком (карточки отдельными рамками), склеиваются в один текст целиком — ни одна карточка не отваливается из-за чуть большего зазора. Один исходный текст в области больше не режется на несколько. Отдельными остаются только рамки, далеко разнесённые по вертикали (больше 12 кеглей).
  Existing texts stacked in a column (cards in separate frames) are glued into one text as a whole — no card falls off because of a slightly larger gap. One source area text is no longer cut into several. Only frames far apart vertically (more than 12 type sizes) stay separate.
- Текст после склейки больше не смещается вниз: новая рамка повторяет верх исходной и её настройки первой базовой линии и внутреннего отступа, вместо оценки положения первой строки.
  Text no longer shifts down after gluing: the new frame repeats the original frame's top and its first-baseline and inset settings instead of estimating where the first line sits.

## 1.2.7
- Готовый текст в области с переносами по ширине рамки всегда собирается текстом в области, даже если строки заметно короче рамки (раньше такие карточки становились точечным текстом с разрывами строк).
  Existing area text that wraps to its frame is always rebuilt as area text, even when its lines are much shorter than the frame (such cards used to become point text with line breaks).
- Отдельные мелкие тексты и буквы на уровне строк готового текста (значки, точки, подписи рядом) больше не утягивают его строки в «таблицу» — они разбираются отдельно.
  Small separate texts and letters level with the lines of existing text (icons, dots, captions next to it) no longer pull its lines into a “table” — they are processed separately.

## 1.2.6
- Готовые тексты, стоящие рядом по горизонтали (сетка карточек, колонки), разбираются каждый отдельно и больше не режутся на ячейки «таблицы» по общим базовым линиям. Вместе склеиваются только рамки, стоящие друг под другом в одной колонке.
  Existing texts placed side by side (a grid of cards, columns) are processed separately and are no longer cut into “table” cells along shared baselines. Only frames stacked in one column are joined.
- Имя шрифта для сводки «Найдено в выделении» читается запасным способом, если основной не сработал (было «Шрифтов 0»).
  The font name for the “Found in selection” summary falls back to another read method (it showed “Fonts 0”).

## 1.2.5
- Наложенные друг на друга тексты больше не перемешиваются: готовый текст (многострочный и в области) разбирается как отдельный остров. Колонки внахлёст, рамка, уходящая под соседний текст, подпись поверх абзаца, вложенные блоки и строки, стоящие вперемежку, склеиваются каждый в свой текст. Строки из разных рамок не склеиваются в одну строку и не принимаются за таблицу.
  Overlapping texts are no longer mixed: existing text (multi-line and area) is processed as a separate island. Overlapping columns, a frame that runs under the next text, a caption over a paragraph, nested blocks and interleaved lines each end up in their own text. Lines from different frames are never joined into one line or taken for a table.
- Новая серия тестов `tests/matrixtests.js`: 176 сочетаний ширины рамки, кегля (6–48 pt), интерлиньяжа, отбивок и пустых абзацев плюс наложения — каждый случай тремя путями разбора.
  New test suite `tests/matrixtests.js`: 176 combinations of frame width, type size (6–48 pt), leading, paragraph spacing and empty paragraphs plus overlaps, each run through three parsing paths.

## 1.2.4
- Отбивки при перевёрстке готового текста совпадают с исходником: учитывается отбивка после абзаца, интерлиньяж пустых абзацев-распорок берётся у них самих, атрибуты абзаца читаются по символу строки, а не по номеру абзаца (в Illustrator номера могут сбиваться на пустых абзацах — отбивки доставались чужим абзацам).
  Paragraph spacing of re-laid-out text matches the original: space after is taken into account, empty spacer paragraphs keep their own leading, and paragraph attributes are read from the line's characters rather than by paragraph index (in Illustrator the index can drift on empty paragraphs, giving spacing to the wrong paragraph).
- Текст в области сохраняет ширину исходной рамки, поэтому строки переносятся так же, как в оригинале.
  Area text keeps the width of the original frame, so lines wrap exactly as in the original.

## 1.2.3
- Исправлено: в 1.2.2 готовый текст склеивался шрифтом и кеглем по умолчанию, а поверх исходника оставалась копия. Оформление теперь читается из исходного текста, временные копии всегда удаляются, а если оформление прочитать нельзя — склейка отменяется с понятной ошибкой вместо тихой потери шрифтов.
  Fixed: in 1.2.2 existing text was glued with the default font and size, and a copy was left over the original. Formatting is now read from the original text, temporary copies are always removed, and if formatting cannot be read, gluing stops with a clear error instead of silently losing fonts.
- Запасной разбор текста в области больше не даёт всем строкам оформление первого абзаца (жирный заголовок не растекается на весь текст).
  The fallback parser for area text no longer gives every line the first paragraph's formatting (a bold heading no longer spreads over the whole text).

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
