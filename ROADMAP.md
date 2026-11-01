# Roadmap / План

- [x] Separate Git repository and GitHub fork; retain upstream history/license.
- [x] Theme layer: five cyclone palettes, auto/light/dark, shared tokens/controls, outlined cards and bundled Roboto with Cyrillic.
- [x] TypeScript check, web production build and calculation contract tests.
- [ ] Complete mobile visual review: onboarding, calendar, heatmaps, forms and dark palettes.
- [x] Cyclone navigation, visible branding and shared Vortex artwork for web/Android/in-app assets (runtime verification tracked separately).
- [ ] Verify Android application identity, aliases, plugins and notification permissions.
- [ ] Import existing native cyclone backups with preview, validation and recoverability.
- [x] Compact cycle and detailed suggestion widgets, theme/language sync and stale-data protection.
- [ ] Optional biometric protection.
- [ ] Android emulator regression checks, signed APK and corresponding source release.

Progress is recorded in DEVLOG.md and GitHub issues/PRs. Checked means implemented and verified at the stated scope; test beta releases are available, while full regression and production signing remain pending.

2026-11-01: upstream main827e36a is already included; no new commits to port. TypeScript/lint/21 tests/web/Capacitor/Android builds pass. Browser review covers 360/412/1280px and 50 theme/view combinations, backups, pain, notes, PIN and onboarding. See the [evidence and remaining native checks](docs/quality/2026-11-01/REPORT.md). The local emulator cannot boot, so latest WebView, notification, permission, widget-host and lifecycle checks remain unchecked above.

Beta3 removes Lab entirely and adds optional0–10 daily pain, interactive date-range pain analytics, first-run/controls consistency and kid-mode explanations. Legacy backup core data remains compatible; native cyclone JSON migration/biometrics are still pending.

Beta4 ports the original native cyclone Material3 pain-slider parameters into React/WebView; pointer/touch/keyboard persistence and analytics checks passed.
