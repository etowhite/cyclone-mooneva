# Current checkpoint: mobile design stage2

Read DEVLOG.md before edits and update it before code/responses; no chat reports about updating it. Keep this prompt current before any limit. Separate GitHub fork etowhite/cyclone-mooneva, branchcyclone/design,PR1. Native ../cyclone remains separate.

Stage2: visible bottom-nav labels, theme-safe active pill, separate Appearance subview containing theme/palette/language/week-start, readable wrapping settings titles, cyclone settings header and onboarding wordmark. Android app name/package_name/custom_url_scheme updated to cyclone/com.cyclone.mooneva while Java namespace stays com.mooneva.app. This is intentional but Android has NOT been built/verified. SDK36/Gradle8.14.3 required by upstream, current old workspace has SDK35/Gradle8.9; prepare dependencies rather than silently downgrade.

Verified: tsc,productionwebbuild,6cyclecontracttests; mobileChrome412x915 walkthrough language→welcome→cycle→goal→setup→discrete tutorial(skip)→Getstarted→What'sNew(Close)→Settings→Appearance. Sage/light switch and contrast screenshotchecked. Upstreamstartuprelease-notes dialog is still English and mentionsMooneva; visiblebranding/localisationremainingwork. All5paletteslight/darkfade/shadowfixesfrompriorcommitchecked. Calculations/services/logicUNCHANGED. Header/navcolorsmustuseCSSvariables,notinheritintermediateanimationcolors.

Next: pushstage2withCI,continueissue2(fullcalendar/trends/mobilevisualbranding),thenissue3(Androididentity/aliases/plugins/biometrics/widgetsandnativecyclonebackupmigration). No APK ready. Originalstorage/protocolkeysretained,nevermassrename. GPL/upstreamcreditsmustremain. GitHubActionsmustpassbeforemerging; PRcurrentlyopen. Developmentserver127.0.0.1:5174whenrunning. pnpm11.25.0,Node22+,usepnpm-lockfrozen. Upstreampublictestsabsent;ours6contractsarenotfullupstreamcoverage.

# Continue cyclone Mooneva fork

Read DEVLOG.md, FORK.md and ROADMAP.md before edits. Update DEVLOG before changes/responses without chat reports. Keep this prompt ready before either usage limit. Work in this separate cyclone-mooneva repository; original ../cyclone stays separate.

GitHub: https://github.com/etowhite/cyclone-mooneva (actual fork), branch cyclone/design, PR1. Upstream origin history827e36a2bd863efa24faae608ca826bb1d56eab1. GPL-3.0-or-later/author attribution preserved; services/logic unchanged. No native APK released for this fork.

Initial presentation layer: cyclone.css, services/cycloneAppearance.ts and components/settings/CycloneAppearance.tsx. Five palettes,auto/light/dark,outlined cards/system font,compact typography,theme selector. Capacitor appId/applicationId com.cyclone.mooneva for isolated installation; namespace/plugins/launcher aliases still need integration checks. Visual branding incomplete. Storage keys intentionally retained.

Local TypeScript check,production build,six calculation contract tests passed; GitHubActions40692180158SUCCESS. Upstream configured tests directory was absent from public source; our six tests do not equal their full suite. Mobile Chrome412x915 reviewed Russian onboarding,lavender-dark/sage-light; some long upstream labels still clip. Android not yet tested. Node22+/pnpm11.25.0, pnpm-lock.yaml; pnpm exec vite on127.0.0.1:5174 is the development preview when running.

Tracking: issue2 complete mobile design/QA; issue3 Android/plugins,existing nativecyclone backup migration,widgets/biometry. Finish with separate tested commits/PRs. User explicitly authorized maintaining and publishing this fork. Do not silently migrate real health data or claim existing native features already transferred. Do not commitnode_modules/dist/keys/exports/localSDKpaths. GitHubCI checks tsc/vitest/vite build; follow their results,fix failures before merging.
