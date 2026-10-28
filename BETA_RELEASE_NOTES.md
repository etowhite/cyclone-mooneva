# cyclone 3.0.0-beta.3 — test build / тестовая сборка

## Русский
- Полностью удалена лаборатория: экраны, вкладка, настройки, таймеры и её экспорт. Старые уведомления отменяются. Основные записи из прежних резервных копий продолжают импортироваться.
- Единый стиль кнопок и вариантов выбора по всему приложению: скругления, контуры, шрифт и цвет выбранного пункта.
- Исправлены вытянутые переключатели резервных копий: компактная горизонтальная форма 40×24. Диалог контрацепции оформлен в выбранной теме без эмодзи.
- Детский режим: описание раскрывается по нажатию на название/«Подробнее» и при переключении. Оно объясняет, какие поля скрываются и что прежние записи сохраняются.
- Первый запуск переведён, выбор русского/английского центрирован, добавлен статичный фон с градиентом и точками. Цель выделяется обводкой вместо точки.
- Подсказки в календаре и виджетах скрыты, пока нет данных о дне цикла.
- Во вкладке «Тело» сразу после выделений появилась оценка боли 0–10. Шкала с точками, заполненной частью и вертикальным бегунком следует цветовой теме; оформлена обычным разделом без отдельной рамки. «Нет боли» сохраняет ноль, «Убрать оценку» удаляет только оценку.
- В аналитике — интерактивный график боли: касание/перемещение по точкам, дата и значение, кнопки перехода между отметками, среднее за выбранные 30/90/180/365 дней. Дни без оценки не считаются нулём, будущие записи не входят в среднее, пропуски не соединяются линией.
- Добавлена обводка блоку настроения по фазам, в том числе при отсутствии данных.

Проверки: TypeScript, production web/Android build, 15 тестов. Мобильный UI проверен на 360/412 px: первый запуск, контуры, переключатели, детский режим и диалог. Боль 6 сохраняется; на тестовых данных среднее за 90 дней — 4,5, за 30 дней — 7; выбор точки работает. Проверены сохранение нуля, границы периода и совместимость прежних резервных копий с сохранением PIN текущего устройства.

Тестовая debug-подписанная версия для Android 7+. Устанавливается поверх beta 1/2 этого форка. Старое native-приложение cyclone остаётся отдельным: перенос его JSON-бэкапов и биометрии ещё не завершён. Полная регрессия продолжается. Сохраняйте резервную копию нужных данных перед тестами.

## English
- Removed Lab entirely: its screens, tab, settings, timers and exports. Pending legacy reminders are cancelled. Core data from older backups still imports.
- Unified pill-style actions/options throughout the app, including theme-aware selection, borders, corners and typography.
- Fixed stretched backup switches (40×24 horizontal controls). Contraception choices now use the selected theme without emoji.
- Kid mode explains its effect when its title/details or switch is pressed; existing entries are preserved.
- Localised first-run screen, centred English/Russian selection, static dotted gradient background and outlined goal selection instead of a dot.
- Calendar/widget suggestions stay hidden until a cycle day is available.
- Added optional daily pain 0–10 immediately below discharge in Body. The themed dotted track and vertical thumb match the reference, presented as an inline section. Zero and an absent rating remain distinct.
- Interactive pain analytics: point selection/dragging, date/value, previous/next entries and an average for the selected 30/90/180/365 days. Missing ratings are not zero, future entries are excluded and gaps are not joined.
- Added the missing mood-by-phase card outline, including its empty state.

Validation: TypeScript, production web/Android builds, 15 tests; mobile UI checks at 360/412 px. Pain 6 persists; fixture means are 4.5 over 90 days and 7 over 30 days, with interactive selection verified. Tests cover zero/missing ratings, date boundaries and legacy backup compatibility while preserving the device PIN policy.

Debug-signed test build for Android 7+, updating fork beta 1/2. The original native cyclone remains separate; its JSON migration and biometric integration are not finished. Full regression is ongoing. Back up data you need before testing.

GPL-3.0-or-later; based on Mooneva Cycle, attribution preserved. Source archives match this release tag. Bugs: https://github.com/etowhite/cyclone-mooneva/issues
