# Continue cyclone Mooneva fork

Read DEVLOG.md, FORK.md and ROADMAP.md before edits. Update DEVLOG before changes/responses without chat reports. Keep this prompt ready before either usage limit. Work in this separate cyclone-mooneva repository; original ../cyclone stays separate.

GitHub: https://github.com/etowhite/cyclone-mooneva (actual fork), branch cyclone/design, PR1. Upstream origin history827e36a2bd863efa24faae608ca826bb1d56eab1. GPL-3.0-or-later/author attribution preserved; services/logic unchanged. No native APK released for this fork.

Initial presentation layer: cyclone.css, services/cycloneAppearance.ts and components/settings/CycloneAppearance.tsx. Five palettes,auto/light/dark,outlined cards/system font,compact typography,theme selector. Capacitor appId/applicationId com.cyclone.mooneva for isolated installation; namespace/plugins/launcher aliases still need integration checks. Visual branding incomplete. Storage keys intentionally retained.

Local TypeScript check,production build,six calculation contract tests passed; GitHubActions40692180158SUCCESS. Upstream configured tests directory was absent from public source; our six tests do not equal their full suite. Mobile Chrome412x915 reviewed Russian onboarding,lavender-dark/sage-light; some long upstream labels still clip. Android not yet tested. Node22+/pnpm11.25.0, pnpm-lock.yaml; pnpm exec vite on127.0.0.1:5174 is the development preview when running.

Tracking: issue2 complete mobile design/QA; issue3 Android/plugins,existing nativecyclone backup migration,widgets/biometry. Finish with separate tested commits/PRs. User explicitly authorized maintaining and publishing this fork. Do not silently migrate real health data or claim existing native features already transferred. Do not commitnode_modules/dist/keys/exports/localSDKpaths. GitHubCI checks tsc/vitest/vite build; follow their results,fix failures before merging.
