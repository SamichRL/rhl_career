export function createTeam({ id, name, region, roster = [], captain = null, anchors = [], transactions = 2 }) {
  const uniqueRoster = [...new Set(roster)];

  return {
    id,
    name: name ?? id,
    region: region ?? null,
    roster: uniqueRoster,
    startingLineup: uniqueRoster.slice(0, 3),
    captain,
    anchors: [...new Set(anchors)],
    remainingTransactions: transactions
  };
}

export function createGame(teamAId, teamBId) {
  return {
    id: null,
    teamAId,
    teamBId,
    regulation: { teamA: null, teamB: null },
    overtime: false,
    overtimeWinnerId: null,
    finalScore: { teamA: null, teamB: null },
    winnerId: null,
    goalEvents: []
  };
}

export function createSeries({ id, stage, format, teamAId, teamBId, startingAdvantage = null }) {
  return {
    id,
    stage,
    format,
    teamAId,
    teamBId,
    startingAdvantage,
    games: [],
    teamAResult: { gamesWon: startingAdvantage?.teamA ?? 0, gamesLost: 0 },
    teamBResult: { gamesWon: startingAdvantage?.teamB ?? 0, gamesLost: 0 },
    winnerId: null,
    status: "scheduled"
  };
}

export function createStanding(teamId) {
  return {
    teamId,
    seriesWins: 0,
    seriesLosses: 0,
    gamesWon: 0,
    gamesLost: 0,
    headToHead: {}
  };
}

export function createBracket({ id, type, matches = [], status = "scheduled" }) {
  return {
    id,
    type,
    matches,
    status
  };
}

export function createSeason({ id, seed = Date.now(), name = "RHL Season 10" }) {
  return {
    id,
    name,
    seed,
    stage: "setup",
    currentRegion: null,
    teams: {},
    players: {},
    standings: {
      NA: {},
      "EU/MENA": {}
    },
    matches: [],
    brackets: {},
    championId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
