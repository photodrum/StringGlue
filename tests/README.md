# Тесты String Glue / String Glue tests

Имитация объектной модели Illustrator в Node.js: `host.jsx` проходит целиком (анализ → склейка → создание текста), затем раскладка результата сверяется с исходником.

A Node.js mock of the Illustrator object model: `host.jsx` runs end to end (analysis → gluing → text creation), then the result layout is compared with the source.

    node tests/runtests.js     # обычная склейка / regular gluing
    node tests/autotests.js    # режим «Авто» / Auto mode
    node tests/lifetests.js    # готовый текст, графика из PDF, смешанное выделение / existing text, PDF graphics, mixed selections

Проверяются абзацы, базовые линии строк (±0,35 pt), кегль и оформление букв, выключка и отступы, списки, удаление исходников и отсутствие лишних объектов. Перенос строк по ширине рамки не моделируется.

Checked: paragraphs, line baselines (±0.35 pt), character size and decorations, alignment and indents, lists, removal of originals and absence of leftover objects. Wrapping to the frame width is not modeled.
