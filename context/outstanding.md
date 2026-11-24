# Outstanding Context for a Playable RHL Season

This document tracks remaining context and implementation work for the RHL Season 10 simulator.

The core format is documented in [rhl-season-10-format.md](./rhl-season-10-format.md). The match model is documented in [match-simulator.md](./match-simulator.md). The player-rating data is documented in [season-10-baseline.md](./season-10-baseline.md).

## Critical missing context

### League and team rosters

The playable version loads the 16 League Play teams and player affiliations from
`data/player_ratings_assigned.csv`. The supplied data supports eight teams per region
with at least three players per team. The career draft replaces one selected or random
team's lineup; other teams use their top three available players, with vacancies filled
from the remaining pool.

Still missing from the source data:

- Team captains.
- Anchor-player assignments.
- Qualifier teams and their rosters.
- Substitute assignments.

### Qualifier and qualification results

The simulator needs:

- Which teams entered each qualifier.
- Which players represented each team.
- Which teams qualified.
- Advancement results for all qualifier brackets.
- Anchor players selected after each qualifying event.

Qualifier entrants and qualification results are not provided. The playable season
therefore starts at League Play with the 16 supplied teams; it does not invent
qualifier entrants or results.

### Seeding and matchup assignments

The playable version uses the documented 1-vs-4 and 2-vs-3 regional semifinals and
randomly draws balanced international groups with two teams from each region. The
handbook does not specify historical international group assignments; the draw is not
seeded yet.

### Roster and substitution rules

If the season models roster transactions rather than fixed teams, it needs:

- Teams of three or four rostered players.
- One substitute player available between games or matches.
- A maximum of two Roster Transactions per team.
- Transactions applied only to adding signing free agents.
- Releases that do not consume a Roster Transaction.
- Roster transactions disabled at the start of the International Group Stage.
- Anchor Players locked to their original team.
- Non-anchor players restricted to no more than two teams in the season.
- Restricted-free-agent return restrictions.
- Disbanded-team handling.

For a minimum first season model, substitutions and transactions can remain static. The 3-player on-server lineup can be fixed for each series.

## Season engine state

The in-memory season object currently tracks:

- League Play series wins.
- League Play series losses.
- Individual games won.
- Individual games lost.
- Game differential.
- Head-to-head results.
- Qualification tiebreaker wins.
- Current stage and bracket round.
- Regional playoff seeds and results.
- LCQ entrants and qualifiers.
- International group placement and results.
- Roster membership.
- Match history.

Still outstanding are durable save/load, player season totals, and a persisted random
seed or seed history.

## League Play requirements

The playable engine implements:

- 8 teams per region.
- One match between every team in the same region.
- 28 unique League Play series per region.
- 7 League Play series per team.
- All League Play matches as BO5.
- Series win/loss as the primary standings metric.
- Game differential as the first tie-breaker.
- Head-to-head result as the next tie-breaker.
- A BO5 tiebreaker only when qualification is unresolved.
- No tiebreaker match for seeding-only ties; use game differential followed by head-to-head.

At the end of League Play:

| Finish | Outcome |
|---|---|
| 1st-4th | Regional Playoffs |
| 5th-6th | Regional Last Chance Qualifier |
| 7th-8th | Eliminated |

## Match simulation status

The game currently implements:

- 3v3 team selection.
- Team-attribute aggregation.
- A 2.31-goal-per-team starting baseline.
- Attack, playmaking, and opposing defence adjustments.
- Per-team form randomness.
- Poisson-distributed goal counts.
- Sudden-death overtime.

Still missing from the match simulator:

- Goal-event times and scorer/assister assignment.
- Save generation.
- A calibrated score-distribution model.
- Calibrated overtime frequency.
- Team or player fatigue.
- Player form over a season.
- Roster substitutions.
- Home-region or server effects.
- Forfeit handling.
- Disconnection handling.
- Re-game conditions.
- Match-result persistence.
- Goal-event persistence across a season.
- Defensive saves tied to actual goals conceded.
- Match-level data for validating the player-rating model.
- Seedable randomness for repeatable test cases.

