import { createTeamLogo } from "./team-logo.js";

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

function animateGoals(toA, toB, update) {
  return new Promise((resolve) => {
    const start = performance.now();
    const durationPerGoal = 150;
    const totalDuration = Math.max(toA, toB) * durationPerGoal;
    const frame = (now) => {
      const elapsed = now - start;
      update(
        Math.min(toA, Math.floor(elapsed / durationPerGoal)),
        Math.min(toB, Math.floor(elapsed / durationPerGoal))
      );
      if (elapsed < totalDuration) requestAnimationFrame(frame);
      else {
        update(toA, toB);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

function makeTeamIdentity(team) {
  const identity = document.createElement("div");
  identity.className = "match-team-identity";
  const logo = createTeamLogo(team);
  if (logo) identity.append(logo);
  const details = document.createElement("span");
  details.className = "match-team-details";
  const name = document.createElement("strong");
  name.textContent = team.name;
  const region = document.createElement("small");
  region.textContent = team.isUserTeam ? "Your team" : team.region;
  details.append(name, region);
  identity.append(details);
  return identity;
}

function renderAnimatedScores(cellsA, cellsB, resultNode, games, startWinsA, startWinsB, userOnRight, userIsA, onComplete, gameColumnOffset) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let winsA = startWinsA;
  let winsB = startWinsB;

  resultNode.textContent = `${winsA}–${winsB}`;
  resultNode.classList.add("is-visible");

  (async () => {
    for (let index = 0; index < games.length; index += 1) {
      const game = games[index];
      const scoreA = userOnRight ? game.scoreB : game.scoreA;
      const scoreB = userOnRight ? game.scoreA : game.scoreB;
      const cellA = cellsA[index + gameColumnOffset];
      const cellB = cellsB[index + gameColumnOffset];
      if (!reduceMotion) await wait(300);
      cellA.textContent = "0";
      cellB.textContent = "0";
      cellA.classList.add("is-visible");
      cellB.classList.add("is-visible");
      if (reduceMotion) {
        cellA.textContent = scoreA;
        cellB.textContent = scoreB;
      } else {
        await animateGoals(scoreA, scoreB, (countA, countB) => {
          cellA.textContent = countA;
          cellB.textContent = countB;
        });
      }
      const aWon = scoreA > scoreB;
      if (userIsA !== null) {
        const userCell = userIsA ? cellA : cellB;
        userCell.classList.add("is-user-score");
        userCell.classList.toggle("is-user-win", userIsA ? aWon : !aWon);
        userCell.classList.toggle("is-user-loss", userIsA ? !aWon : aWon);
      } else {
        cellA.classList.toggle("is-winner", aWon);
        cellB.classList.toggle("is-winner", !aWon);
      }
      if (aWon) winsA += 1;
      else winsB += 1;
      resultNode.textContent = `${winsA}–${winsB}`;
    }
    resultNode.classList.toggle("is-win", winsA > winsB);
    resultNode.classList.toggle("is-loss", winsA < winsB);
    window.setTimeout(onComplete, 250);
  })();
}

export function createMatchCard(match, season, {
  animate = false,
  onAnimationComplete = () => {},
  fallbackTeamAName = "TBD",
  fallbackTeamBName = "TBD",
  fallbackRegion = ""
} = {}) {
  const teamA = season.teams.find((team) => team.id === match.teamAId) ?? {
    id: match.teamAId,
    name: fallbackTeamAName,
    region: fallbackRegion,
    isUserTeam: false,
    logo: null
  };
  const teamB = season.teams.find((team) => team.id === match.teamBId) ?? {
    id: match.teamBId,
    name: fallbackTeamBName,
    region: fallbackRegion,
    isUserTeam: false,
    logo: null
  };
  const userOnRight = teamB.isUserTeam && !teamA.isUserTeam;
  const leftTeam = userOnRight ? teamB : teamA;
  const rightTeam = userOnRight ? teamA : teamB;
  const result = match.result;
  const bestOf = match.bestOf === 7 ? 7 : 5;
  const card = document.createElement("article");
  card.className = "match-card";
  card.style.setProperty("--match-game-count", bestOf);
  if (teamA.isUserTeam || teamB.isUserTeam) card.classList.add("user-match");

  const label = document.createElement("div");
  label.className = "match-label";
  label.textContent = match.label ?? "Season match";
  card.append(label);

  const scoreboard = document.createElement("div");
  scoreboard.className = `match-scoreboard best-of-${bestOf}`;
  scoreboard.setAttribute("role", "group");
  scoreboard.setAttribute("aria-label", `${match.label ?? "Match"}, best of ${bestOf}`);

  const teamHeading = document.createElement("span");
  teamHeading.className = "match-scoreboard-heading match-team-heading";
  teamHeading.textContent = "Team";
  scoreboard.append(teamHeading);
  for (let index = 0; index < bestOf; index += 1) {
    const heading = document.createElement("span");
    heading.className = "match-scoreboard-heading";
    heading.textContent = `G${index + 1}`;
    scoreboard.append(heading);
  }
  const seriesHeading = document.createElement("span");
  seriesHeading.className = "match-scoreboard-heading match-series-heading";
  seriesHeading.textContent = "Series";
  scoreboard.append(seriesHeading);

  const rowA = document.createElement("div");
  rowA.className = "match-score-row";
  rowA.append(makeTeamIdentity(leftTeam));
  const rowB = document.createElement("div");
  rowB.className = "match-score-row";
  rowB.append(makeTeamIdentity(rightTeam));
  const cellsA = [];
  const cellsB = [];
  for (let index = 0; index < bestOf; index += 1) {
    const cellA = document.createElement("span");
    cellA.className = "match-game-score";
    const cellB = document.createElement("span");
    cellB.className = "match-game-score";
    rowA.append(cellA);
    rowB.append(cellB);
    cellsA.push(cellA);
    cellsB.push(cellB);
  }
  const advantageA = userOnRight ? match.advantageB ?? 0 : match.advantageA ?? 0;
  const advantageB = userOnRight ? match.advantageA ?? 0 : match.advantageB ?? 0;
  const hasStartingAdvantage = advantageA > 0 || advantageB > 0;
  const gameColumnOffset = hasStartingAdvantage ? 1 : 0;
  const userIsA = teamA.isUserTeam || teamB.isUserTeam ? userOnRight || teamA.isUserTeam : null;
  if (hasStartingAdvantage) {
    const advantageWinnerA = advantageA > advantageB;
    const advantageCellA = cellsA[0];
    const advantageCellB = cellsB[0];
    advantageCellA.textContent = advantageWinnerA ? "W" : "L";
    advantageCellB.textContent = advantageWinnerA ? "L" : "W";
    advantageCellA.classList.add("is-visible");
    advantageCellB.classList.add("is-visible");
    if (userIsA !== null) {
      const userCell = userIsA ? advantageCellA : advantageCellB;
      userCell.classList.add("is-user-score");
      userCell.classList.toggle("is-user-win", userIsA ? advantageWinnerA : !advantageWinnerA);
      userCell.classList.toggle("is-user-loss", userIsA ? !advantageWinnerA : advantageWinnerA);
    } else {
      const winnerCell = advantageWinnerA ? advantageCellA : advantageCellB;
      winnerCell.classList.add("is-winner");
    }
    const advantageDescription = advantageWinnerA
      ? "Starting series advantage: win"
      : "Starting series advantage: loss";
    advantageCellA.setAttribute("aria-label", advantageDescription);
    advantageCellB.setAttribute("aria-label", advantageWinnerA
      ? "Starting series advantage: loss"
      : "Starting series advantage: win");
  }
  const leftWins = userOnRight ? result?.teamBWins : result?.teamAWins;
  const rightWins = userOnRight ? result?.teamAWins : result?.teamBWins;
  const seriesScore = document.createElement("span");
  seriesScore.className = "match-series-score";
  seriesScore.style.gridColumn = String(bestOf + 2);
  seriesScore.style.gridRow = "2 / span 2";
  if (result) {
    seriesScore.textContent = `${leftWins}–${rightWins}`;
    seriesScore.classList.add("is-visible", leftWins > rightWins ? "is-win" : "is-loss");
  } else {
    seriesScore.textContent = "vs";
  }
  scoreboard.append(rowA, rowB, seriesScore);

  const games = result?.games ?? [];
  games.forEach((game, index) => {
    const scoreA = userOnRight ? game.scoreB : game.scoreA;
    const scoreB = userOnRight ? game.scoreA : game.scoreB;
    const aWon = scoreA > scoreB;
    const cellA = cellsA[index + gameColumnOffset];
    const cellB = cellsB[index + gameColumnOffset];
    const isUserMatch = teamA.isUserTeam || teamB.isUserTeam;
    if (isUserMatch && !animate) {
      const userCell = userIsA ? cellA : cellB;
      const userWon = userIsA ? aWon : !aWon;
      userCell.classList.add("is-user-score");
      userCell.classList.toggle("is-user-win", userWon);
      userCell.classList.toggle("is-user-loss", !userWon);
    }
    if (!animate) {
      cellA.textContent = scoreA;
      cellB.textContent = scoreB;
      cellA.classList.add("is-visible");
      cellB.classList.add("is-visible");
      if (!isUserMatch) {
        cellA.classList.toggle("is-winner", aWon);
        cellB.classList.toggle("is-winner", !aWon);
      }
    }
    if (game.overtime) {
      cellA.title = `Game ${index + gameColumnOffset + 1}, overtime`;
      cellB.title = `Game ${index + gameColumnOffset + 1}, overtime`;
    }
    const accessibleScore = `Game ${index + gameColumnOffset + 1}: ${scoreA} to ${scoreB}${game.overtime ? ", overtime" : ""}`;
    cellA.setAttribute("aria-label", accessibleScore);
    cellB.setAttribute("aria-hidden", "true");
  });

  if (animate && result) {
    seriesScore.classList.remove("is-win", "is-loss");
    renderAnimatedScores(cellsA, cellsB, seriesScore, games, advantageA, advantageB, userOnRight, userIsA, onAnimationComplete, gameColumnOffset);
  }

  card.append(scoreboard);
  return card;
}
