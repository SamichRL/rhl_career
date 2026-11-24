const TEAM_SIZE = 3;
const BASE_GOALS = 2.31;

function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

function takeRandom(values, random) {
  return values.splice(randomIndex(values.length, random), 1)[0];
}

function average(players, attribute) {
  return players.reduce((total, player) => total + player[attribute], 0) / players.length;
}

function goalsExpected(team, opponent) {
  const attack = average(team.players, "attack");
  const playmaking = average(team.players, "playmaking");
  const opponentDefence = average(opponent.players, "defence");

  return BASE_GOALS * Math.exp(
    0.012 * (attack - 75) +
    0.006 * (playmaking - 75) -
    0.008 * (opponentDefence - 75)
  );
}

function poisson(lambda, random) {
  const threshold = Math.exp(-lambda);
  let count = 0;
  let product = 1;

  do {
    count += 1;
    product *= random();
  } while (product > threshold);

  return count - 1;
}

function simulateGame(teamA, teamB, random) {
  const formA = 0.85 + random() * 0.3;
  const formB = 0.85 + random() * 0.3;
  const rateA = goalsExpected(teamA, teamB) * formA;
  const rateB = goalsExpected(teamB, teamA) * formB;
  const regulationA = poisson(rateA, random);
  const regulationB = poisson(rateB, random);
  const overtime = regulationA === regulationB;
  let scoreA = regulationA;
  let scoreB = regulationB;

  if (overtime) {
    if (random() < rateA / (rateA + rateB)) {
      scoreA += 1;
    } else {
      scoreB += 1;
    }
  }

  return { regulationA, regulationB, scoreA, scoreB, overtime };
}

function teamId(index) {
  return `team-${index + 1}`;
}

function buildDefaultTeams(players) {
  const playersByTeam = new Map();
  players.forEach((player) => {
    if (!player.startingTeam) return;
    const roster = playersByTeam.get(player.startingTeam) ?? [];
    roster.push(player);
    playersByTeam.set(player.startingTeam, roster);
  });

  return [...playersByTeam.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([name, roster], index) => {
      const regionCounts = roster.reduce((counts, player) => {
        const region = player.region === "na" ? "NA" : "EU/MENA";
        counts[region] = (counts[region] ?? 0) + 1;
        return counts;
      }, {});
      const region = Object.entries(regionCounts)
        .sort(([regionA, countA], [regionB, countB]) =>
          countB - countA || regionA.localeCompare(regionB)
        )[0][0];

      return {
        id: teamId(index),
        name,
        region,
        players: [...roster]
          .sort((playerA, playerB) =>
            playerB.rating - playerA.rating || playerA.name.localeCompare(playerB.name)
          )
          .slice(0, TEAM_SIZE),
        isUserTeam: false,
        seriesWins: 0,
        seriesLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        headToHead: {}
      };
    });
}

export function getDefaultTeams(players) {
  return buildDefaultTeams(players);
}

export function createCareerSetup(players, {
  teamId = null,
  draft: existingDraft = null,
  random = Math.random
} = {}) {
  const teams = buildDefaultTeams(players);
  if (teams.length !== 16 || players.length < teams.length * TEAM_SIZE) {
    throw new Error("The Season 10 setup needs 16 default teams and at least three players per team.");
  }

  const availableDraftPlayers = [...players];
  const draft = existingDraft
    ? [...existingDraft]
    : Array.from({ length: TEAM_SIZE }, () =>
      takeRandom(availableDraftPlayers, random)
    );
  if (draft.length !== TEAM_SIZE || new Set(draft.map((player) => player.name)).size !== TEAM_SIZE) {
    throw new Error("A career team must have three distinct players.");
  }
  const userTeam = teamId
    ? teams.find((team) => team.id === teamId)
    : teams[randomIndex(teams.length, random)];
  if (!userTeam) {
    throw new Error("Choose one of the 16 default teams or use the random team option.");
  }
  const draftedNames = new Set(draft.map((player) => player.name));
  const assignedNames = new Set(draftedNames);

  teams.forEach((team) => {
    if (team.id === userTeam.id) {
      team.players = [...draft];
      team.isUserTeam = true;
      return;
    }
    team.players = team.players.filter((player) => !draftedNames.has(player.name));
    team.players.forEach((player) => assignedNames.add(player.name));
  });

  const freePlayers = players.filter((player) => !assignedNames.has(player.name));
  teams.forEach((team) => {
    while (team.players.length < TEAM_SIZE) {
      if (freePlayers.length === 0) {
        throw new Error(`Not enough available players to fill ${team.name}'s lineup.`);
      }
      const player = takeRandom(freePlayers, random);
      team.players.push(player);
      assignedNames.add(player.name);
    }
  });

  if (teams.some((team) => team.players.length !== TEAM_SIZE)) {
    throw new Error("Every team must have exactly three players before the season starts.");
  }

  return { teams, draft, userTeamId: userTeam.id };
}

