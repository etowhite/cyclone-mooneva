# cyclone — Mooneva fork

Separate React/Capacitor fork of aradar46/Mooneva-Cycle-Private-Period-Tracker, based on 827e36a2bd863efa24faae608ca826bb1d56eab1. GPL-3.0-or-later and upstream attribution are retained.

Repository: https://github.com/etowhite/cyclone-mooneva. Development branch: cyclone/design; PR #1. The original native ../cyclone project remains separate.

Presentation overrides live in cyclone.css, services/cycloneAppearance.ts and components/settings/CycloneAppearance.tsx. Health calculations and storage remain upstream. Five palettes, auto/light/dark, outlined cards, labelled navigation, dedicated appearance/language settings and mobile analytics styling are implemented.

Android icons follow the selected palette and device light/dark setting independently of forced app appearance. Ten variants, one enabled launcher, background changes and discrete Todo override passed an API35 emulator audit. Runtime configuration registration and drawable-night resources cover system changes.

The first test build is 3.0.0-beta.1, debug signed, package com.cyclone.mooneva.debug. It installs separately from the original native cyclone. Existing native cyclone JSON migration, native widgets and biometric integration are not yet implemented in this fork. Do not assume that all original cyclone features have been transferred.

Build: Node22+, pnpm11.25.0, JDK21, Android SDK36, Gradle8.14.3. Run pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm test, pnpm build, pnpm exec cap sync android, then android/gradlew assembleDebug. Output: android/app/build/outputs/apk/debug/app-debug.apk. Debug signing uses the local Android debug keystore; do not commit keys.

See DEVLOG.md, ROADMAP.md and CONTINUE_PROMPT.md for verified scope and remaining work.
