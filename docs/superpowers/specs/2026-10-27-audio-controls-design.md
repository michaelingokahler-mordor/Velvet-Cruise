# Audio controls and audible tyres

The user selected separate, persistent music and effects controls, each including complete mute at 0%. Add an Audio child to Settings while preserving the current Music Player and station selection. Keyboard/gamepad left/right adjusts the selected slider in 10% steps; touch offers minus/plus and direct slider selection. Back returns to the selected Settings row. Both Classic and Plus must fit the controls. Builder defaults: music 60%, effects 80%.

Store levels in a new edition-prefixed audio key. Preserve all other preferences, records and unlocks. Muting music stops the active song and prevents race starts, late downloads and jingles from restoring it. Effects includes engine, tyres, weather, voices, UI and jingles. Muting effects must leave music playing. Blocked or malformed storage must not prevent play.

Full steering from the centre currently reaches sand before the fixed 0.5s timer fires. Use a threshold scaled by steering strength: about 0.28s at full steering and 0.5s at the strong-steering boundary. Keep speed requirements, short-tap suppression, physics and surface rules. Remove the extra audio dead zone and strengthen the rubber tone, kerb rattle and sand scrape within safe mix headroom. Pause/crash/standstill still silence tyre channels.

Alternatives: a single music switch meets the immediate mute need but cannot balance effects; a master mute removes the driving feedback the user wants. The user chose independent music/effects levels. Keep the existing pixel UI and Web Audio implementation, with no new dependency.

Verify real storage reloads, late song completion, changes during jingle ducking, independent mute, slider navigation/touch, earlier full-steer activation and actual rendered audio at defaults. Technical signal checks and recordings support a later human listening test; they do not establish subjective approval. No publication.
