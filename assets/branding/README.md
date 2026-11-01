# cyclone app icon

Selected design: **01 — Vortex**. Original single-path artwork inspired by the
motion and pointed curves of the supplied references, drawn as a new composition.

- `icon.svg`: canonical selected icon, light `#EDF3FA` on dark `#0B0E14`.
- `mark.svg`: the same symbol on a transparent background.
- `icon.png`: 1024 × 1024 export.
- `icon.ico`: 16, 20, 24, 32, 40, 48, 64, 128 and 256 px frames.
- `variants/`: all three original SVG designs and 512 px previews.
- `options.png`: side-by-side preview, actual 16/24/32/48 px sizes and 2× zoom.

## Regeneration

From the project directory:

```powershell
python -m pip install -r tools/icon-requirements.txt
python tools/generate_icons.py
```

The default command reads `icon.svg`. To select a saved variant instead:

```powershell
python tools/generate_icons.py --variant 01-vortex
```

The generator updates web SVG/PNG/ICO files, Android density PNGs, vector
drawables, adaptive and Android 13 monochrome layers, legacy splash images and
the Fastlane store icon. It does **not** build or install an APK.

## Integration

- `index.html` and `hooks/useAppTheme.ts` use the exported web icon. The existing
  discreet mode retains its neutral clipboard icon.
- The Android application, MainActivity and all normal launcher aliases use
  `@mipmap/ic_launcher` / `@mipmap/ic_launcher_round`. This also supplies the
  activity icon to the Android recent-apps UI. Historical palette aliases remain
  available for existing installs; they now all display the same monochrome art.
- Android 8+ uses adaptive layers with the complete symbol inside the central
  66dp safe circle; Android 13+ also has a transparent monochrome layer.
- Android 7 uses density PNGs. Launch resources cover day/night and portrait/
  landscape. The Android 12+ system splash uses the same foreground vector.
- Local notifications use `ic_stat_cyclone`, a white silhouette on transparency.
- This project has Android and web targets. The ICO is also ready for future
  desktop packaging; there is no native Windows executable target here.

The ordinary web/Capacitor copy pipeline will include these sources in a future
build. Existing installed APKs are unchanged until rebuilt and installed.

The generated `components/ui/CycloneMark.tsx` uses the canonical path with
`currentColor` for the calendar symbol. Regeneration updates it together with
the web and Android exports. Widgets have no separate legacy artwork; their
picker uses the application icon. Historical Todo aliases remain disabled.

## Checks (2026-11-01)

Verified the 16/24/32/48 px previews, a single connected foreground silhouette,
all ICO frames, web/source SVG equality, all 11 normal launcher aliases and XML
syntax. `tsc --noEmit` and Android `aapt2 compile` passed. No APK was created or
installed, as requested; runtime verification of a rebuilt APK was not performed.