The current saves model should remain an optional later extension. Saves-per-game is a weak defence proxy and should not be converted directly into prevented goals.

## Match result data

The game records each series winner, its individual game scores, overtime flags,
round, and bracket advancement. Future match-simulation work could add:

- Goal events.
- Goal times.
- Scorer.
- Assister or no assister.
- Player goals.
- Player assists.
- Optional player saves.

## Match format implementation

### Individual game

- 3v3 Snow Day mode.
- DFH Stadium Snowy.
- Ball: puck.
- Low ball bounciness.
- Five-minute regulation.
- Sudden-death overtime if tied.

### Series

- Placement qualifiers: BO5 double elimination.
- League Play: BO5.
- Regional upper/lower matches: BO5.
- Regional Grand Final: BO7 with a 1-game advantage for the upper-bracket team.
- Regional LCQ: BO5.
- International group stage: BO5.
- International championship bracket: BO7.
- International Grand Final: BO7 with no bracket reset.

The BO5 format is first to 3 individual games. The BO7 format is first to 4 individual games.

## Regional playoff implementation

The top 4 teams from each region enter a regional playoff bracket.

Use this explicit matchup flow:

```text
Upper Bracket Semifinal 1
  1st vs 4th
  Winner -> Winners Final
  Loser  -> Losers Semi-Final

Upper Bracket Semifinal 2
  2nd vs 3rd
  Winner -> Winners Final
  Loser  -> Losers Semi-Final

Winners Final
  Winner of Upper Semi 1 vs Winner of Upper Semi 2
  Winner -> Regional Grand Final
  Loser  -> Losers Final

Losers Semi-Final
  Loser of Upper Semi 1 vs Loser of Upper Semi 2
  Winner -> Losers Final
  Loser  -> Last Chance Qualifier

Losers Final
  Loser of Winners Final vs Winner of Losers Semi-Final
  Winner -> Regional Grand Final
  Loser  -> Last Chance Qualifier

Regional Grand Final
  Winner of Winners Final vs Winner of Losers Final
  Winner -> International Playoffs as regional 1st seed
  Loser  -> International Playoffs as regional 2nd seed
```

All regional playoff matches are BO5 except the Regional Grand Final, which is BO7.

In the Regional Grand Final:

- The team coming from the upper bracket starts at 1-0.
- That team needs 3 more wins to reach 4.
- The lower-bracket team needs 4 wins.
- There is no separate bracket-reset match.

The handbook contains an internal inconsistency because it says the regional stage is both double and single elimination in separate places. Use the detailed matchup flow above for the simulator.

## Regional Last Chance Qualifier implementation

Each region runs a 4-team LCQ:

```text
Upper Bracket Final
  Regional Playoff 3rd place vs Regional Playoff 4th place
  Winner -> International Playoffs
  Loser  -> Lower Bracket Final

Lower Bracket Semifinal
  League Play 5th place vs League Play 6th place
  Winner -> Lower Bracket Final
  Loser  -> Eliminated

Lower Bracket Final
  Loser of Upper Bracket Final vs Winner of Lower Bracket Semifinal
  Winner -> International Playoffs
  Loser  -> Eliminated
```

All LCQ matches are BO5.

This sends 2 teams from each region to the International Playoffs.

## International playoff implementation

### Entrants

- 8 teams total.
- 4 NA teams.
- 4 EU/MENA teams.
- 2 Regional Playoff Grand Finalists per region.
- 2 Regional LCQ winners per region.

### Day 1 groups

Create two 4-team groups:

- Group A: 2 NA and 2 EU/MENA.
- Group B: 2 NA and 2 EU/MENA.
- All group matches are BO5.
- Use a reproducible draw or seed-based distribution until actual draw rules are supplied.

Each group should follow this explicit structure:

```text
Upper Bracket Semifinals
  All four teams enter here.

Upper Bracket Final
  Two semifinal winners
  Winner -> Group 1st place
  Loser  -> Group 2nd place

Lower Bracket Final
  Two semifinal losers
  Winner -> Group 3rd place
  Loser  -> Eliminated / 4th place
```

