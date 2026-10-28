# 1. Текущая цель
Подготовить первую тестовую beta APK отдельного форка cyclone на базе Mooneva и опубликовать исходники и prerelease на GitHub.

# 2. Выполненные шаги
- Отдельный fork: https://github.com/etowhite/cyclone-mooneva, cyclone/design, PR #1. GPL-3.0-or-later и авторство сохранены. Старый ../cyclone отдельно.
- Пять палитр, auto/light/dark, контуры карточек, отдельное оформление с языком и началом недели, навигация с подписями. Исправлены белые полосы, тени и селекты.
- Десять Android иконок: палитра приложения и светлый/тёмный режим устройства. API35 аудит подтвердил одну иконку, смену в фоне и Todo override. Опубликовано в 40df682.
- Следующий UI этап: заголовки cyclone/Аналитика, карточка о форке вместо ваучера, собственные issues, RU/EN release notes, контуры и выбранный диапазон аналитики.
- Исправлена нечитаемость при переходе: opacity остаётся 1 на 0/100/750 ms; текст rgb(240,230,244) на фоне rgb(23,18,25). JS ошибок нет. Mobile Chrome 412×915: синтетическая история 28/30/32 дала среднее 30, месячные 5, три цикла и heatmap.
- tsc, web production build и 6 контрактных тестов расчётов прошли. Services/logic не изменялись; это не полная проверка всей медицинской логики.

# 3. Текущий статус и проблемы
Собирается 3.0.0-beta.1, versionCode 26, debug-подпись, package com.cyclone.mooneva.debug. Это отдельная тестовая установка. Полного переноса функций старого native cyclone ещё нет: миграция бэкапа, виджеты и биометрия ожидают интеграции. Не обещать готовность этих функций.
JDK21/SDK36/Gradle8.14.3 в ../.toolchain. На 8GB машине не запускать Gradle и эмулятор одновременно. Использовать только собственный 5574, никогда 5554.

# 4. Следующие шаги
1. Дождаться Android сборки, проверить подпись, package/version и запуск APK.
2. Зафиксировать текущие изменения, push в PR #1 и проверить CI именно нового commit.
3. Опубликовать GitHub prerelease с APK, SHA256, RU/EN описанием и точными исходниками по тегу.
4. Обновить этот журнал и CONTINUE_PROMPT.md результатами и ссылками.
5. Дальше issues #2 (mobile QA) и #3 (native интеграция/миграция). Перед изменениями читать и обновлять DEVLOG; отчёты о журнале в чат не нужны. Держать CONTINUE_PROMPT готовым до любого лимита. Не коммитить ключи, SDK, dist, node_modules и личные данные.

- Beta Android BUILD SUCCESSFUL 1m15s; aapt подтвердил com.cyclone.mooneva.debug / 3.0.0-beta.1 / code26 / min24, apksigner v2 VALID. Собственный Gradle daemon остановлен перед проверкой запуска на 5574. Удаляем лишнюю пустую строку build.gradle перед commit.

- Commit 0633c1f опубликован в PR #1; оба GitHub web CI SUCCESS. Emulator первый запуск: AVD не найден без ANDROID_AVD_HOME, перезапущен с правильным .toolchain/avd. Установка до окончания загрузки дала системный PackageManagerInternal null, ждём boot_completed перед повтором. Это ещё не результат проверки приложения.

- Beta установлена на собственный API35 emulator5574: install Success, MainActivity запущена, процесс жив, native crash buffer пуст. WebView CDP подтвердил document.readyState=complete и отображаемый onboarding со всеми языками и кнопкой Continue. Первый ранний скрин был до загрузки JS, повторный проверяется. Предыдущий UI аудит Chrome покрывает настройки/календарь/аналитику. CI0633c1f оба SUCCESS.

- Финальный code/source head d0fbd7b, оба CI SUCCESS. Проверенный APK 5 890 342 bytes, SHA256 b610d48146bf8a428fa905940b305638224d42cc320d70778950d4763d7e6fbe. Собственный5574 выключен, forwarding9223 снят. Публикуем prerelease v3.0.0-beta.1 с exact target d0fbd7b, APK и SHA256SUMS; source archives по этому тегу. Локальный файл ../releases/cyclone-mooneva-3.0.0-beta.1/.

