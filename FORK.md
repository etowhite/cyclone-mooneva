# cyclone — Mooneva fork

Separate React/Capacitor fork of aradar46/Mooneva-Cycle-Private-Period-Tracker, based on 827e36a2bd863efa24faae608ca826bb1d56eab1. GPL-3.0-or-later and upstream attribution are retained.

Repository: https://github.com/etowhite/cyclone-mooneva. Current quality branch: cyclone/november-quality. The original native ../cyclone project remains separate. Main accepts changes through protected pull requests.

Presentation uses styles/tokens.css, styles/palettes.css, styles/controls.css, shared components/ui/Controls.tsx, cyclone.css and services/cycloneAppearance.ts. Core calculations remain upstream; storage has fork validation and browser download fixes. Five palettes, auto/light/dark, local Cyrillic Roboto, labelled navigation, dedicated appearance/language settings and pain analytics are implemented.

The selected Vortex artwork in assets/branding/icon.svg is shared by web, Android launcher/adaptive/monochrome layers, splash, notification silhouette and the calendar mark. tools/generate_icons.py exports the assets. Historical palette aliases remain compatible and use the same new monochrome icon; this supersedes the earlier colored icon variants. The in-app symbol uses the current theme color. Existing alias selection code is preserved. The hidden Todo interface remains disabled.

The current test build is 3.0.0-beta.4, debug signed, package com.cyclone.mooneva.debug. It installs separately from the original native cyclone. Compact cycle and detailed daily-suggestion widgets are implemented with dated snapshots from the shared model. Existing native cyclone JSON migration and biometric integration are not yet implemented in this fork. Do not assume that all original cyclone features have been transferred.

Build: Node22+, pnpm11.25.0, JDK21, Android SDK36, Gradle8.14.3. Run pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm test, pnpm build, pnpm exec cap sync android, then android/gradlew assembleDebug. Output: android/app/build/outputs/apk/debug/app-debug.apk. Debug signing uses the local Android debug keystore; do not commit keys.

See DEVLOG.md, ROADMAP.md and CONTINUE_PROMPT.md for verified scope and remaining work. The fresh [2026-11-01 quality report](docs/quality/2026-11-01/REPORT.md) documents successful web checks/builds and an unavailable Android runtime caused by the local emulator. Earlier emulator audits do not substitute for checking the latest APK.

Beta3 removes Lab entirely and adds optional0–10 daily pain, interactive date-range pain analytics, first-run/controls consistency and kid-mode explanations. Legacy backup core data remains compatible; native cyclone JSON migration/biometrics are still pending.

Beta4 ports the original native cyclone Material3 pain-slider parameters into React/WebView; pointer/touch/keyboard persistence and analytics checks passed.
