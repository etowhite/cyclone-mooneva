# cyclone 3.0.0-beta.2 — test build / тестовая сборка

## Русский
- Исправлены переключатели и обрезанный текст в управлении циклом, серые блоки в отметках беременности/статистики и переносы названий настроения.
- Единый системный шрифт, как в прежнем cyclone. Управление данными и настройка/экран PIN приведены к общему оформлению.
- Оставлены русский и английский; экспериментальная лаборатория переведена на русский.
- Скрытый режим задач убран из интерфейса и вводного обучения; прежняя настройка отключается при загрузке. PIN остаётся.
- Возвращён исходный знак cyclone в календаре и Android иконках. Название установки — cyclone. Палитра иконки следует приложению, яркость — устройству.
- Убрано бесконечное переливание цветов кнопок календаря.
- Подсказки работы, спорта и настроения без эмодзи для выбранного дня. 56 сочетаний на категорию, с осторожным учётом фазы. Подсказки не предсказывают ваше настроение или работоспособность.
- Два виджета: компактный цикл и расширенный с подсказками. Общие данные расчёта и тексты с приложением, тема/язык синхронизируются. Снимки рассчитаны на 70 дней; затем виджет просит открыть приложение вместо показа устаревших значений. Изменения данных в приложении обновляют снимки.

Проверено: TypeScript, production web build, 8 тестов, мобильные настройки и редактор; Android сборка, отображение двух виджетов на API35, смена палитры/темы, отсутствие устаревших данных, открытие приложения по нажатию. Полная регрессия ещё продолжается.

Debug-подписанная тестовая beta, Android 7+. Можно обновить предыдущую beta этого форка. Старый native cyclone — отдельное приложение: импорт его JSON-бэкапа и перенос биометрии пока не готовы. Перед тестами сохраняйте резервную копию нужных данных.

## English
- Fixed cycle settings switches and clipped hints, opaque labels in pregnancy/statistics controls and mood label wrapping.
- Unified system sans-serif typography, matching the original cyclone; consistent data management and PIN setup/unlock styling.
- English and Russian only; experimental Lab fully translated into Russian.
- Removed the task-disguise setting and tutorial; saved disguise mode is disabled on load. PIN protection remains.
- Restored the original cyclone mark in the calendar and Android launcher; installed name is cyclone. Icon palette follows the app, brightness follows the device.
- Removed continuous colour cycling from calendar actions.
- Emoji-free work, exercise and mood suggestions for the selected date, with 56 combinations per category and cautious phase context. They do not predict performance or feelings.
- Compact and detailed Android widgets use the same model and suggestions as the app and follow its theme/language. Dated snapshots cover 70 days; an expired snapshot asks you to open the app rather than displaying stale numbers. App data edits refresh snapshots.

Validation: TypeScript, production web build, eight tests, mobile settings/editor checks; Android build, both widgets on API35, palette/light-dark changes, stale-data fallback and tap-to-open. Full regression is ongoing.

Debug-signed test beta for Android 7+. Updates the previous fork beta. The old native cyclone remains separate: its JSON backup migration and biometric integration are not ready yet. Keep a backup of data you need before testing.

GPL-3.0-or-later, based on Mooneva Cycle. Upstream attribution is preserved. Source archives correspond to this release tag. Bugs: https://github.com/etowhite/cyclone-mooneva/issues
