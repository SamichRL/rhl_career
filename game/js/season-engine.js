const TEAM_SIZE = 3;
const BASE_GOALS = 2.31;
const REGIONS = ["NA", "EU"];
const SERIES_FORMATS = {
  bestOfFive: 5,
  bestOfSeven: 7
};

function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

function takeRandom(values, random) {
  return values.splice(randomIndex(values.length, random), 1)[0];
}

function shuffle(values, random) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function average(players, attribute) {
  return players.reduce((total, player) => total + player[attribute], 0) / players.length;
}

function goalsExpected(team, opponent) {
  const ratingDifference =
    average(team.players, "rating") - average(opponent.players, "rating");
  return BASE_GOALS * Math.exp(0.01 * ratingDifference);
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

function simulateSeries(teamA, teamB, match, random) {
  const winsRequired = Math.ceil(match.bestOf / 2);
  let winsA = match.advantageA ?? 0;
  let winsB = match.advantageB ?? 0;
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

  const winner = winsA > winsB ? teamA : teamB;
  const loser = winsA > winsB ? teamB : teamA;
  return {
    games,
    teamAWins: winsA,
    teamBWins: winsB,
    winnerId: winner.id,
    loserId: loser.id
  };
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
        const region = player.region === "na" ? "NA" : "EU";
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
        logo: `graphics/s10_logos/${name}.png`,
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
  teamId: selectedTeamId = null,
  teamName = "Your Team",
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
  const userTeam = selectedTeamId
    ? teams.find((team) => team.id === selectedTeamId)
    : teams[randomIndex(teams.length, random)];
  if (!userTeam) {
    throw new Error("Choose one of the 16 default teams or use the random team option.");
  }
  userTeam.name = String(teamName ?? "").trim() || "Your Team";
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

function createLeagueWeeks(teams) {
  const weeks = Array.from({ length: 7 }, (_, index) => ({
    number: index + 1,
    matches: []
  }));
  const byRegion = new Map();
  teams.forEach((team) => {
    const regionTeams = byRegion.get(team.region) ?? [];
    regionTeams.push(team);
    byRegion.set(team.region, regionTeams);
  });

  byRegion.forEach((regionTeams, region) => {
    if (regionTeams.length !== 8) {
      throw new Error(`${region} needs eight teams for League Play.`);
    }
    const rotation = [...regionTeams].sort((a, b) => a.name.localeCompare(b.name));

    for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
      const weekIndex = roundIndex;
      for (let pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
        weeks[weekIndex].matches.push({
          id: `${region}-week-${weekIndex + 1}-round-${roundIndex + 1}-match-${pairIndex + 1}`,
          key: `${region}-round-${roundIndex + 1}-match-${pairIndex + 1}`,
          label: `${region} League Play · Round ${roundIndex + 1}, Match ${pairIndex + 1}`,
          region,
          teamAId: rotation[pairIndex].id,
          teamBId: rotation[rotation.length - 1 - pairIndex].id,
          bestOf: SERIES_FORMATS.bestOfFive,
          advantageA: 0,
          advantageB: 0,
          result: null
        });
      }
      rotation.splice(1, 0, rotation.pop());
    }
  });

  return weeks;
}

export function createSeason(setup) {
  const teams = setup.teams.map((team) => ({
    ...team,
    headToHead: {},
    seriesWins: 0,
    seriesLosses: 0,
    gameWins: 0,
    gameLosses: 0
  }));
  return {
    teams,
    userTeamId: setup.userTeamId,
    stage: "league_play",
    leagueWeeks: createLeagueWeeks(teams),
    currentWeek: 0,
    stageRoundIndex: 0,
    activeRound: null,
    history: [],
    regionalBrackets: {},
    lcqBrackets: {},
    internationalGroups: null,
    championshipBracket: null,
    qualificationTiebreakWins: {},
    championId: null
  };
}

function teamById(season, id) {
  const team = season.teams.find((item) => item.id === id);
  if (!team) throw new Error(`Could not find team ${id}.`);
  return team;
}

function recordLeagueSeries(season, match) {
  const teamA = teamById(season, match.teamAId);
  const teamB = teamById(season, match.teamBId);
  const teamAWon = match.result.winnerId === teamA.id;
  const winner = teamAWon ? teamA : teamB;
  const loser = teamAWon ? teamB : teamA;
  winner.seriesWins += 1;
  loser.seriesLosses += 1;
  teamA.gameWins += match.result.teamAWins;
  teamA.gameLosses += match.result.teamBWins;
  teamB.gameWins += match.result.teamBWins;
  teamB.gameLosses += match.result.teamAWins;
  teamA.headToHead[teamB.id] = teamAWon ? 1 : -1;
  teamB.headToHead[teamA.id] = teamAWon ? -1 : 1;
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

      const tiedTeams = season.teams.filter((team) =>
        team.region === region &&
        team.seriesWins === teamA.seriesWins &&
        team.gameWins - team.gameLosses === gameDiffA
      );
      const headToHeadWins = (team) => tiedTeams.reduce((wins, opponent) =>
        wins + (team.headToHead[opponent.id] === 1 ? 1 : 0), 0
      );
      const headToHeadDifference = headToHeadWins(teamB) - headToHeadWins(teamA);
      if (headToHeadDifference) return headToHeadDifference;

      const tiebreakDifference =
        (season.qualificationTiebreakWins[teamB.id] ?? 0) -
        (season.qualificationTiebreakWins[teamA.id] ?? 0);
      if (tiebreakDifference) return tiebreakDifference;
      return teamA.name.localeCompare(teamB.name);
    });
}

