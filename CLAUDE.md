# Net Profit

Cosy isometric fishing tycoon. Full context, tuning tables, architecture, known debt, migration plan and roadmap are in @project.md. Read it before changing anything.

Rules of the road:
- `legacy/net-profit.html` is the behavioural reference until the TypeScript port reaches parity. Do not edit it.
- The towed-net feel is the game. Any change to boat or net physics gets a side-by-side check against legacy.
- Phone first: verify at 390x780 portrait before calling anything done.
- Keep it playable at every commit. One feature per PR.
- No game framework. Custom canvas renderer stays. Ask before adding a dependency.
- Existing `netprofit.v1` saves must keep loading (migrate, never wipe).
- The owner wants honest opinions and pushback. If a request will hurt the game, say so, then do what she decides.
