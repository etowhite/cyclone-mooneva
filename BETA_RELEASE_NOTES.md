# cyclone 3.0.0-beta.1 — test build / тестовая сборка

## Русский
Первая тестовая сборка отдельного форка Mooneva с оформлением cyclone.
- Пять цветовых палитр; светлая, тёмная и системная тема.
- Отдельный раздел оформления, язык и начало недели; навигация с подписями.
- Календарь, история циклов, прогнозы, графики и тепловые карты на исходной архитектуре Mooneva.
- Иконка Android меняет палитру вслед за приложением, а яркость — вслед за темой устройства.
- Исправлены контраст и прозрачность текста при переходе на экран настроек.

Установка: скачайте APK и разрешите установку из выбранного источника. Это debug-подписанная beta с отдельным идентификатором com.cyclone.mooneva.debug. Прежний native cyclone остаётся отдельным приложением. Импорт его JSON-бэкапов, перенос его виджетов и биометрии ещё не реализованы в этом форке. Часть исходного интерфейса пока на английском. Проверены 6 контрактных тестов расчётов, TypeScript, web/Android сборка и отдельные сценарии; полная регрессия ещё впереди.

## English
First test build of the separate Mooneva fork with cyclone styling.
- Five palettes; light, dark and system appearance.
- Dedicated appearance, language and week-start settings; labelled navigation.
- Calendar, cycle history, predictions, charts and heatmaps using the upstream Mooneva architecture.
- Android icon palette follows the app; icon brightness follows the device theme.
- Fixed text contrast and opacity during settings transitions.

Install the APK and allow installation from your chosen source. This beta uses debug signing and the separate application ID com.cyclone.mooneva.debug. The original native cyclone remains separate. Its JSON backup migration, widgets and biometric integration have not yet been ported. Some upstream screens remain English-only. Six calculation contract tests, TypeScript, web/Android builds and selected scenarios are checked; full regression testing is still pending.

GPL-3.0-or-later. Based on Mooneva Cycle by its upstream contributors. Exact corresponding project source is available through this release tag and GitHub source archives. Report bugs: https://github.com/etowhite/cyclone-mooneva/issues
