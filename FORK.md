# cyclone — Mooneva fork

Separate React/Capacitor project based on aradar46/Mooneva-Cycle-Private-Period-Tracker, commit827e36a2bd863efa24faae608ca826bb1d56eab1. GPL-3.0-or-later and upstream credits retained. Branchcyclone/design, upstream remote points to the public project; no personal GitHub repository has been created or pushed.

The native ../cyclone project remains separate. Presentation overrides are in cyclone.css, services/cycloneAppearance.ts and components/settings/CycloneAppearance.tsx. Health calculations/storage remain upstream. Five palettes and auto/light/dark are visual preferences only. Android applicationId com.cyclone.mooneva separates the fork from both existing apps; native plugin/package compatibility still needs verification before an APK is distributed.

Next: validate baseline and styled web app, visual review, finish cyclone branding and navigation, adapt Android identity/icons/biometry/widgets, provide a confirmed cyclone backup importer before migrating real data. This first scaffold is not a completed Android release.
## Launcher icons (in progress)

Ten native cyclone vector icons: Rose/Lavender/Sage/Ocean/Amber, each light and dark. Palette follows the app preference; brightness follows Android system uiMode even when the app appearance is forced. LauncherAppearance persists palette and discrete mode; configuration/boot events and Activity configuration changes reconcile aliases. A permanent MainActivity is opened through LauncherEntryActivity so disabling an icon alias does not disable the app entry point. API33+ alias updates are atomic; older Android enables the replacement first. Discrete Todo mode wins over palette selection until disabled.

Native implementation is pending emulator verification. First build requires JDK21, AndroidSDK36 and upstream Gradle8.14.3. The old native cyclone toolchain JDK17/SDK35 is not sufficient. Do not distribute this as a tested APK until palette/system-mode/discrete/single-launcher behaviour has passed on device.

Launcher verification update: Android debug build and API35 emulator audit passed for all ten palette/mode variants, one launcher, Activity continuity, discrete override and system-theme changes in the background. Runtime configuration registration and drawable-night resources replace the initial manifest-only approach. Android resource lookup verified dark/default selection. This verifies launcher behaviour, not the entire fork's Android release readiness.
