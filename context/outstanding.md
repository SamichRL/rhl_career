# Outstanding Context for a Playable RHL Season

This document lists the context and implementation data still needed to turn the RHL Season 10 format, player ratings, and match simulator into a complete playable season.

The core format is documented in [rhl-season-10-format.md](./rhl-season-10-format.md). The match model is documented in [match-simulator.md](./match-simulator.md). The player-rating data is documented in [season-10-baseline.md](./season-10-baseline.md).

## Critical missing context

### League and team rosters

The simulator needs:

- 16 League Play team definitions.
- 8 NA teams.
- 8 EU/MENA teams.
- Team names.
- Team regions.
- Team captains.
- Three or four rostered players per team.
- Anchor-player assignments.
- Starting three-player lineups.
- Free-agent players and eligibility.

The current `data/player_ratings.csv` contains rated players but does not contain:

- Team affiliations.
- Team names.
- Regions.
- Captains.
- Anchor status.
- Qualifier teams.
- Substitute assignments.

### Qualifier and qualification results

The simulator needs:

- Which teams entered each qualifier.
- Which players represented each team.
- Which teams qualified.
- Advancement results for all qualifier brackets.
- Anchor players selected after each qualifying event.

Because actual Season 10 qualifier and team results are not available in the project context, a generated-season mode will need to create 16 League Play teams from the available player pool.

### Seeding and matchup assignments

The season engine can derive League Play pairings directly, but it needs a decision or deterministic process for:

- Regional playoff seeding: use a normal 1-vs-4 and 2-vs-3 upper-semifinal bracket.
- International group placement: the handbook does not specify the draw/seeding process.
- A reproducible international group draw that produces 2 NA and 2 EU/MENA teams in each group.

For a generated season, random or seed-based group drawing is acceptable unless actual Season 10 group assignments are supplied later.

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

A complete season engine needs persistent state for:

- League Play series wins.
- League Play series losses.
- Individual games won.
- Individual games lost.
- Game differential.
- Head-to-head results.
- Tiebreaker state.
- Current bracket.
- Eliminated teams.
- Qualified teams.
- LCQ teams and winners.
- International group placement.
- International advancement.
- Roster membership.
- Remaining Roster Transactions.
- Match history.
- Player season totals.
- Random simulation seed or seed history.
- Reproducibility settings for testing.

For a simple season, this state can be represented by a season object containing region standings, bracket state, match results, and team rosters.

## League Play requirements

The season engine should implement:

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

## Match simulation gaps

The existing match concept already covers:

- 3v3 team selection.
- Team-attribute aggregation.
- A 2.31-goal-per-team starting baseline.
- Attack, playmaking, and opposing defence adjustments.
- Per-team form randomness.
- Poisson-distributed goal counts.
- Scorer and assister selection.
- Sudden-death overtime.
- Seedable random tests.

The following data or behavior is still missing:

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

The current saves model should remain an optional later extension. Saves-per-game is a weak defence proxy and should not be converted directly into prevented goals.

## Match result data

At minimum, the match engine should return:

- Team A.
- Team B.
- Regulation score.
- Overtime result.
- Final score.
- Winner.
- Series result.
- Individual-game result.
- Goal events.
- Goal times.
- Scorer.
- Assister or no assister.
- Player goals.
- Player assists.
- Optional player saves.

For season mode, it should additionally record:

- Match stage.
- Bracket round.
- BO5 or BO7 format.
- Regional or international stage.
- Series wins after the match.
- Current seed or bracket position.

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

## Recommended minimum playable version

Use the following first implementation:

1. Generate 16 teams from the 56 Season 10 rated players.
2. Give each team exactly three starting players.
3. Optionally add a fourth substitute player to roster data.
4. Create 8 NA teams and 8 EU/MENA teams.
5. Play the League Play single round-robin.
6. Track series wins and individual-game differential.
7. Rank teams using the standing rules.
8. Play both regional playoff brackets.
9. Play both regional LCQs.
10. Send 4 teams per region to the International stage.
11. Draw 2 balanced international groups.
12. Play all international group matches.
13. Play the 6-team Championship bracket.
14. Display the international champion.
15. Store match history and player season totals.

## Season-wide UI state

A playable UI will need views for:

- Team and roster selection.
- League standings.
- Regional standings.
- Schedule.
- Match setup.
- Simulated individual game.
- BO5/BO7 series progress.
- Bracket progression.
- Regional playoff bracket.
- LCQ bracket.
- International groups.
- Championship bracket.
- Match history.
- Player statistics.
- Season champion.
- Replay or match-log controls.
- Optional random seed controls.

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