function newRound(stage, title, matches, description) {
  return {
    stage,
    title,
    description,
    matches,
    resultsReady: false
  };
}

function makeMatch({
  key,
  region = null,
  group = null,
  teamAId,
  teamBId,
  bestOf,
  advantageA = 0,
  advantageB = 0
}) {
  return {
    id: key,
    key,
    label: getMatchLabel(key, group, region),
    region,
    group,
    teamAId,
    teamBId,
    bestOf,
    advantageA,
    advantageB,
    result: null
  };
}

function getMatchLabel(key, group, region) {
  const labels = {
    upper_semi_1: "Upper Bracket Semifinal 1",
    upper_semi_2: "Upper Bracket Semifinal 2",
    winners_final: "Winners Final",
    losers_semi: "Losers Semifinal",
    losers_final: "Losers Final",
    regional_grand_final: "Regional Grand Final",
    upper_final: "Upper Bracket Final",
    lower_semi: "Lower Bracket Semifinal",
    lower_final: "Lower Bracket Final",
    international_upper_final: "International Upper Bracket Final",
    international_lower_qf_1: "Lower Bracket Quarterfinal 1",
    international_lower_qf_2: "Lower Bracket Quarterfinal 2",
    international_lower_semi: "Lower Bracket Semifinal",
    international_lower_final: "Lower Bracket Final",
    international_grand_final: "International Grand Final"
  };
  const groupMatch = key.match(/^group_([AB])_(.+)$/);
  if (groupMatch) {
    const subLabel = labels[groupMatch[2]] ?? groupMatch[2].replace(/_/g, " ");
    return `Group ${groupMatch[1]} · ${subLabel}`;
  }
  if (key.startsWith("qualification_tiebreak_")) {
    return `${region} · Qualification Tiebreaker`;
  }
  const leagueMatch = key.match(/-round-(\d+)-match-(\d+)$/);
  if (leagueMatch) {
    return `${region} League Play · Round ${leagueMatch[1]}, Match ${leagueMatch[2]}`;
  }
  return labels[key] ?? key.replace(/_/g, " ");
}

function getCompletedRounds(season, stage) {
  return season.history.filter((round) => round.stage === stage);
}

