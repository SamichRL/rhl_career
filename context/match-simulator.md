# Match simulator concept

## Goal

After a user selects three distinct players, simulate a Rocket League-style 3v3 match lasting five minutes and produce a score and winner. A useful first version should be repeatable enough to test, while retaining randomness so similar teams can get different results.

The current team builder already loads each player's attack, playmaking, and defence values from `data/player_ratings.csv`. The values are 0-100 ratings derived from Season 10 stats; they are not direct probabilities.

## V0 match flow

1. Select the user's three-player team and a three-player opponent.
2. Aggregate each team's attributes, initially using the mean of the three players' values. Keep the individual values available for assigning goal and assist credit.
3. Generate goals for both teams over a five-minute regulation period. Start with an expected value of roughly **2.3 goals per team**, based on the supplied season dataset; see [the baseline notes](./season-10-baseline.md).
4. Adjust each team's scoring rate using the matchup:
   - Higher team attack should increase its scoring rate.
   - Higher playmaking should modestly improve scoring and assist involvement.
   - Higher opponent defence should reduce that scoring rate.
5. Add a fresh random match-form multiplier to each side's adjusted scoring rate, draw each team's goal count, then randomly place the goals across the 300-second match.
6. If scores are tied at five minutes, use sudden-death overtime and generate a winner with the same matchup strengths. Keep overtime separate from regulation score.
7. Report the final score, winner, and optionally a concise stat line such as goals, assists, and saves.

## V0 formulas: goals, scorers, assists, scoreline

For each team, let `A`, `P`, and `D` be the mean attack, playmaking, and defence ratings of its three players. Let `D_opp` be the opposing team's mean defence. Use these as initial, tunable coefficients:

```text
base_goals = 2.31
expected_goals = base_goals
                 * exp(0.012 * (A - 75)
                      + 0.006 * (P - 75)
                      - 0.008 * (D_opp - 75))
```

The exponential form keeps the scoring rate positive. At ratings of 75 across both teams, expected goals is 2.31. Better attack and playmaking raise a team's rate; better opposing defence lowers it. The coefficient values are prototype assumptions, not effects measured by the aggregate dataset.

For each match, draw a separate form multiplier for each team, `F ~ Uniform(0.85, 1.15)`. Then draw regulation goals independently:

```text
team_goals ~ Poisson(expected_goals * F)
```

Expected goals is an average over many games, not a fixed score. The form draw and Poisson draw mean the same teams can produce different scorelines and either team can win. For each goal, choose a random time uniformly from 0 to 300 seconds, sort all goals by time, and update the score after each event. This produces both the final score and a chronological goal log.

For each goal by a team, choose the scorer from its three players with these normalized weights:

```text
scorer_weight[i] = exp(0.020 * (attack[i] - 75)
                       + 0.005 * (playmaking[i] - 75))
P(scorer = i) = scorer_weight[i] / sum(scorer_weight)
```

This makes goals more likely to be credited to high-attack players while allowing every teammate to score. Given the scorer, decide whether the goal has an assist:

```text
P(goal has one assist) = 943 / 1263 = 0.747
assist_weight[j] = exp(0.020 * (playmaking[j] - 75))
P(assister = j | scorer) = assist_weight[j]
                              / sum(assist_weight for teammates j != scorer)
```

The 0.747 starting probability is the qualified dataset's total assists divided by total goals. This simplified model allows zero or one assist per goal and never credits the scorer as their own assister. The player weights are initial design choices, not estimates from goal-by-player event data.

If regulation is tied, use sudden-death overtime with the same team rates. In goals per second, `rate_A = expected_goals_A * F_A / 300` and likewise for B. Draw the wait to the next goal from an exponential distribution with rate `rate_A + rate_B`. The scoring team is A with probability `rate_A / (rate_A + rate_B)`, otherwise B. Assign scorer and assist using the same rules, then end the match.

Record each goal as an event with its time, scoring team, scorer, assister (or `null`), and score after the goal. The match result should include each team's final score and each player's goal and assist totals. This makes the scoreline and player-level outcome directly available to the UI.

Each match should use fresh random draws. Use a fixed seed only when a test needs to reproduce a particular game; do not reset to the same seed for every normal match.

## Saves as a later extension

The goal, scorer, and assist formulas above define the first version's player-level output. Saves can be added later as a secondary stat influenced by team defence and opponent attacking pressure. Do not equate higher saves with preventing a fixed number of goals; the source data does not support that conversion.

## Calibration and checks

- Use the 10+ games population as the initial cohort because that is the population represented in `player_ratings.csv`.
- Across those 56 players, the dataset has 1,263 goals in 1,639 player-games, about 0.771 goals per player-game. Three such player rates sum to about 2.31 goals per team-game.
- In that group, there were 943 assists for 1,263 goals, giving the simple 0.747 assist-per-goal starting probability above.
- Run many simulated games between three average-rated players per side. The average goals per side should be close to the chosen baseline.
- Simulate the same matchup repeatedly and confirm that scores vary and both sides can win; across many runs, stronger teams should still win more often.
- Compare evenly matched teams and materially mismatched teams over many trials. The stronger team should win more often, without scores becoming implausibly extreme.
- Check that changing one attribute has the intended effect: attack raises own scoring, playmaking has a smaller positive effect, and opponent defence lowers scoring.
- Keep the random-number generator seedable in tests so score-generation edge cases are reproducible.

## Known limitations and next data

Season 10 stats are player-level season aggregates, not match results. They cannot directly calibrate score variance, score distributions, home/away effects, overtime frequency, opponent strength, or the causal effect of defence on goals conceded. Saves-per-game also depends on how much pressure a player's team faced.

If available later, store match-level team scores and lineups. Those records would allow the simulator to validate average goals, score variance, the impact of player attributes, and whether the model predicts winners better than a baseline.
