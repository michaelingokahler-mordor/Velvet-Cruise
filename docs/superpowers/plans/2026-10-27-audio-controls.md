# Audio Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist independent music/effects levels and make the requested tyre cues audible during actual driving.

**Architecture:** An edition-prefixed settings store owns percentages; GameAudio applies live bus gains and enforces music mute. MainScene renders the Audio menu and respects mute when streaming stations. Race changes only the tyre trigger, with no driving-force changes.

**Tech Stack:** TypeScript, existing pixel UI, Web Audio, esbuild unit harnesses and Chromium QA.

**Spec:** `docs/superpowers/specs/2026-10-27-audio-controls-design.md`

## Global Constraints

- Separate 0–100% levels, default music 60% / effects 80%; store under the current edition prefix.
- Preserve station choice, saves, scores, unlocks, horn removal and both graphics profiles.
- Preserve physics; pause, crash and standstill must not sustain tyre sounds.
- Human listening and device acceptance remain separate; no publication.

## Review Focus

- A download completing after mute must not start a song.
- Muting during a jingle must cancel a previously scheduled music restoration.
- Effects mute must include jingles while retaining music.
- Full steering must produce a tyre cue before reaching sand; brief taps must stay silent.
- A returning/reloaded menu must retain independent levels without touching other saves.

## Tasks

- [x] RED: add storage/mute/menu and real steering regressions; observe failures against the baseline.
- [x] Add `src/audio/settings.ts`; extend `src/audio/audio.ts` with live bus controls and robust music mute.
- [x] Add the Audio child and mute-aware streaming in `src/main.ts`; add the UI strings.
- [x] Adjust only tyre onset in `src/game/race.ts` and tyre synthesis/mix levels in `src/audio/audio.ts`.
- [x] GREEN: run targeted tests, real browser menu/reload/audio tests, then the road-effects suite and web build.
- [x] Review the final branch once and correct substantive findings.
- [ ] Integrate locally, verify the production build and prepare a new Windows test package with explicit native-test limits.

## Execution ledger

- Baseline: `632faa40cf44b4773151ea83fabb9c8a2641484e`; main and existing worktree clean.
- Reused the existing isolated checkout on `codex/audio-controls-tyres`.
- Investigation: full steering from x=0 produces no skid before entering sand; the audio property had no live setter. Baseline evidence: `output/audio-review-2026-10-27/baseline.json`.
- Ruling: retain the original visual `skid` state and add audio-only `tyreSqueal`. The full route contract exposed shared particle/traffic RNG consumption when visual skid timing changed; preserving it avoids an unintended gameplay change. Do not refresh the route fixture.
- Review: one independent reviewer found silent jingles ducked enabled music. A new rendered-audio regression reproduced this; skip ducking for muted effects and restore music when muting during an active jingle. Subjective timbre, hardware behavior and allocated-but-muted sources retain the stated acceptance/architecture boundaries.
- Verification: 11 targeted regressions, 20/20 aggregate steps, Classic/Plus audio menu and Web Audio tests, existing menu and road-effects browser checks passed. Six maximum-level song mixes peaked below 1.0. No human listening approval or native package launch is inferred.