function getMatchResult(round, region, key) {
  const match = round.matches.find((item) => item.region === region && item.key === key);
  if (!match?.result) throw new Error(`Missing completed result for ${region} ${key}.`);
  return match.result;
}

function createLeagueRound(season) {
  const week = season.leagueWeeks[season.currentWeek];
  return newRound(
    "league_play",
    `League Play · Week ${week.number} of 7`,
    week.matches,
    "Single round-robin · One Best-of-5 series per team this week."
  );
}

function createRegionalPlayoffRound(season) {
  const completed = getCompletedRounds(season, "regional_playoffs");
  const roundIndex = season.stageRoundIndex;
  const matches = [];

  REGIONS.forEach((region) => {
    const bracket = season.regionalBrackets[region];
    if (roundIndex === 0) {
      matches.push(
        makeMatch({
          key: "upper_semi_1", region,
          teamAId: bracket.seeds[0], teamBId: bracket.seeds[3],
          bestOf: SERIES_FORMATS.bestOfFive
        }),
        makeMatch({
          key: "upper_semi_2", region,
          teamAId: bracket.seeds[1], teamBId: bracket.seeds[2],
          bestOf: SERIES_FORMATS.bestOfFive
        })
      );
    } else if (roundIndex === 1) {
      const upperSemis = completed[0];
      const semi1 = getMatchResult(upperSemis, region, "upper_semi_1");
      const semi2 = getMatchResult(upperSemis, region, "upper_semi_2");
      matches.push(
        makeMatch({
          key: "winners_final", region,
          teamAId: semi1.winnerId, teamBId: semi2.winnerId,
          bestOf: SERIES_FORMATS.bestOfFive
        }),
        makeMatch({
          key: "losers_semi", region,
          teamAId: semi1.loserId, teamBId: semi2.loserId,
          bestOf: SERIES_FORMATS.bestOfFive
        })
      );
    } else if (roundIndex === 2) {
      const semifinals = completed[1];
      const winnersFinal = getMatchResult(semifinals, region, "winners_final");
      const losersSemi = getMatchResult(semifinals, region, "losers_semi");
      matches.push(makeMatch({
        key: "losers_final", region,
        teamAId: winnersFinal.loserId, teamBId: losersSemi.winnerId,
        bestOf: SERIES_FORMATS.bestOfFive
      }));
    } else if (roundIndex === 3) {
      const semifinals = completed[1];
      const losersFinalRound = completed[2];
      const winnersFinal = getMatchResult(semifinals, region, "winners_final");
      const losersFinal = getMatchResult(losersFinalRound, region, "losers_final");
      matches.push(makeMatch({
        key: "regional_grand_final", region,
        teamAId: winnersFinal.winnerId, teamBId: losersFinal.winnerId,
        bestOf: SERIES_FORMATS.bestOfSeven,
        advantageA: 1
      }));
    }
  });

  const titles = [
    "Regional Playoffs · Upper Semifinals",
    "Regional Playoffs · Winners Finals and Losers Semifinals",
    "Regional Playoffs · Losers Finals",
    "Regional Playoffs · Grand Finals"
  ];
  const descriptions = [
    "Seeds 1 vs 4 and 2 vs 3 · Best-of-5",
    "Winners and losers bracket matches · Best-of-5",
    "Loser of Winners Final vs winner of Losers Semi · Best-of-5",
    "Upper-bracket team starts 1-0 · Best-of-7"
  ];
  return newRound("regional_playoffs", titles[roundIndex], matches, descriptions[roundIndex]);
}

function createRegionalBrackets(season) {
  season.regionalBrackets = Object.fromEntries(
    REGIONS.map((region) => [
      region,
      {
        seeds: getStandings(season, region).slice(0, 4).map((team) => team.id),
        thirdPlaceId: null,
        fourthPlaceId: null,
        finalists: []
      }
    ])
  );
  season.stage = "regional_playoffs";
  season.stageRoundIndex = 0;
}

