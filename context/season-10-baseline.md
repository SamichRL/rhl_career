# Season 10 scoring baseline

## Dataset used

The calculations here use `data/RHL Season 10 Stats - OVERALL STATS.csv`, which contains 65 player rows and aggregate season totals, including goals, goals per game (`GPG`), assists per game (`APG`), saves per game, and games played (`GP`).

The header repeats `SPG` for multiple statistics. When loading this CSV, use the column order or a parser that disambiguates duplicate headers. In the file order, saves per game is the second `SPG` field (column 9, counting from 1).

## Calculated scoring baseline

- Across all 65 rows: 1,295 goals in 1,687 player-games, or **0.768 goals per player-game** when weighted by games played.
- At three players per side, that suggests a rough baseline of **2.30 goals per team per five-minute match**.
- Restricting to players with at least 10 games (the qualification used to create `data/player_ratings.csv`) gives 1,263 goals in 1,639 player-games: **0.771 goals per player-game**, or **2.31 goals per three-player team**.
- For the qualified group, mean reported rates are 0.719 GPG, 0.530 APG, and 1.166 saves per game.

Use **about 2.3 goals per team** as a starting expectation, not as a guaranteed score or a measured distribution. The dataset provides player-season aggregates rather than match-level scorelines, opponent strength, or goal timing. It therefore cannot establish the true average match total, score variance, tie rate, or how the three player attributes causally affect a result.

The team estimate assumes the three players' scoring contributions add up over the same match. It is an initial calibration point for a simulator, and should be replaced or refined if match-level results become available.

## Attribute provenance

`data_processing/01_exploration.ipynb` builds the ratings from players with at least 10 games. It standardizes GPG, APG, and saves per game, then maps each to a 0-100 scale centered at 75 (10 points per standard deviation, clipped to the range). The exported attributes are:

- **Attack:** GPG
- **Playmaking:** APG
- **Defence:** saves per game

The combined player rating weights attack 50%, playmaking 20%, and defence 30%. The match simulator should use the three underlying attributes rather than treating the combined rating as a separate gameplay skill.

Saves per game is only a proxy for defending: players on teams under more pressure may record more saves. Treat it as a weak signal until match-level data can validate its relationship to goals conceded.
