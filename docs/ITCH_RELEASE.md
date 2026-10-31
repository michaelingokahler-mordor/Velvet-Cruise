# Velvet Cruise: itch.io Full releases

The release version comes from `package.json`. The first Full release is **1.0.0**.
Windows, Mac Intel and Mac Apple Silicon belong to one paid product.

The prepared project target is `sabnockworks/velvet-cruise`.
This target does not create a store page. The existing demo page is a separate project.

## First store setup

1. Create a downloadable game project named Velvet Cruise in the SabnockWorks account.
2. Use `velvet-cruise` as the project URL, if available.
3. Keep the project restricted during installation and update tests.
4. Configure seller details, payment mode, price and payout details.
5. Add the description, screenshots, content notice, system requirements and support contact.
6. Link the [browser demo](https://sabnockworks.com/games/more-projects/velvet-cruise/).

Use one product price for all three Full downloads. Do not apply separate file prices.
The `Collected by itch.io` payment mode supports USD, including a $9.99 price.
Euro pricing requires the Direct payments model.
See the [official payment guide](https://itch.io/docs/creators/payments).

Label the downloads clearly:

| Channel | Download label | Requirements |
| --- | --- | --- |
| `windows-x64` | Windows 64-bit — Full | Windows x64 |
| `macos-arm64` | Mac — Apple Silicon — Full | macOS 13 or later, Apple Silicon |
| `macos-x64` | Mac — Intel — Full | macOS 13 or later, Intel |

The channel names stay the same for every update.
itch.io does not provide architecture tags for these channels.
Mac buyers must select their processor variant explicitly.

## Build Windows

Run these commands from the repository root. Choose new output directories for each build.
The template supplies the existing Electron runtime and game icon.
Packaging writes to a separate directory and preserves the template.

```powershell
npx vite build --mode desktop --outDir output/itch-1.0.0/dist
node tools/build-desktop.mjs output/itch-1.0.0/game --source output/itch-1.0.0/dist
node tools/package-desktop.mjs --game output/itch-1.0.0/game --template "D:/Velvet Cruise/WinExe" --out output/itch-1.0.0/windows
```

## Build Mac

Run the `Mac release candidates` workflow on the current release branch.
The workflow builds both processor variants on native runners.
It tests the ZIP contents, extracted signatures, offline play, ranking sync and profile migration.
It also checks each extracted launch action with Butler.

Download both workflow artifacts. Keep the inner game ZIP files intact.
Do not extract and recompress the Mac applications on Windows.

The Mac applications have ad-hoc signatures and no Apple notarization.
The store page must explain the first-open process from the existing Mac instructions.
A downloaded-app test on a physical Mac remains part of release acceptance.

## Collect a delivery

The collector requires Python 3.11 or later. On macOS, use `python3` instead of `python`.
Use the prepared Windows directory and the two original Mac ZIP files.

```powershell
npm run itch:prepare -- --windows output/itch-1.0.0/windows --mac-arm64 "D:/Velvet Cruise/Mac/Velvet-Cruise-macOS-arm64-1.0.0.zip" --mac-x64 "D:/Velvet Cruise/Mac/Velvet-Cruise-macOS-x64-1.0.0.zip" --out "D:/Velvet Cruise/Itch/1.0.0"
```

The collector checks the Full edition, version, CPU, launch action and notices.
It copies Mac archives without changing their bytes.
It writes three ZIP files, `release.json` and `SHA256SUMS.txt`.

## Install and authenticate Butler

The Windows setup script downloads the official stable Butler into the ignored output directory.
It does not change the system PATH or sign in.

```powershell
powershell -NoProfile -File tools/setup-butler.ps1
& ./output/itch-tools/butler/butler.exe login
```

Butler stores authentication outside this repository.
Never put an API key into a release, a script or a Git commit.
On Mac, install Butler through the [official installation guide](https://itch.io/docs/butler/installing.html).
The upload helper also accepts `--butler <executable-path>`.

## Preview and upload

The preview checks every file and checksum before it prints the three commands.
It does not contact itch.io.

```powershell
npm run itch:plan -- --release "D:/Velvet Cruise/Itch/1.0.0" --project sabnockworks/velvet-cruise
```

After the target project exists and Butler is authenticated, upload with:

```powershell
npm run itch:push -- --release "D:/Velvet Cruise/Itch/1.0.0" --project sabnockworks/velvet-cruise
```

This command updates all three channels immediately.
If a network upload fails, the command stops. Uploads already completed remain on itch.io.
Retry the same release after correcting the problem.

If the actual project URL differs, use its `account/game` value in `--project`.
Do not use the old demo project as the Full upload target.

## Test installation and updates before sale

1. Install each Full download through the itch app on its supported OS and processor.
2. Start offline and create local records and settings.
3. Close the game before the update.
4. Upload a newer test build to the same restricted project channels.
5. Update through the itch app.
6. Start again and check the records, settings, driver identity and pending score uploads.
7. Check the Mac first-open process after a browser download.

Automated native tests use disposable profiles and a loopback ranking service.
They do not submit synthetic results to the production leaderboard.
A local Butler patch test covers patch generation and application, but does not replace the store test.

The native ranking check can also start with an older installed package.
It uses copied game payloads, disposable player data and a loopback API.
The second launch uses the updated package with the same test profile.

```powershell
node tools/qa/windows-rankings-native.mjs output/itch-1.0.0/windows --update-from "D:/Velvet Cruise/WinExe"
```

## Publish a later bug fix

1. Increase `package.json` to the next patch version, for example `1.0.1`.
2. Refresh the lockfile with `npm install --package-lock-only --ignore-scripts`.
3. Build and test all three packages again.
4. Collect them into a new delivery directory.
5. Preview the upload commands.
6. Upload to the same product and the same three channels.
7. Add release notes to the product page.

The helper uses the delivery manifest's version for Butler `--userversion`.
It does not infer a version from an archive date or the current source checkout.
itch app users can apply the update through the app.
ZIP users download the new version through their purchase page.

Player data lives outside the installation, under `Velvet Cruise/profiles/<gameId>` in the OS application-data directory.
The game ID, custom origin, Mac bundle identifier and storage keys stay stable across updates.
Scoring-rule changes need a separate leaderboard compatibility decision.

References: [Butler uploads and stable channels](https://itch.io/docs/butler/pushing.html),
[itch app manifests](https://itch.io/docs/itch/integrating/manifest.html).