function getHeadToHeadWinsWithinTie(season, team, region, wins, gameDiff) {
  return season.teams.reduce((total, opponent) => {
    const opponentGameDiff = opponent.gameWins - opponent.gameLosses;
    return total + (
      opponent.region === region &&
      opponent.seriesWins === wins &&
      opponentGameDiff === gameDiff &&
      team.headToHead[opponent.id] === 1
        ? 1
        : 0
    );
  }, 0);
}

function createQualificationTiebreakRound(season) {
  const matches = [];
  REGIONS.forEach((region) => {
    const standings = getStandings(season, region);
    [3, 5].forEach((boundaryIndex) => {
      const teamA = standings[boundaryIndex];
      const teamB = standings[boundaryIndex + 1];
      if (!teamA || !teamB) return;
      const gameDiffA = teamA.gameWins - teamA.gameLosses;
      const gameDiffB = teamB.gameWins - teamB.gameLosses;
      if (teamA.seriesWins !== teamB.seriesWins || gameDiffA !== gameDiffB) return;

      const headToHeadA = getHeadToHeadWinsWithinTie(
        season, teamA, region, teamA.seriesWins, gameDiffA
      );
      const headToHeadB = getHeadToHeadWinsWithinTie(
        season, teamB, region, teamB.seriesWins, gameDiffB
      );
      if (headToHeadA !== headToHeadB) return;
      matches.push(makeMatch({
        key: `qualification_tiebreak_${region}_${boundaryIndex + 1}`,
        region,
        teamAId: teamA.id,
        teamBId: teamB.id,
        bestOf: SERIES_FORMATS.bestOfFive
      }));
    });
  });
  return matches;
}

function createLcqBrackets(season) {
  season.lcqBrackets = {};
  REGIONS.forEach((region) => {
    const standings = getStandings(season, region);
    const regionalBracket = season.regionalBrackets[region];
    const regionalRounds = getCompletedRounds(season, "regional_playoffs");
    const losersSemi = getMatchResult(regionalRounds[1], region, "losers_semi");
    const losersFinal = getMatchResult(regionalRounds[2], region, "losers_final");
    const grandFinal = getMatchResult(regionalRounds[3], region, "regional_grand_final");
    regionalBracket.thirdPlaceId = losersFinal.loserId;
    regionalBracket.fourthPlaceId = losersSemi.loserId;
    regionalBracket.finalists = [grandFinal.winnerId, grandFinal.loserId];
    season.lcqBrackets[region] = {
      thirdPlaceId: regionalBracket.thirdPlaceId,
      fourthPlaceId: regionalBracket.fourthPlaceId,
      fifthPlaceId: standings[4].id,
      sixthPlaceId: standings[5].id,
      qualifiers: []
    };
  });
  season.stage = "regional_lcq";
  season.stageRoundIndex = 0;
}

function createLcqRound(season) {
  const completed = getCompletedRounds(season, "regional_lcq");
  const roundIndex = season.stageRoundIndex;
  const matches = [];

  REGIONS.forEach((region) => {
    const bracket = season.lcqBrackets[region];
    if (roundIndex === 0) {
      matches.push(
        makeMatch({
          key: "upper_final", region,
          teamAId: bracket.thirdPlaceId, teamBId: bracket.fourthPlaceId,
          bestOf: SERIES_FORMATS.bestOfFive
        }),
        makeMatch({
          key: "lower_semi", region,
          teamAId: bracket.fifthPlaceId, teamBId: bracket.sixthPlaceId,
          bestOf: SERIES_FORMATS.bestOfFive
        })
      );
    } else {
      const opening = completed[0];
      const upperFinal = getMatchResult(opening, region, "upper_final");
      const lowerSemi = getMatchResult(opening, region, "lower_semi");
      matches.push(makeMatch({
        key: "lower_final", region,
        teamAId: upperFinal.loserId, teamBId: lowerSemi.winnerId,
        bestOf: SERIES_FORMATS.bestOfFive
      }));
    }
  });

  return newRound(
    "regional_lcq",
    roundIndex === 0 ? "Regional LCQ · Upper Finals and Lower Semifinals" : "Regional LCQ · Lower Finals",
    matches,
    roundIndex === 0
      ? "Top 3 vs 4th from Regional Playoffs; League Play 5th vs 6th · Best-of-5"
      : "Loser of Upper Final vs winner of Lower Semi · Best-of-5"
  );
}