- ГОТОВО: prerelease опубликован https://github.com/etowhite/cyclone-mooneva/releases/tag/v3.0.0-beta.1 . GitHub подтвердил isPrerelease=true, оба assets uploaded; server SHA256 APK совпадает с локальным b610d48146bf8a428fa905940b305638224d42cc320d70778950d4763d7e6fbe. Release source target d0fbd7b. Проверенный screenshot ../verification/fork-beta-launch.png показывает читаемый onboarding. Текущая цель beta завершена; дальше issues #2/#3, без обещаний ещё не перенесённых функций.

- 2026-10-28: пользователь запросил защиту main по предупреждению GitHub. Подтверждено: default main, public, protection отсутствует, rulesets пусты. Настраиваем обязательный PR (0 чужих approvals для одиночного владельца), успешный web CI с актуальной main, разрешённые discussions, enforcement admins, запрет force push/deletion. Проверить API после применения; код приложения не менять.

- GitHub PUT отклонил simultaneous contexts+checks (422 schema oneOf). Изменений защиты не применено. Повторяем с checks только, сохраняя привязку к GitHub Actions app15368.

- ГОТОВО: API подтвердил main protected=true. Обязательный PR, web от GitHub Actions app15368, strict up-to-date=true, resolved conversations=true; force push/deletion=false; enforce_admins=true. Для одиночного владельца approvals0, поэтому второй участник не требуется. Настройки действуют на main, development ветка cyclone/design остаётся доступна. Приложение/APK не менялись.

- Новая задача beta2: исправить наложение контуров/обрезку hormonal подсказки и малые switch, локализация Lab и оставшегося UI, только en/ru, вернуть исходную иконку native cyclone и имя cyclone. Дополнение: DataManagementView привести к единому дизайну (header/cards/spacing/controls), не менять backup расчёты. Сначала изучаем компоненты, затем фиксируем дизайн/локали/иконки, проверяем web/mobile/Android и публикуем beta2/GitHub.

- Дополнения пользователя beta2: убрать переливание календарных CTA/подсказок, заменить CycleInsightMoon на исходный логотип cyclone; полностью убрать скрытый Todo режим из доступного UI и отключить сохранённый режим, не затронув PIN. PIN настройку и экран разблокировки оформить единообразно. Lab остаётся, его переводим. Будущие ответы/код после чтения журнала.

- Причины подтверждены: малый Toggle сжимается в flex и thumb уезжает; hormonal hint имеет -mt-2 поверх border; debug/res/values переопределяет имя как Mooneva Debug. Шрифт native cyclone — системный SansSerif, применим глобально включая кнопки/SVG/формы. Discrete отключаем при загрузке/обновлении настроек (сохраняя backup поле совместимости), убираем UI/tutorial; PIN не меняем по безопасности.

- Дополнение beta2: в календаре три подсказки без emoji (работа/спорт/настроение) по выбранному дню и расчётной фазе, разнообразные по дням; не обещать точного влияния гормонов на продуктивность. Использовать текущий cycleStatus, не менять расчёт. Проверки: детерминированность, разные соседние дни, en/ru, режим pregnancy/paused без ложной фазы.

- Реализованы en/ru-only загрузчик/выбор, полный RU Lab, отсутствие видимого discrete/tutorial, отключение старого discrete при загрузке/обновлении; debug label cyclone. UI shared fonts, switch shrink0, hint без отрицательного margin, data/PIN карточки, статичные календарные CTA и исходный logo. Подсказки:56 уникальных сочетаний на категорию/цикл, 3 безemoji, neutral приpregnancy/paused/BC. Проверка вектора выявила вложенный XML-envelope из генератора, исправляем до Android сборки.

- Web beta2 проверки прошли: tsc, build,8tests; mobile412px безoverflow,8switches40/56px thumbInside=true,JS errors0. Android beta2 сборка запущена. Новый запрос: два виджета как в старом cyclone (компактный цикл и большой с тремя подсказками), палитра/яркость синхронны приложению, актуальные данные. Сначала изучаем существующий WidgetSync upstream и старые layout/provider, не объявлять виджеты готовыми до native проверки.

- Виджеты реализуем через dated snapshots70дней от model.getDayStatus/getDayMeta/at, чтобы после полуночи не показывался вчерашний день, не дублируя native расчёты. Два RemoteViews provider, resize, appclick, date/timezone/boot update, темы app mode/palette. Найден пропущенный второй provider в списке sync из-за CRLF — исправить перед тестом. UI audit data выявил плохую видимость старого checkbox-track: заменяем два backup toggles на общий Toggle.

