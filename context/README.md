# RHL project context

This folder captures product and implementation context for the RHL career simulator.

- [Match simulator concept](./match-simulator.md) describes a first-pass approach for simulating five-minute 3v3 games from player attributes.
- [Season 10 scoring baseline](./season-10-baseline.md) records the calculations and limitations from the supplied stats dataset.

The first playable version drafts three random players, lets the user choose a default
team to replace (or assigns one randomly), and fills lineup gaps from the remaining
player pool. It starts at League Play because qualifier entrants and rosters are not
provided, then follows the documented League Play, regional playoff, LCQ,
international group, and championship-bracket formats. Each week's or round's game
scores remain visible until the user continues. During bracket stages, match cards
identify their round and a live bracket is displayed above the matches with separate
upper/lower lanes and advancement routes. The remaining implementation gaps are listed
in [outstanding context](./outstanding.md).
