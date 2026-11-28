import { simulateSeries } from "./simulation.js";
import { createLeagueWeeks, getCurrentRound, createQualificationTiebreakRound, createRegionalBrackets, createLcqBrackets, createInternationalGroups, createChampionshipBracket, getCompletedRounds, getMatchResult } from "./competition.js";
import { getStandings } from "./standings.js";
import { getDefaultTeams, createCareerSetup } from "./team-setup.js";

const REGIONS = ["NA", "EU"];

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

export function simulateCurrentStep(season, random = Math.random, { forceUserWins = false } = {}) {
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
      random,
      forceUserWins && (match.teamAId === season.userTeamId || match.teamBId === season.userTeamId)
        ? season.userTeamId
        : null
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

export { getStandings, getDefaultTeams, createCareerSetup, getCurrentRound };
