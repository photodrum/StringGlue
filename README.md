# String Glue

**Русский** · [English](#english)

Бесплатная панель для Adobe Illustrator, которая склеивает «рассыпанный» текст в нормальные строки и абзацы и переверстывает готовый текст логичнее.

После открытия PDF или SVG текст часто распадается: каждая буква, слово или строка — отдельный объект. Править такой текст невозможно. String Glue собирает его обратно: строки встают на свои базовые линии, сохраняются шрифт, кегль, цвет, интерлиньяж, выключка, отбивки и оформление.

## Возможности

**Режимы склейки**

| Режим | Что получается |
|---|---|
| **Авто** | Плагин сам делит выделение на блоки: заголовки, абзацы, списки, ячейки таблиц, колонки — и склеивает каждый. Готовый текст переверстывает логичнее. |
| **Абзац в области** | Строки склеиваются в абзацы, текст переносится по ширине рамки. |
| **Сохранить строки** | Один объект, разбивка на строки как в макете (разрыв строки). |
| **В одну строку** | Всё выделенное — одной строкой, удобно для заголовков. |
| **Строки по отдельности** | Каждая строка — отдельный текстовый объект. |

**Что сохраняется и распознаётся**

- Шрифт, кегль, цвет заливки и обводки, масштаб, смещение базовой линии (индексы), подчёркивание и зачёркивание.
- Базовые линии каждой строки: интерлиньяж и отбивки подбираются так, чтобы текст встал точно на место.
- Абзацы — по отбивкам, смене стиля (заголовок → подпись), красной строке; равномерный список «заголовок + подпись» остаётся одним блоком.
- Выключка влево, по центру, вправо — для каждого абзаца отдельно; красная строка и отступы.
- Пробелы — по зазорам между буквами, в том числе при разрядке; переносы «-» в конце строки можно убрать.
- Списки с маркерами и номерами — с висячим отступом и табуляцией.
- Таблицы — по ячейкам; колонки текста — отдельными блоками.
- Из PDF: тонкие линии под словами превращаются в подчёркивание или зачёркивание, кружки-маркеры — в «•». Фон, линейки-разделители и значки не трогаются.
- Готовый текст (точечный и в области): абзацы, порезанные на строки вручную, склеиваются; пустые абзацы-распорки становятся отбивками; разрезанный на несколько объектов абзац собирается в один; ручные разрывы коротких строк сохраняются.

**Панель**

- Секция «Найдено в выделении» до склейки показывает, как плагин понял выделение: схему строк или мини-карту блоков, кегль, интерлиньяж, выключку, размер таблицы.
- Рамки найденных блоков на артборде (временный непечатаемый слой, убирается при склейке).
- Точность распознавания настраивается ползунками: порог пробела, нового абзаца, колонки.
- Светлая и тёмная тема Illustrator, русский и английский интерфейс.
- Клавиши: 1–5 — режимы, F2 или Enter — склеить (когда панель активна).

Не обрабатываются: текст по контуру, связанные рамки, повёрнутый и вертикальный текст — такие объекты остаются на месте, в статусе указано, сколько пропущено.

## Установка

Нужен Adobe Illustrator 2018 (22.0) или новее.

**Windows:** распакуйте архив и запустите `install.bat`.
**macOS:** распакуйте архив и запустите `install.command` (при первом запуске: правый клик → «Открыть»).

Установщик копирует панель в папку расширений Adobe и разрешает загрузку неподписанных расширений (`PlayerDebugMode`). Права администратора не нужны. Перезапустите Illustrator и откройте **Окно → Расширения → String Glue**.

## Как пользоваться

1. Выделите инструментом «Выделение» (V) буквы, строки или готовые текстовые блоки — можно всю карточку целиком.
2. Выберите режим. Для сложных макетов — «Авто»: раскройте «Найдено в выделении», чтобы увидеть блоки до склейки.
3. Нажмите «Склеить». Исходные объекты удаляются или скрываются (настройка «Исходные»).

Если пробелы или абзацы распознались не так — подвиньте ползунки в секции «Точность» и склейте ещё раз (Ctrl+Z / Cmd+Z возвращает исходник).

## Тесты

В папке `tests` — имитация объектной модели Illustrator для Node.js и набор сценариев (обычная склейка, режим «Авто», готовый текст, графика из PDF, смешанное выделение):

```
node tests/runtests.js
node tests/autotests.js
node tests/lifetests.js
node tests/matrixtests.js
```

## Поддержать автора

Плагин бесплатный. Если он сэкономил вам время, можно [угостить автора кофе на Boosty](https://boosty.to/photodrum/donate) ☕

## Автор

Denis Lampusov · © 2026

---

<a id="english"></a>

# String Glue

[Русский](#string-glue) · **English**

A free Adobe Illustrator panel that glues “scattered” text back into proper lines and paragraphs and re-lays out existing text more logically.

After opening a PDF or SVG, text often falls apart: every letter, word or line becomes a separate object that is impossible to edit. String Glue puts it back together: lines land on their original baselines, and font, size, color, leading, alignment, paragraph spacing and decorations are preserved.

## Features

**Glue modes**

| Mode | Result |
|---|---|
| **Auto** | Splits the selection into blocks — headings, paragraphs, lists, table cells, columns — and glues each one. Re-lays out existing text more logically. |
| **Area paragraph** | Lines are joined into paragraphs; text wraps to the frame width. |
| **Keep lines** | One object, line breaks as in the layout (forced line breaks). |
| **Single line** | Everything selected becomes one line — handy for headings. |
| **Separate lines** | Each line becomes its own text object. |

**What is preserved and recognized**

- Font, size, fill and stroke color, scaling, baseline shift (super/subscripts), underline and strikethrough.
- The baseline of every line: leading and paragraph spacing are chosen so the text lands exactly in place.
- Paragraphs — by spacing, style changes (heading → caption) and first-line indents; an even “heading + caption” list stays one block.
- Left, center and right alignment per paragraph; first-line and left indents.
- Spaces — from gaps between letters, including letter-spaced text; end-of-line hyphens can be removed.
- Bulleted and numbered lists — with a hanging indent and a tab.
- Tables — cell by cell; text columns — as separate blocks.
- From PDF: thin lines under words become underline or strikethrough, circle bullets become “•”. Backgrounds, rules and icons are left untouched.
- Existing text (point and area): paragraphs broken into lines by hand are rejoined; empty spacer paragraphs become paragraph spacing; a paragraph split into several objects is merged; intentional breaks in short lines are kept.

**Panel**

- The “Found in selection” section shows how the selection was understood before gluing: a line diagram or a block map, size, leading, alignment, table size.
- Frames of the detected blocks on the artboard (a temporary non-printing layer, removed when gluing).
- Recognition precision sliders: space, new paragraph and column thresholds.
- Light and dark Illustrator themes, Russian and English UI.
- Keys: 1–5 — modes, F2 or Enter — glue (while the panel is active).

Not processed: text on a path, threaded frames, rotated and vertical text — such objects stay in place, and the status shows how many were skipped.

## Installation

Requires Adobe Illustrator 2018 (22.0) or later.

**Windows:** unzip the archive and run `install.bat`.
**macOS:** unzip the archive and run `install.command` (first time: right-click → Open).

The installer copies the panel to the Adobe extensions folder and allows unsigned extensions to load (`PlayerDebugMode`). No admin rights needed. Restart Illustrator and open **Window → Extensions → String Glue**.

## Usage

1. Select letters, lines or existing text blocks with the Selection tool (V) — the whole card is fine.
2. Choose a mode. For complex layouts use “Auto”: expand “Found in selection” to see the blocks before gluing.
3. Click “Glue”. The originals are deleted or hidden (the “Originals” setting).

If spaces or paragraphs were recognized wrongly, move the sliders in “Precision” and glue again (Ctrl+Z / Cmd+Z brings the original back).

## Tests

The `tests` folder contains a Node.js mock of the Illustrator object model and a set of scenarios (regular gluing, Auto mode, existing text, PDF graphics, mixed selections):

```
node tests/runtests.js
node tests/autotests.js
node tests/lifetests.js
node tests/matrixtests.js
```

## Support the author

The plugin is free. If it saved you time, you can [buy the author a coffee on Boosty](https://boosty.to/photodrum/donate) ☕

## Author

Denis Lampusov · © 2026