- Дополнительно исправить в редакторе дня: серые прямоугольники label/switch в Статистика/Беременность и перенос слов настроения. Не менять смысл ignoreForAverages/pregnancy markers; исправить карточки/контролы/адаптивную раскладку. Проверить выбранные/disabled состояния.

- Продолжаем beta2 со всеми запросами, последний фокус: корректный внешний вид advanced switches и текстовых mood chips. Общий CSS role=switch ошибочно красил все прямые div, включая label-container, что дало серый прямоугольник. Ограничить thumb styling только .cyclone-toggle; для full-row switch отдельные label/indicator правила. После UI добить native widget QA/release.

- Исправлены advanced row-switch: label div больше не получает thumb background; mood chips текстовые44px с переносом по словам, общая типографика. Widget native class/list сохранены; provider2 включён; snapshots70 и app theme передаются. Перед сборкой проверяем web не падает, затем host два виджета с live snapshot, сменой темы и stale fallback.

- Пользователь повторно подтвердил полный набор beta2: подсказки/шрифты/PIN/статичные CTA/логотип/единый data UI/удаление скрытого режима. Все в текущем scope, не считать повторение новой отдельной задачей. До финального ответа проверить каждый пункт и дать APK только с этими правками.

- Повторный вопрос пользователя по первому screenshot: подтверждаем учёт en/ru-only, полного RU Lab, исправленных switch/hormonal note, исходного cyclone logo и launcher label. Не потерять это при widget этапе; финальную beta2 сверить с полным списком.

- Пользователь напомнил GitHub: после QA обязательно commit/push в PR1, точный-head CI, prerelease beta2 APK+SHA. Не завершать локальными изменениями. Автоматический review отклонил совмещённую команду записи native widget QA-script/запуска (blocked by policy, без подробной причины); используем стандартное файловое редактирование для QA без командных строк из текста.

- Два widget реально отображаются вместе в API35 host: compact/detailed, правильный системный sans, dark lavender и3text tips видны. Первый скрин был затемнён системными ANR DigitalWellbeing/SystemUI (не cyclone); после Wait оба виджета читаемы. Native crash buffer пуст. Продолжаем palette/light/stale/date проверку и web editor QA (первый locator button был ошибочен: tabs role другой, исправлен QA).

- Финальная проверка редактора Chrome412×915:12 mood chips normal wrapping,3 label backgrounds transparent,errors0. Проверены screenshots moods/advanced. NativeAPI35: оба widgets при sync обновлены (widgetsUpdated2); darklavender и lightsage читаемы, stale snapshot очищает значения с предложением открыть cyclone; tap открывает MainActivity, crashbuffer пуст. Системные ANR не относятся к app и после Wait ушли. Обновляем notes и собираем точный beta2 artifact перед GitHub.

- Пользователь заметил seam/наезд после добавления tips: DailyLogPanel раньше приклеивалась к Calendar, теперь tips внутри Calendar разделили связку. Исправить архитектуру размещения: подсказки отдельной sibling-карточкой после редактора/preview, panel отдельныйrounded32 с16px gap и внутренним padding, одинаковыйgap календарныхблоков иsafe bottom отnav. Не выпускать beta2 с этимскрин-дефектом.

- После переноса карточек screenshot подтвердил gap16/rounded32, но inherited dark index.css имеет border!important 8% opacity. Устанавливаем explicit theme border!important для day-preview/daily-log. Добавляем QA измерение gap/радиуса/переключения tips на29число; затем последний web+native artifact.

- Пользователь повторил старый screenshot наложения и добавил active tab цвет: текущий QA уже измерил gap16/radius32 и исправленный border, нужно показать свежий снимок и добавить aria-selected theme container+primary, как BottomNav. Не путать старую screenshot с финальной beta2. Проверить таб настроение выделен цветом и gap не потерян.

- Текущий layout/color QA PASS: gap16, radius32, theme border; выбранный tab теперь theme container/primary, фон проверен. Подсказки следуют29числу, transparent advanced labels,normal moodwrap,errors0. Переходим к commit/push PR1 сейчас, не откладывая GitHub до ответа. Финальная сборка после последнего CSS ещё будет обновлена перед prerelease.
