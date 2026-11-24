# RHL Season 10 Handbook — Simulation Format

This file is a standalone summary for match and season simulation. It contains the
RHL Season 10 competition, roster, match, qualification, and bracket rules needed to
run a simulated season without consulting the original handbook. When a section was
ambiguous or internally inconsistent, the explicit bracket flow and match format below
are treated as the simulation rules.

## 1. Season overview

- 2 regions: North America (NA) and Europe/Middle East/North Africa (EU/MENA).
- 8 teams per region enter League Play.
- Each region also has 3 placement qualifiers:
  - Qualifier 1 sends 3 teams.
  - Qualifier 2 sends 3 teams.
  - Qualifier 3 sends 2 teams.
- 16 total teams enter League Play: 8 NA and 8 EU/MENA.
- 4 teams per region advance through the Regional Playoffs.
- 2 additional teams per region advance through their Last Chance Qualifier.
- 8 teams reach the International Playoffs: 4 NA and 4 EU/MENA.

## 2. Teams and roster context

- A team can have 3 or 4 rostered players.
- A team must designate 1 Team Captain and 1 Assistant Captain.
- Each official roster has 2 Anchor Players:
  - The Team Captain is an Anchor.
  - The second Anchor is a player who completed at least one full game in the
    qualifier series.
- Anchor Players cannot compete for another team during the season.
- Non-anchor players may appear for no more than 2 teams during the season.
- Each team has 2 Roster Transactions to sign players before the International
  Group Stage begins.
- Releasing a player does not use a Roster Transaction.
- A team may substitute 1 player between games/matches. For a match simulation,
  roster changes can be applied between series, not during a game.

## 3. Match and game rules

### Match mode

- Rocket Hockey League uses Snow Day-style Rocket League.
- 3v3: no bots.
- DFH Stadium Snowy.
- Ball type: puck.
- Ball bounciness: low.
- Use private/password-protected servers.
- Other game settings use their defaults.
- An individual game lasts 5 minutes of regulation.
- If the game is tied after regulation, it continues in overtime until a team scores.
- A match continues until the required number of individual games is won:
  - Best-of-5: first to 3 games.
  - Best-of-7: first to 4 games.

### League/regional match server context

- NA: US-East, US-Central, or US-West; US-Central is the default.
- EU/MENA: Europe or Middle East; Europe is the default.
- In BO5 or BO7 series, the higher seed selects the server for Games 1, 3, and 5.
- The lower seed selects the server for Games 2 and 4.
- Game 6 and later are not assigned a server in the handbook's rotation rules.
- International matches alternate between NA and EU/MENA regions:
  - US-East and Europe are the only stated servers.
- In the International Upper Bracket Final, the team with the better overall record
  receives server priority. If records are equal, NA receives priority.

### Simulation guidance

- Generate one individual scoreline first; if tied after 5 minutes, generate an
  overtime winner.
- Add that game to the BO5 or BO7 series until 3 or 4 wins is reached.
- Individual substitutions should not change the score model mid-series unless the
  simulation is specifically modeling roster changes.
- A 3-player on-server roster is required. The fourth rostered player is a substitute.

## 4. Qualifiers

The placement qualifiers are independent standalone events for each region.

- All qualifier matches use **double elimination**.
- All qualifier matches use **Best-of-5**.
- Each qualifier bracket sends a fixed number of teams to League Play:
  - Qualifier 1: 3 teams
  - Qualifier 2: 3 teams
  - Qualifier 3: 2 teams
- Players may participate in only one region's qualifiers.

For season simulation, a qualifier can be represented as a 3v3 BO5 double-elimination
bracket with the listed fixed advancement counts.

## 5. League Play

Each region runs an independent **single round-robin** with 8 teams.

- Every team plays every other team in the region once.
- There are 7 matches per team.
- 28 unique matches per region.
- All League Play matches are **Best-of-5**.
- League Play lasts 5 weeks.
- One match is scheduled per team in most weeks.
- 2 of the 5 weeks require 2 matches per team to finish the round-robin.
- League Play is a single round-robin stage, not a series of independent game totals.

### Standings

Standings are based on series win/loss record.

Tiebreak order:

1. Series win/loss record.
2. Overall game differential in League Play.
3. Head-to-head result.
4. If tied teams are fighting for a playoff or LCQ qualification spot and steps 2-3
   do not determine advancement, play a tiebreaker series.
5. If the tie only affects seeding rather than qualification, rank by game differential,
   then head-to-head. No extra match is required.

At the end of League Play:

| League finish | Next stage |
|---|---|
| 1st-4th | Regional Playoffs |
| 5th-6th | Regional Last Chance Qualifier |
| 7th-8th | Eliminated |

For a typical simulation, sort teams by series wins, then game differential, then
head-to-head. Use a BO5 tiebreaker only when the unresolved tie affects qualification.

## 6. Regional Playoffs

The top 4 teams from each region enter a 4-team double-elimination bracket.

The handbook has an internal inconsistency: it first says “double elimination,” then
labels the bracket breakdown “four-team single-elimination.” The detailed matchup flow
below is explicit and should be used for the bracket.

### Regional bracket

```text
Seeds/teams (1-4 in the regional seeding order)

Upper Bracket Semifinal 1
  Team A vs Team B
  Winner -> Winners Final
  Loser  -> Losers Semi-Final

Upper Bracket Semifinal 2
  Team C vs Team D
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
  Winner -> International Playoffs, 1st seed
  Loser  -> International Playoffs, 2nd seed
```

The handbook does not explicitly specify which numbered League Play seed enters each
semifinal matchup, so a simulator should choose a normal 1-vs-4 and 2-vs-3 bracket
unless an official bracket order is supplied.