function createInternationalGroups(season, random) {
  const entrantsByRegion = Object.fromEntries(
    REGIONS.map((region) => {
      const regional = season.regionalBrackets[region];
      const lcq = season.lcqBrackets[region];
      return [region, [...regional.finalists, ...lcq.qualifiers]];
    })
  );
  const shuffledNA = shuffle(entrantsByRegion.NA, random);
  const shuffledEU = shuffle(entrantsByRegion.EU, random);
  season.internationalGroups = {
    A: [...shuffledNA.slice(0, 2), ...shuffledEU.slice(0, 2)],
    B: [...shuffledNA.slice(2), ...shuffledEU.slice(2)],
    placements: {}
  };
  season.stage = "international_groups";
  season.stageRoundIndex = 0;
}

function createInternationalGroupRound(season) {
  const roundIndex = season.stageRoundIndex;
  const matches = [];
  ["A", "B"].forEach((groupName) => {
    const group = season.internationalGroups[groupName];
    if (roundIndex === 0) {
      matches.push(
        makeMatch({
          key: `group_${groupName}_upper_semi_1`,
          group: groupName,
          teamAId: group[0], teamBId: group[3],
          bestOf: SERIES_FORMATS.bestOfFive
        }),
        makeMatch({
          key: `group_${groupName}_upper_semi_2`,
          group: groupName,
          teamAId: group[1], teamBId: group[2],
          bestOf: SERIES_FORMATS.bestOfFive
        })
      );
    } else {
      const opening = getCompletedRounds(season, "international_groups")[0];
      const semi1 = getMatchResult(opening, null, `group_${groupName}_upper_semi_1`);
      const semi2 = getMatchResult(opening, null, `group_${groupName}_upper_semi_2`);
      matches.push(
        makeMatch({
          key: `group_${groupName}_upper_final`,
          group: groupName,
          teamAId: semi1.winnerId, teamBId: semi2.winnerId,
          bestOf: SERIES_FORMATS.bestOfFive
        }),
        makeMatch({
          key: `group_${groupName}_lower_final`,
          group: groupName,
          teamAId: semi1.loserId, teamBId: semi2.loserId,
          bestOf: SERIES_FORMATS.bestOfFive
        })
      );
    }
  });
  return newRound(
    "international_groups",
    roundIndex === 0
      ? "International Groups · Upper Semifinals"
      : "International Groups · Upper and Lower Finals",
    matches,
    "Two balanced groups of four · Best-of-5"
  );
}

function createChampionshipBracket(season) {
  const groupRounds = getCompletedRounds(season, "international_groups");
  ["A", "B"].forEach((groupName) => {
    const finals = groupRounds[1];
    const upperFinal = getMatchResult(finals, null, `group_${groupName}_upper_final`);
    const lowerFinal = getMatchResult(finals, null, `group_${groupName}_lower_final`);
    season.internationalGroups.placements[groupName] = {
      first: upperFinal.winnerId,
      second: upperFinal.loserId,
      third: lowerFinal.winnerId,
      fourth: lowerFinal.loserId
    };
  });
  season.championshipBracket = {};
  season.stage = "international_championship";
  season.stageRoundIndex = 0;
}

