# itch.io Full Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Windows and native Mac Full 1.0.0 archives and repeatable Butler update commands.

**Architecture:** One package.json version feeds both existing packagers. A collector validates and hashes their ZIPs; an explicit upload helper reuses fixed channels.

**Tech Stack:** Node.js, Python 3, Electron packager, resedit, Butler, GitHub Actions macOS runners.

**Spec:** docs/superpowers/specs/2026-10-31-itch-release-design.md

## Global Constraints

- Version 1.0.0; Full only; windows-x64, macos-arm64, macos-x64 channels.
- Stable game/profile identity and ranking behavior; no live synthetic scores.
- Native ad-hoc Mac signatures and framework symlinks preserved.
- Existing installed game and unrelated user files preserved.
- Prepare only; no itch publication or credential storage in the repository.

## Review Focus

- Windows PE and Mac bundle metadata agree with the runtime version.
- Demo payloads and wrong CPU builds are rejected before publication.
- A missing/corrupted archive causes zero uploads, including partial batches.
- Mac ZIP bytes, signatures and symlinks survive release collection.
- A Butler patch preserves external player data and starts successfully.

### Task 1: Consistent versioned packages

**Files:** package*.json; tools/release-config.mjs; tools/package-desktop.mjs;
tools/package-macos.mjs; tools/build-desktop.mjs; tools/qa/check-release-version.mjs;
tools/qa/check-macos-archive.py; .github/workflows/macos-release.yml.

**Interfaces:** package.json version -> releaseVersion; packagers -> versioned archives,
top-level .itch.toml and RELEASE-INFO.json; build metadata -> releaseVersion.

- [ ] Add behavioral version/launch/source-preservation checks and watch them fail.
- [ ] Implement shared version and package metadata, avoiding template logs/install records.
- [ ] Check Mac archive version and launch metadata on native CI.
- [ ] Run focused checks, typecheck and full suite; document pre-existing content-scan failure.

### Task 2: Release collection and Butler updates

**Files:** tools/prepare-itch-release.py; tools/itch-release.mjs;
tools/setup-butler.ps1; tools/qa/check-itch-release.py; docs/ITCH_RELEASE.md; package.json.

**Interfaces:** three Full archives -> release.json + SHA256SUMS.txt; manifest ->
dry-run commands, or explicit --push; --project sabnockworks/velvet-cruise.

- [ ] Test missing/wrong/demo builds, exact Mac ZIP preservation, and corrupt batch rejection.
- [ ] Implement collection, local Butler setup and all-before-any upload validation.
- [ ] Document first setup, update steps, Mac selection and acceptance limitations.
- [ ] Run tests and official Butler build validation.

### Task 3: Build and acceptance

**Files:** reports/itch-release-2026-10-31/; native workflow artifacts; local delivery folder.

- [ ] Build Windows; commit/push the working branch for native Mac CI.
- [ ] Build, extract and verify both Mac architectures on native runners.
- [ ] Collect exact ZIPs; check hashes and dry-run all stable channel commands.
- [ ] Exercise a real local Butler diff/apply and native ranking/offline checks.
- [ ] Obtain one independent final code review and address important findings.
- [ ] Report actual artifacts and explicitly identify account-dependent checks still pending.
