# cyclone — Mooneva fork

Separate development of cyclone on the React/Capacitor architecture of [Mooneva Cycle](https://github.com/aradar46/Mooneva-Cycle-Private-Period-Tracker). Original authorship and GPL-3.0-or-later are retained. Test Android betas are available; this is not a production release.

## Русский

Форк Mooneva с оформлением cyclone: пять палитр, автоматическая/светлая/тёмная тема, локальный Roboto с кириллицей, общие элементы управления и контуры карточек. Есть дневник с болью 0–10, интерактивная аналитика боли, три подсказки по выбранному дню, два Android-виджета, PIN и резервные копии. Исходные расчёты Mooneva сохранены, Lab удалена. Предыдущий нативный cyclone развивается отдельно; импорт его формата и биометрия пока не реализованы.

## English

Mooneva with cyclone styling: five palettes, automatic/light/dark appearance, bundled Cyrillic Roboto, shared controls and outlined cards. Includes optional daily pain, interactive pain analytics, three date-specific suggestions, two Android widgets, PIN protection and backups. Upstream calculations remain unchanged; Lab is removed. Migration from the separate native cyclone and biometric integration are not implemented.

## Current verification / Проверки

The [1 November 2026 report](docs/quality/2026-11-01/REPORT.md) records upstream comparison, screenshots, logs and limitations. TypeScript, lint, 21 tests, web build, browser scenarios, Capacitor sync and Android build pass. **Android runtime regression is not verified in this session:** the local emulator fails before Android/adb starts. A successful build does not establish working notifications, widgets or WebView interactions.

Design tokens: `styles/tokens.css`, `styles/palettes.css`, `styles/controls.css`; shared React controls: `components/ui/Controls.tsx`. Icon source and regeneration: [assets/branding](assets/branding/README.md).

## Development

Use Node22 or newer and pnpm11.25.0:

```
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm exec vitest run --maxWorkers=2
pnpm build
pnpm exec vite
```

The public upstream checkout did not contain its configured tests directory. The fork has calculation contract and UI/storage regression tests; they do not imply clinical validation or complete upstream coverage. Android applicationId is com.cyclone.mooneva (debug adds .debug), separate from the original native cyclone. See the report for the exact checked scope.

## Workflow

Changes use feature branches and pull requests, with type checks, tests and web builds before merge. See [ROADMAP](ROADMAP.md), [DEVLOG](DEVLOG.md), and [FORK](FORK.md). Keep upstream fixes separate from visual changes. Do not commit health exports, signing keys, local SDK paths or generated dependencies.
