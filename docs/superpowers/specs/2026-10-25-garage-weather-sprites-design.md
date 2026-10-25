# Garage and weather sprites

Approved in chat on 2026-10-25: implement the six confirmed cars as native 88x48 sprites, open and closed, with animations and in-game weather-transition verification.

- Retain the existing four open cars byte for byte. Share each car's body across every roof state. Change only the explicitly bounded cockpit/roof mask; retain tyre contact and bottom-centre anchor.
- Native redraw of Silver Comet (silver GT, burgundy seats, charcoal roof) and Azure Coast (rounded turquoise roadster, chrome, ivory cabin/roof).
- Three steering views, two occupant frames, four roof positions including endpoints, matching brake and empty-car frames. Roof movement takes 0.65 seconds. Rain/snow close it; dry weather opens it, with hysteresis; tunnels do not toggle it.
- Closed-roof occupants stay inside during a rollover. Preserve open-roof comic ejection. Open the roof before occupants leave in the finale.
- One starter Rosso; goal A Toro, B Stallion, C Speedster, D Comet, E Azure, using existing saved goals/badges. No handling, collision, difficulty, score, leaderboard, or save-key changes.
- Approaches: independent AI generations cannot preserve exact pixels; rescaling drafts cannot guarantee alignment. Selected: extend the existing procedural native-pixel art pipeline and composite roofs over a fixed body.
- Tests: original sprite hashes, zero changes outside roof masks, frame coverage/alpha/anchors/lights, weather hysteresis and transition phases, real renderer and browser captures on rain/snow boundaries.
