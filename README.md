# RHL Season 10 Game

Static browser project for a lightweight RHL Season 10 career season.

## Structure

- `data/player_ratings_assigned.csv` - player attributes with default team and region assignments.
- `game/index.html` - static career setup, weekly season, standings, and final page.
- `game/js/csv.js` - CSV parsing and export helpers.
- `game/js/player.js` - player normalization and validation.
- `game/js/season-model.js` - team, player, game, series, standing, bracket, and season object factories.
- `game/js/season-engine.js` - random draft, team lineups, weekly schedule, match, and series simulation.
- `game/js/app.js` - page orchestration and CSV loading.
- `context/` - handbook, simulator, format, and outstanding-context notes.

The first playable version drafts three random players and lets the player choose a
default team to take over, or get assigned one at random from either region. It fills
any vacated lineup slots from the remaining player pool. The other teams start with
their three highest-rated players. It simulates seven weeks of
regional best-of-five round-robin matches, followed by a best-of-seven final between
the two regional leaders. This intentionally skips the full playoff and qualification
stages for now.

Serve the project folder over HTTP:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/game/index.html`.