Advance 3 teams from each group. Six teams enter the Championship bracket.

### Day 2 championship bracket

Use these matchups:

```text
Upper Bracket Final
  Group A 1st vs Group B 1st

Lower Bracket Quarterfinal 1
  Group B 2nd vs Group A 3rd

Lower Bracket Quarterfinal 2
  Group A 2nd vs Group B 3rd

Lower Bracket Semifinal
  Winner of Lower Quarterfinal 1
  vs Winner of Lower Quarterfinal 2

Lower Bracket Final
  Loser of Upper Final
  vs Winner of Lower Bracket Semifinal

Grand Final
  Winner of Upper Final
  vs Winner of Lower Final
```

All championship bracket matches are BO7.

- First to 4 individual games wins.
- The Grand Final has no bracket reset.
- No upper-bracket team advantage is specified for the International Grand Final.

### International server context

For international matches:

- US-East and Europe are the stated server options.
- Games should alternate between regions when server simulation is enabled.
- In the International Upper Bracket Final, the team with the better overall record has server priority.
- If overall records are equal, NA gets server priority.

## Current playable scope and remaining work

The browser game currently:

- Drafts three players and replaces one chosen or random default-team lineup.
- Runs the five-week regional League Play round robin, with two matches per team in
  Weeks 4 and 5.
- Advances the top four from each region through the documented regional
  double-elimination bracket and the 4-team LCQ.
- Draws two international groups with two teams from each region, then runs the
  documented group and 6-team championship brackets.
- Pauses after each simulated week or tournament round so the user can review every
  series score and individual game score before continuing.

It does not simulate the placement qualifiers because their team entries and player
rosters are absent. It also keeps rosters static and does not yet save seasons,
generate player-level match statistics, or model servers and substitutions.

## Remaining UI enhancements

The current UI shows team setup, regional League Play standings, each active round's
series and game scores, past match results, and the champion. Future UI work could add
visual bracket trees, player statistics, replay controls, and an optional seed setting.

## Recommended season data model

```text
Player
  name
  attack
  playmaking
  defence
  combined rating
  season goals
  season assists
  season saves

Team
  name
  region
  players
  starting lineup
  captain
  anchor players
  remaining transactions

Series
  stage
  team A
  team B
  format
  starting advantage
  games
  team A games won
  team B games won
  winner

Game
  team A
  team B
  regulation score
  overtime winner
  final score
  goal events

Season
  region standings
  match history
  team rosters
  current stage
  brackets
  champion
  random seed
```

## Match simulator calibration context

The player ratings are based on Season 10 aggregate stats:

- 56 qualified players have at least 10 games.
- The qualified data contains 1,263 goals in 1,639 player-games.
- This gives approximately 0.771 goals per player-game.
- Three players imply approximately 2.31 goals per team per five-minute match.
- 943 assists divided by 1,263 goals gives approximately 0.747 assists per goal.
- Attack is derived from goals per game.
- Playmaking is derived from assists per game.
- Defence is derived from saves per game.
- The combined player rating is not the correct gameplay input for goals and defence.
  Use attack, playmaking, and defence separately.

The aggregate dataset cannot determine:

- Match-level average totals.
- Score variance.
- Overtime frequency.
- Causal effects of defence on goals conceded.
- Home or server effects.
- Exact goal timing.
- Match-level opponent strength.

If match-level Season 10 results become available, they should replace the prototype 2.31-goal baseline and 0.85-1.15 form range with calibrated distributions.

## Items not needed for a useful first playable season

These can be deferred:

- Exact qualifier registration dates.
- Team Master Schedule workflow.
- 48-hour match confirmation.
- Forfeit and warning policies.
- Replay upload enforcement.
- Twitch streaming.
- Decal restrictions.
- Team logos.
- Prize payment.
- Captain disbandment administration.
- Exact server scheduling workflow.
- Coach behavior.
- Bugs and admin commands.
- Crowd or audience effects.
- Travel and fatigue.
- Historical team ownership.