function createWeeks(teams) {
  const byRegion = new Map();
  teams.forEach((team) => {
    const regionTeams = byRegion.get(team.region) ?? [];
    regionTeams.push(team);
    byRegion.set(team.region, regionTeams);
  });

  const weeks = Array.from({ length: 7 }, (_, index) => ({
    number: index + 1,
    matches: []
  }));
  byRegion.forEach((regionTeams, region) => {
    if (regionTeams.length !== 8) {
      throw new Error(`${region} needs eight teams for the seven-week schedule.`);
    }
    const rotation = [...regionTeams].sort((a, b) => a.name.localeCompare(b.name));

    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      for (let pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
        weeks[weekIndex].matches.push({
          id: `${region}-${weekIndex + 1}-${pairIndex + 1}`,
          region,
          teamAId: rotation[pairIndex].id,
          teamBId: rotation[rotation.length - 1 - pairIndex].id,
          result: null
        });
      }
      rotation.splice(1, 0, rotation.pop());
    }
  });

  return weeks;
}

export function createSeason(setup) {
  const teams = setup.teams.map((team) => ({ ...team, headToHead: {} }));
  return {
    teams,
    userTeamId: setup.userTeamId,
    weeks: createWeeks(teams),
    currentWeek: 0,
    final: null,
    championId: null
  };
}

function simulateSeries(teamA, teamB, bestOf, random) {
  const winsRequired = Math.ceil(bestOf / 2);
  let winsA = 0;
  let winsB = 0;
  const games = [];

  while (winsA < winsRequired && winsB < winsRequired) {
    const game = simulateGame(teamA, teamB, random);
    if (game.scoreA > game.scoreB) {
      winsA += 1;
    } else {
      winsB += 1;
    }
    games.push(game);
  }

  return {
    games,
    teamAWins: winsA,
    teamBWins: winsB,
    winnerId: winsA > winsB ? teamA.id : teamB.id
  };
}

function recordSeries(teamA, teamB, result) {
  const teamAWon = result.winnerId === teamA.id;
  const winner = teamAWon ? teamA : teamB;
  const loser = teamAWon ? teamB : teamA;
  const gamesForA = result.teamAWins;
  const gamesForB = result.teamBWins;

  winner.seriesWins += 1;
  loser.seriesLosses += 1;
  teamA.gameWins += gamesForA;
  teamA.gameLosses += gamesForB;
  teamB.gameWins += gamesForB;
  teamB.gameLosses += gamesForA;
  teamA.headToHead[teamB.id] = teamAWon ? 1 : -1;
  teamB.headToHead[teamA.id] = teamAWon ? -1 : 1;
  result.gameDifferentialA = gamesForA - gamesForB;
  result.gameDifferentialB = gamesForB - gamesForA;
}

export function simulateWeek(season, weekIndex, random = Math.random) {
  const week = season.weeks[weekIndex];
  if (!week || weekIndex !== season.currentWeek || week.matches.some((match) => match.result)) {
    throw new Error("Only the next unplayed week can be simulated.");
  }

  week.matches.forEach((match) => {
    const teamA = season.teams.find((team) => team.id === match.teamAId);
    const teamB = season.teams.find((team) => team.id === match.teamBId);
    match.result = simulateSeries(teamA, teamB, 5, random);
    recordSeries(teamA, teamB, match.result);
  });
  season.currentWeek += 1;
  return week;
}

export function getStandings(season, region) {
  return season.teams
    .filter((team) => team.region === region)
    .sort((teamA, teamB) => {
      const winsDifference = teamB.seriesWins - teamA.seriesWins;
      if (winsDifference) return winsDifference;

      const gameDiffA = teamA.gameWins - teamA.gameLosses;
      const gameDiffB = teamB.gameWins - teamB.gameLosses;
      if (gameDiffA !== gameDiffB) return gameDiffB - gameDiffA;

      if (teamA.headToHead[teamB.id] !== undefined) {
        return teamB.headToHead[teamA.id] - teamA.headToHead[teamB.id];
      }
      return teamA.name.localeCompare(teamB.name);
    });
}

export function simulateChampionship(season, random = Math.random) {
  if (season.currentWeek !== season.weeks.length || season.final) {
    throw new Error("The championship final is available once league play is complete.");
  }

  const finalists = ["NA", "EU/MENA"].map((region) => getStandings(season, region)[0]);
  const [teamA, teamB] = finalists;
  season.final = {
    region: "Championship",
    teamAId: teamA.id,
    teamBId: teamB.id,
    result: simulateSeries(teamA, teamB, 7, random)
  };
  season.championId = season.final.result.winnerId;
  return season.final;
}