function createInternationalChampionshipRound(season) {
  const completed = getCompletedRounds(season, "international_championship");
  const bracket = season.internationalGroups.placements;
  const roundIndex = season.stageRoundIndex;
  let matches;

  if (roundIndex === 0) {
    matches = [
      makeMatch({
        key: "international_upper_final",
        teamAId: bracket.A.first, teamBId: bracket.B.first,
        bestOf: SERIES_FORMATS.bestOfSeven
      }),
      makeMatch({
        key: "international_lower_qf_1",
        teamAId: bracket.B.second, teamBId: bracket.A.third,
        bestOf: SERIES_FORMATS.bestOfSeven
      }),
      makeMatch({
        key: "international_lower_qf_2",
        teamAId: bracket.A.second, teamBId: bracket.B.third,
        bestOf: SERIES_FORMATS.bestOfSeven
      })
    ];
  } else if (roundIndex === 1) {
    const opening = completed[0];
    matches = [makeMatch({
      key: "international_lower_semi",
      teamAId: getMatchResult(opening, null, "international_lower_qf_1").winnerId,
      teamBId: getMatchResult(opening, null, "international_lower_qf_2").winnerId,
      bestOf: SERIES_FORMATS.bestOfSeven
    })];
  } else if (roundIndex === 2) {
    const opening = completed[0];
    const lowerSemi = getMatchResult(completed[1], null, "international_lower_semi");
    matches = [makeMatch({
      key: "international_lower_final",
      teamAId: getMatchResult(opening, null, "international_upper_final").loserId,
      teamBId: lowerSemi.winnerId,
      bestOf: SERIES_FORMATS.bestOfSeven
    })];
  } else {
    const opening = completed[0];
    const lowerFinal = getMatchResult(completed[2], null, "international_lower_final");
    matches = [makeMatch({
      key: "international_grand_final",
      teamAId: getMatchResult(opening, null, "international_upper_final").winnerId,
      teamBId: lowerFinal.winnerId,
      bestOf: SERIES_FORMATS.bestOfSeven
    })];
  }

  const titles = [
    "International Championship · Upper Final and Lower Quarterfinals",
    "International Championship · Lower Semifinal",
    "International Championship · Lower Final",
    "International Championship · Grand Final"
  ];
  return newRound(
    "international_championship",
    titles[roundIndex],
    matches,
    "Six-team double elimination · Best-of-7 · No bracket reset"
  );
}

export function getCurrentRound(season) {
  if (season.stage === "complete") return null;
  if (season.activeRound) return season.activeRound;

  if (season.stage === "league_play") {
    season.activeRound = createLeagueRound(season);
  } else if (season.stage === "league_tiebreak") {
    season.activeRound = newRound(
      "league_tiebreak",
      "League Play · Qualification Tiebreakers",
      createQualificationTiebreakRound(season),
      "Unresolved qualification ties · Best-of-5"
    );
  } else if (season.stage === "regional_playoffs") {
    season.activeRound = createRegionalPlayoffRound(season);
  } else if (season.stage === "regional_lcq") {
    season.activeRound = createLcqRound(season);
  } else if (season.stage === "international_groups") {
    season.activeRound = createInternationalGroupRound(season);
  } else if (season.stage === "international_championship") {
    season.activeRound = createInternationalChampionshipRound(season);
  }
  return season.activeRound;
}

export function simulateCurrentStep(season, random = Math.random) {
  const round = getCurrentRound(season);
  if (!round || round.resultsReady) {
    throw new Error("Continue past the displayed results before simulating the next round.");
  }

  round.matches.forEach((match) => {
    if (match.result) throw new Error("This round already contains a match result.");
    match.result = simulateSeries(
      teamById(season, match.teamAId),
      teamById(season, match.teamBId),
      match,
      random
    );
    if (round.stage === "league_play") {
      recordLeagueSeries(season, match);
    }
  });
  round.resultsReady = true;

  if (
    season.stage === "international_championship" &&
    season.stageRoundIndex === 3
  ) {
    season.championId = round.matches[0].result.winnerId;
  }
  return round;
}