### Regional match formats

- Upper Semifinal: BO5.
- Winners Final: BO5.
- Losers Semi-Final: BO5.
- Losers Final: BO5.
- Regional Grand Final: BO7.

In the Regional Grand Final, the team coming from the upper bracket receives a
**1-game advantage**:

- That team starts the BO7 at 1-0.
- It needs 3 more wins to reach 4.
- The lower-bracket team needs 4 wins.
- There is no bracket reset.

## 7. Regional Last Chance Qualifier

Each region has a separate 4-team double-elimination LCQ.

### Entrants

- 3rd-place Regional Playoff finisher.
- 4th-place Regional Playoff finisher.
- 5th-place League Play team.
- 6th-place League Play team.

### LCQ bracket

```text
Upper Bracket Final
  Regional Playoff 3rd place vs Regional Playoff 4th place
  Winner -> QUALIFIED
  Loser  -> Lower Bracket Final

Lower Bracket Semifinal
  League Play 5th place vs League Play 6th place
  Winner -> Lower Bracket Final
  Loser  -> Eliminated

Lower Bracket Final
  Loser of Upper Bracket Final vs Winner of Lower Bracket Semifinal
  Winner -> QUALIFIED
  Loser  -> Eliminated
```

- All LCQ matches are **Best-of-5**.
- 2 teams per region qualify.
- Combined with the 2 Regional Playoff finalists, this sends 4 teams per region
  to the International Playoffs.

## 8. International Playoffs

### Entrants

- 8 teams total.
- 4 NA teams.
- 4 EU/MENA teams.
- Each region supplies:
  - 1 Regional Grand Final winner.
  - 1 Regional Grand Final loser.
  - 2 LCQ winners.

### Day 1: 2 groups

Teams are split into Group A and Group B.

- Each group has 4 teams: 2 NA and 2 EU/MENA.
- The exact original group draw/seeding process is not specified in the handbook.
  For a simulator, balance each group with 2 NA and 2 EU/MENA teams, and use a
  reproducible seed-based or regional-seed drawing method.
- Each group uses a 4-team double-elimination bracket.
- All group matches are **Best-of-5**.

```text
Upper Bracket Semifinals
  All 4 teams start in one of two semifinals.

Upper Bracket Final
  Two semifinal winners
  Winner -> Group 1st place
  Loser  -> Group 2nd place

Lower Bracket Final
  Two semifinal losers
  Winner -> Group 3rd place
  Loser  -> Eliminated / 4th place
```

Advancement:

- 3 teams from each group advance.
- 1 team from each group is eliminated.
- 6 teams enter Day 2.

### Day 2: Championship bracket

The top 6 teams advance to a 6-team double-elimination bracket.

Seeding and matchups:

```text
Upper Bracket Final
  Group A 1st Place vs Group B 1st Place

Lower Bracket Quarterfinal 1
  Group B 2nd Place vs Group A 3rd Place

Lower Bracket Quarterfinal 2
  Group A 2nd Place vs Group B 3rd Place

Lower Bracket Semifinal
  Winner of Lower Quarterfinal 1 vs Winner of Lower Quarterfinal 2

Lower Bracket Final
  Loser of Upper Final vs Winner of Lower Bracket Semifinal

Grand Final
  Winner of Upper Final vs Winner of Lower Final
```

- All championship bracket matches are **Best-of-7**.
- The Grand Final has **no bracket reset**.
- The normal BO7 rule applies: first to 4 wins.

## 9. Simulator implementation checklist

Use the following state and progression rules for a complete season:

- Represent 3 teams per on-server matchup even if rosters contain 4 players.
- Generate individual games as 5-minute regulation games.
- If tied after regulation, continue to one sudden-death overtime goal.
- Use no result other than a home/away team win for a generated individual game.
- Add games to a series until one team reaches 3 wins (BO5) or 4 wins (BO7).
- Track both series wins/losses and the sum of individual games won/lost.
- Record `game differential = games won - games lost` for League Play standings.
- In League Play, play every regional pairing once (7 series per team).
- Sort League Play standings by series wins, game differential, then head-to-head.
- If qualification remains unresolved, play a BO5 tiebreaker series.
- Apply no bracket-reset rule unless the round is explicitly documented as doing so.
- Apply the 1-game upper-bracket advantage in the Regional Grand Final only.
- Do not give a bracket-reset or one-game advantage to the International Grand Final.
- Lock roster choices/transactions before each stage as the season setup requires:
  - Official roster before League Play.
  - Roster transactions allowed until the International Group Stage begins.
- International entrants are determined by:
  - 2 regional Grand Finalists.
  - 2 regional LCQ winners.
- International groups should contain 2 NA and 2 EU/MENA teams.
- Advance 3 teams from each group, then enter the 6-team Championship bracket.

### Series format quick reference

| Stage | Series format |
|---|---|
| Placement qualifiers | BO5 double elimination |
| League Play | BO5, single round-robin |
| Regional upper and lower matches | BO5 |
| Regional Grand Final | BO7, upper-bracket team starts with 1 game |
| Regional LCQ | BO5 |
| International group stage | BO5 |
| International championship bracket | BO7 |
| International Grand Final | BO7, no reset |

## 10. End-to-end season path

```text
3 Qualifiers per region
        |
        v
8 teams per region qualify
        |
        v
League Play: 8 teams, single round-robin
        |
        +-----------------------------+
        v                             v
Top 4: Regional Playoffs       5th-6th: Regional LCQ
        |                             |
        +---------- 2 teams ----------+
                    each region
        |
        v
4 teams per region
        |
        v
International Groups: 2 groups x 4 teams
        |
        v
Top 3 from each group: 6-team championship bracket
        |
        v
International Champion
```
