# RHL Season 10 Game

Static browser project for a lightweight RHL Season 10 career season.

## Structure

- `data/player_ratings_assigned.csv` - player attributes with default team and region assignments.
- `game/index.html` - static career setup, weekly season, standings, and final page.
- `game/js/csv.js` - CSV parsing and export helpers.
- `game/js/player.js` - player normalization and validation.
- `game/js/season-model.js` - team, player, game, series, standing, bracket, and season object factories.
- `game/js/season-engine.js` - roster setup, RHL League Play, regional playoffs and LCQs, international groups, and championship simulation.
- `game/js/app.js` - page orchestration and CSV loading.
- `context/` - handbook, simulator, format, and outstanding-context notes.

The first playable version drafts three random players and lets the player choose a
default team to take over, or get assigned one at random from either region. It fills
any vacated lineup slots from the remaining player pool. The other teams start with
their three highest-rated players. The season starts at League Play because the
provided data contains the 16 League Play teams but no qualifier entrants. It follows
the five-week regional best-of-five round robin, regional double-elimination playoffs
and LCQs, balanced international groups, and the six-team best-of-seven championship
bracket. The user must review a round's game scores and continue before the next round
is simulated. Match cards identify their specific round, and a live, horizontally
scrollable bracket appears above the match list during playoff stages, with upper and
lower brackets in separate lanes and advancement/drop routes called out between them.

Serve the project folder over HTTP:

```powershell
python game/serve.py
```

Open `http://127.0.0.1:4173/game/index.html`.