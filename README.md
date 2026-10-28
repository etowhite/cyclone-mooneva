# cyclone — Mooneva fork

Separate development of cyclone on the React/Capacitor architecture of [Mooneva Cycle](https://github.com/aradar46/Mooneva-Cycle-Private-Period-Tracker). Original authorship and GPL-3.0-or-later are retained. This is an early fork, not an Android release.

## Русский

Форк Mooneva с оформлением cyclone: пять палитр, автоматическая/светлая/тёмная тема, системные шрифты, контуры карточек и компактные отступы. Исходная аналитика и расчёты Mooneva сохранены. Предыдущий нативный cyclone развивается отдельно; перенос его резервных копий, виджеты и биометрия ещё требуют адаптации.

## English

Mooneva with cyclone styling: five palettes, automatic/light/dark appearance, system typography and outlined cards. Upstream health calculations remain unchanged. The previous native cyclone is a separate project; its data migration, widgets and biometric features still need adapters.

## Development

Use Node22 or newer and pnpm11.25.0:

```
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm exec vite build
pnpm exec vite
```

The public upstream checkout did not contain its configured tests directory. Six calculation contract tests are included here; they do not imply clinical validation or complete upstream coverage. Android applicationId is com.cyclone.mooneva for a separate install; Android plugin/launcher integration is not yet verified.

## Workflow

Changes use feature branches and pull requests, with type checks, tests and web builds before merge. See [ROADMAP](ROADMAP.md), [DEVLOG](DEVLOG.md), and [FORK](FORK.md). Keep upstream fixes separate from visual changes. Do not commit health exports, signing keys, local SDK paths or generated dependencies.