function advanceFromLeaguePlay(season) {
  season.currentWeek += 1;
  if (season.currentWeek === season.leagueWeeks.length) {
    const tiebreaks = createQualificationTiebreakRound(season);
    if (tiebreaks.length > 0) {
      season.stage = "league_tiebreak";
      season.stageRoundIndex = 0;
      season.activeRound = newRound(
        "league_tiebreak",
        "League Play · Qualification Tiebreakers",
        tiebreaks,
        "Unresolved qualification ties · Best-of-5"
      );
    } else {
      createRegionalBrackets(season);
    }
  }
}

function advanceFromLeagueTiebreak(season, round) {
  round.matches.forEach((match) => {
    const winnerId = match.result.winnerId;
    season.qualificationTiebreakWins[winnerId] =
      (season.qualificationTiebreakWins[winnerId] ?? 0) + 1;
  });
  createRegionalBrackets(season);
}

function advanceFromRegionalPlayoffs(season) {
  season.stageRoundIndex += 1;
  if (season.stageRoundIndex === 4) {
    createLcqBrackets(season);
  }
}

function advanceFromLcq(season, random) {
  season.stageRoundIndex += 1;
  if (season.stageRoundIndex === 2) {
    REGIONS.forEach((region) => {
      const bracket = season.lcqBrackets[region];
      const rounds = getCompletedRounds(season, "regional_lcq");
      const opening = getMatchResult(rounds[0], region, "upper_final");
      const lowerFinal = getMatchResult(rounds[1], region, "lower_final");
      bracket.qualifiers = [opening.winnerId, lowerFinal.winnerId];
    });
    createInternationalGroups(season, random);
  }
}

function advanceFromInternationalGroups(season) {
  season.stageRoundIndex += 1;
  if (season.stageRoundIndex === 2) {
    createChampionshipBracket(season);
  }
}

function advanceFromInternationalChampionship(season) {
  season.stageRoundIndex += 1;
  if (season.stageRoundIndex === 4) {
    season.stage = "complete";
  }
}

export function continueSeason(season, random = Math.random) {
  const round = getCurrentRound(season);
  if (!round?.resultsReady) {
    throw new Error("Simulate this round and review its scores before continuing.");
  }
  season.history.push(round);
  season.activeRound = null;

  if (season.stage === "league_play") {
    advanceFromLeaguePlay(season);
  } else if (season.stage === "league_tiebreak") {
    advanceFromLeagueTiebreak(season, round);
  } else if (season.stage === "regional_playoffs") {
    advanceFromRegionalPlayoffs(season);
  } else if (season.stage === "regional_lcq") {
    advanceFromLcq(season, random);
  } else if (season.stage === "international_groups") {
    advanceFromInternationalGroups(season);
  } else if (season.stage === "international_championship") {
    advanceFromInternationalChampionship(season);
  }
  return season.stage;
}

export function advanceToNextUserMatch(season, random = Math.random) {
  let round = getCurrentRound(season);
  let skippedRounds = 0;

  while (
    round &&
    !round.matches.some((match) =>
      match.teamAId === season.userTeamId || match.teamBId === season.userTeamId
    )
  ) {
    if (skippedRounds >= 100) {
      throw new Error("Could not find the next match for your team.");
    }
    simulateCurrentStep(season, random);
    continueSeason(season, random);
    skippedRounds += 1;
    round = getCurrentRound(season);
  }

  return { round, skippedRounds };
}

export function getStageLabel(season) {
  if (season.stage === "league_play") return "League Play";
  if (season.stage === "league_tiebreak") return "League Play Tiebreakers";
  if (season.stage === "regional_playoffs") return "Regional Playoffs";
  if (season.stage === "regional_lcq") return "Regional Last Chance Qualifier";
  if (season.stage === "international_groups") return "International Playoffs · Groups";
  if (season.stage === "international_championship") return "International Playoffs · Championship";
  return "Season Complete";
}

export function getChampion(season) {
  return season.championId ? teamById(season, season.championId) : null;
}
