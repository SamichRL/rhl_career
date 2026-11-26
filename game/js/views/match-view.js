import { createTeamLogo } from "./team-logo.js";

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

function animatePair(fromA, toA, fromB, toB, duration, update) {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      update(
        Math.floor(fromA + (toA - fromA) * progress),
        Math.floor(fromB + (toB - fromB) * progress)
      );
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function makeTeamIdentity(team) {
  const identity = document.createElement("div");
  identity.className = "match-team-identity";
  identity.append(createTeamLogo(team));
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

function renderAnimatedScores(cellsA, cellsB, resultNode, games, startWinsA, startWinsB, userOnRight) {
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
      const cellA = cellsA[index];
      const cellB = cellsB[index];
      cellA.textContent = "0";
      cellB.textContent = "0";
      cellA.classList.add("is-visible");
      cellB.classList.add("is-visible");
      if (!reduceMotion) await wait(250);
      if (reduceMotion) {
        cellA.textContent = scoreA;
        cellB.textContent = scoreB;
      } else {
        await animatePair(0, scoreA, 0, scoreB, 500, (countA, countB) => {
          cellA.textContent = countA;
          cellB.textContent = countB;
        });
      }
      const aWon = scoreA > scoreB;
      cellA.classList.toggle("is-winner", aWon);
      cellB.classList.toggle("is-winner", !aWon);
      if (aWon) winsA += 1;
      else winsB += 1;
      resultNode.textContent = `${winsA}–${winsB}`;
    }
    resultNode.classList.toggle("is-win", winsA > winsB);
    resultNode.classList.toggle("is-loss", winsA < winsB);
  })();
}

export function createMatchCard(match, season, { animate = false } = {}) {
  const teamA = season.teams.find((team) => team.id === match.teamAId);
  const teamB = season.teams.find((team) => team.id === match.teamBId);
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
    const cellA = cellsA[index];
    const cellB = cellsB[index];
    if (!animate) {
      cellA.textContent = scoreA;
      cellB.textContent = scoreB;
      cellA.classList.add("is-visible");
      cellB.classList.add("is-visible");
      cellA.classList.toggle("is-winner", aWon);
      cellB.classList.toggle("is-winner", !aWon);
    }
    if (game.overtime) {
      cellA.title = `Game ${index + 1}, overtime`;
      cellB.title = `Game ${index + 1}, overtime`;
    }
    const accessibleScore = `Game ${index + 1}: ${scoreA} to ${scoreB}${game.overtime ? ", overtime" : ""}`;
    cellA.setAttribute("aria-label", accessibleScore);
    cellB.setAttribute("aria-hidden", "true");
  });

  if (animate && result) {
    const advantageA = userOnRight ? match.advantageB ?? 0 : match.advantageA ?? 0;
    const advantageB = userOnRight ? match.advantageA ?? 0 : match.advantageB ?? 0;
    seriesScore.classList.remove("is-win", "is-loss");
    renderAnimatedScores(cellsA, cellsB, seriesScore, games, advantageA, advantageB, userOnRight);
  }

  const advantageA = userOnRight ? match.advantageB ?? 0 : match.advantageA ?? 0;
  const advantageB = userOnRight ? match.advantageA ?? 0 : match.advantageB ?? 0;
  if (advantageA || advantageB) {
    const advantage = document.createElement("small");
    advantage.className = "match-advantage";
    advantage.style.gridColumn = "1 / -1";
    advantage.textContent = `Starting advantage ${advantageA}–${advantageB}`;
    scoreboard.append(advantage);
  }

  card.append(scoreboard);
  return card;
}
