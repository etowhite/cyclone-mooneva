# cyclone 3.0.0-beta.4 — original pain slider / исходная шкала боли

## Русский
- Шкала боли заменена отдельным переносом параметров оригинальной шкалы из native cyclone (SymptomScreen.kt, Material 3 Slider 1.3.0), вместо прежней стилизации HTML range.
- Те же 0–10 и 9 промежуточных шагов, округление до целой оценки, дорожка 16 dp, бегунок 4×44 dp (2 dp при взаимодействии), промежуток 6 dp и точки 4 dp. Цвета взяты из CyclonePalettes.kt, включая secondaryContainer.
- Сохраняется положение под выделениями и оформление обычным разделом без отдельной рамки. Лишние кнопки прежнего варианта убраны; ноль выбирается нажатием на начало шкалы.
- Проверены нажатие на 0, перетаскивание до 10, управление клавишами и сохранение оценки 6. График боли и средние за выбранный период продолжают работать. Отсутствие оценки остаётся отличным от нуля.

Это перенос в React/WebView параметров исходного Compose-компонента; архитектура форка остаётся прежней. Все изменения beta3 (включая удаление лаборатории) сохранены.

Проверки: TypeScript, 15 тестов, web/Android сборки, сценарии указателя и клавиатуры, сохранение данных и график. Тестовая debug-подписанная сборка для Android 7+, обновляющая предыдущие beta этого форка. Полная регрессия и перенос старых native cyclone JSON-бэкапов/биометрии ещё не завершены.

## English
- Replaced the previous HTML-range styling with a dedicated web port of the original native cyclone pain slider parameters (SymptomScreen.kt, Material 3 Slider 1.3.0).
- Same 0–10 range, nine intermediate steps and integer rounding; 16dp track,4×44dp handle (2dp while interacting),6dp gap and4dp ticks. Colours come from CyclonePalettes.kt, including secondaryContainer.
- The slider remains inline below discharge without its own card border. Extra action buttons from the previous version are removed; tapping the start records zero.
- Verified pointer zero, dragging to10, keyboard control and persisting6. Existing pain-chart selection and date-range averages remain intact; an unrated day is still distinct from zero.

This ports the Compose component parameters into React/WebView; the fork architecture stays intact. Beta3 changes, including Lab removal, are retained.

Validation: TypeScript,15tests,web/Android builds,pointer/keyboard,persistence and chart checks. Debug-signed test build for Android7+,updating previous fork betas. Full regression and original native cyclone JSON/biometric integration are still pending.

GPL-3.0-or-later; Mooneva attribution preserved. Source archives correspond to this tag. Bugs: https://github.com/etowhite/cyclone-mooneva/issues
