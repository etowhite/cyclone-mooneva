# Продолжение cyclone Mooneva fork

Перед изменениями читать DEVLOG.md, FORK.md, ROADMAP.md. Обновлять DEVLOG до кода/ответов, без отчётов об обновлении в чат. Этот промпт держать готовым до недельного или пятичасового лимита.

Рабочая папка cyclone-mooneva — отдельный fork. Исходный ../cyclone остаётся отдельным и не меняется. GitHub https://github.com/etowhite/cyclone-mooneva, branch cyclone/design, PR #1. Main защищён: PR, успешный GitHub Actions web, strict up-to-date, закрытые обсуждения, правила для admins, запрет force/delete; approvals0 для одного владельца. GPL-3.0-or-later/атрибуцию Mooneva сохранять, storage keys массово не переименовывать. Не публиковать ключи и личные данные.

## Готовый релиз
Последняя beta4: https://github.com/etowhite/cyclone-mooneva/releases/tag/v3.0.0-beta.4 . Source74358b34f08e065e9c3cb0080729e4af648fe47f, оба exact-head CI SUCCESS. APK3.0.0-beta.4/code29,com.cyclone.mooneva.debug,labelcyclone,V2debug signature,5588567bytes,SHA2562c1680322184314012574c4951fcd519c60470a66363d6b4e258fcccf6541feb. GitHub assets/digest проверены. Предыдущая beta3 source15abbf4 тоже опубликована. Текущие запросы ЗАВЕРШЕНЫ, не пересобирать без новых изменений.

## Реализовано
- Пять палитр,auto/light/dark,исходный знак cyclone, Android иконка следует палитре и DEVICE яркости. Только en/ru, общий системный sans и pill-кнопки/карточки, скругления32 и gap16, цвет active tabs.
- Обновлённый первый запуск: перевод, центр языков, статичный dotted gradient, goal outline2 вместо точки. Backup switches40x24, themed BC dialog безemoji, кликабельное объяснение kidMode, PIN/data UI.
- Lab удалена целиком по явному запросу (38 component/store/domain файлов, routes/nav/settings/reminders/export hooks). Не возвращать её. Старые140-143уведомления отменяются. Старый optional backup extension читается для совместимости, core/PIN сохраняются; новые экспорты Lab не содержат.
- Подсказки work/sport/mood по выбранному дню,безemoji,56сочетаний; no cycle day => no tips в календаре/виджетах. Два Android виджета общих dated snapshots70дней; тема/язык/expiry fallback; расчёты только из общей Mooneva-модели.
- Nullable DailyLog.pain0..10,zero≠unrated. Шкала inline вBody послеdischarge,без отдельнойрамки. Автосохранение/ref/datechange/content detection и backup validation сохраняют0; DayPreview показываетpain.
- Pain analytics: выбранные30/90/180/365calendar days включительноtoday, только реальные оценки, безfuture/missing-as-zero; интерактивные SVGpoints/drag/keyboard/prevnext, пропуски не соединяются. MoodByPhase empty/filled border.

## Последняя замена шкалы (beta4)
User попросил именно исходную шкалу nativecyclone. Найдена SymptomScreen.kt: Compose Material3 Slider1.3.0 (BOM2024.09.03),valueRange0..10/steps9/roundToInt. Проверены токены локального исходного AAR: track16,thumb4x44(2focus/press),gap6,innercorner2,ticks4. Реализован отдельный React/WebView порт в components/calendar/OriginalPainSlider.tsx/.css; цвета copied из ../cyclone/.../ui/theme/CyclonePalettes.kt в originalSliderColors.ts. Это перенос параметров, не встроенный Kotlin Compose в WebView. Старый HTMLrange overlay/CSS и лишние NoPain/Clearbuttons удалены;0 ставится тапом в начало. Родительская inline-секция сохранена по предыдущему запросу. Боль/график не меняли алгоритм.

## Проверки
TypeScript,15tests,web/Android builds иCIpassed. MobileChrome360/412: геометрия40x24,goalborder2,языкицентр/перевод,kidInfo/BCdialog,mood/flow/bodypills,transparentlabels,gap16/radius32. No-cycle tips скрыты,послеfirstcycleпоявляются. Sliderpointer/touch0,drag10,keyboard6 сохраняются; painfixturemean90=4.5/30=7 иpointselectionPASS;JSerrors0. Tests: zero/missing,boundaries/future/invalid,backup0/reject11,old optional extension and preserving device PIN. WidgetAPI35 audit был beta2 (two widgets,light/dark,palette,stale,tap); не заявлять полной нативной регрессии beta4.

## Среда и дальнейшая работа
Node22+/pnpm11.25.0, bundled pnpm.cmd C:/Users/white/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/. JDK21 ../.toolchain/jdk21/jdk-21.0.9+10,SDK36 ../.toolchain/android-sdk,Gradle8.14.3. Build: tsc/vitest(maxWorkers1)/vite build -> cap sync android -> gradlew assembleDebug. Stop own Gradle daemon перед эмулятором на8GBhost. Только собственный cyclone_design port5574, ANDROID_AVD_HOME ../.toolchain/avd;5554 чужой,не трогать. Own5574 сейчасOFF,QAhostудалён,9223forwardснят. Vite5174 session62758 может работать; при ERR_CONNECTION_REFUSED перезапустить. Логи/screens ../verification/fork-beta3*/fork-beta4*, частьscreens в ignored fork/verification/.

QA fixtures: прямые storage writes могут перезаписываться React debounce600ms+1000ms/unload flush. Ждать initial hydration/debounce до seed; не менять app из-за fixture race. Onboarding button «Начать отслеживание», BC adaptive warning требует «Ок» перед дальнейшим toggle.

Следующее: новые отзывы; issues #2 mobile QA и #3 native integration, миграция JSON исходного native cyclone, опциональная биометрия, production signing и полная регрессия. Не обещать медицинской точности/полного переноса всех старых функций. Активно обновлять GitHub, оформлять релизы с RU/EN notes, APK, SHA и exact source tag. Не сливать незавершённые функции в main.
