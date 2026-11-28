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

