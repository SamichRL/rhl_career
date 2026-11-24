import { csvRowsToObjects } from "./csv.js";
import { normalizePlayer, validatePlayer } from "./player.js";
import {
  createCareerSetup,
  createSeason,
  getDefaultTeams,
  getStandings,
  simulateChampionship,
  simulateWeek
} from "./season-engine.js";

const setupScreen = document.querySelector("#setup-screen");
const seasonScreen = document.querySelector("#season-screen");
const status = document.querySelector("#status");
const draftPlayers = document.querySelector("#draft-players");
const teamAssignment = document.querySelector("#team-assignment");
const draftButton = document.querySelector("#draft-button");
const teamSelect = document.querySelector("#team-select");
const startButton = document.querySelector("#start-button");
const newSeasonButton = document.querySelector("#new-season-button");
const advanceButton = document.querySelector("#advance-button");
const seasonTitle = document.querySelector("#season-title");
const weekLabel = document.querySelector("#week-label");
const weekDescription = document.querySelector("#week-description");
const weekMatches = document.querySelector("#week-matches");
const standingsContainer = document.querySelector("#standings");
const userRoster = document.querySelector("#user-roster");
const championBanner = document.querySelector("#champion-banner");
const matchHistory = document.querySelector("#match-history");
const historyWeeks = document.querySelector("#history-weeks");

let players = [];
let setup = null;
let season = null;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function createPlayerCard(player, index) {
  const card = document.createElement("article");
  card.className = "player-card";
  const label = document.createElement("div");
  label.className = "eyebrow";
  label.textContent = `Player ${index + 1}`;
  const name = document.createElement("strong");
  name.textContent = player.name;
  const rating = document.createElement("div");
  rating.className = "rating";
  rating.textContent = `Overall ${player.rating.toFixed(1)}`;
  card.append(label, name, rating);
  return card;
}

function drawSquad() {
  try {
    setup = createCareerSetup(players, { teamId: teamSelect.value || null });
    renderDraft();
    draftButton.textContent = "Draw again";
    startButton.disabled = false;
    setStatus("The other 15 teams use their highest-rated available players; gaps are filled at random.");
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function renderDraft() {
  draftPlayers.replaceChildren(
    ...setup.draft.map((player, index) => createPlayerCard(player, index))
  );
  const userTeam = setup.teams.find((team) => team.id === setup.userTeamId);
  teamAssignment.hidden = false;
  teamAssignment.textContent = `You’ll take over ${userTeam.name} · ${userTeam.region}`;
}

function updateSelectedTeam() {
  if (!setup) return;
  try {
    setup = createCareerSetup(players, {
      teamId: teamSelect.value || null,
      draft: setup.draft
    });
    renderDraft();
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function createMatchCard(match, displayResult = true) {
  const teamA = season.teams.find((team) => team.id === match.teamAId);
  const teamB = season.teams.find((team) => team.id === match.teamBId);
  const result = displayResult ? match.result : null;
  const card = document.createElement("article");
  card.className = "match-card";
  if (teamA.isUserTeam || teamB.isUserTeam) card.classList.add("user-match");

  const sideA = document.createElement("div");
  sideA.className = "match-team";
  const nameA = document.createElement("strong");
  nameA.textContent = teamA.name;
  const regionA = document.createElement("small");
  regionA.textContent = teamA.isUserTeam ? "Your team" : teamA.region;
  sideA.append(nameA, regionA);

  const score = document.createElement("div");
  score.className = "match-score";
  score.textContent = result ? `${result.teamAWins} – ${result.teamBWins}` : "vs";

  const sideB = document.createElement("div");
  sideB.className = "match-team";
  const nameB = document.createElement("strong");
  nameB.textContent = teamB.name;
  const regionB = document.createElement("small");
  regionB.textContent = teamB.isUserTeam ? "Your team" : teamB.region;
  sideB.append(nameB, regionB);
  card.append(sideA, score, sideB);

  const gameScores = document.createElement("small");
  gameScores.className = "match-detail";
  gameScores.style.gridColumn = "1 / -1";
  if (result) {
    gameScores.textContent = result.games
      .map((game) =>
        `${game.scoreA}-${game.scoreB}${game.overtime ? " OT" : ""}`
      )
      .join(" · ");
  } else {
    gameScores.textContent = "Scheduled";
  }
  gameScores.style.color = "var(--muted)";
  card.append(gameScores);
  return card;
}

function renderStandingsGroup(region) {
  const group = document.createElement("section");
  group.className = "standings-group";
  const heading = document.createElement("h3");
  heading.className = "region";
  heading.textContent = region;
  group.append(heading);

  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Team</th><th>W</th><th>L</th><th>GD</th></tr></thead>";
  const body = document.createElement("tbody");
  getStandings(season, region).forEach((team, index) => {
    const row = document.createElement("tr");
    if (team.isUserTeam) row.className = "user-row";
    const teamCell = document.createElement("td");
    const teamLabel = document.createElement("span");
    teamLabel.className = "standing-team";
    teamLabel.textContent = `${index + 1}. ${team.name}${team.isUserTeam ? " (You)" : ""}`;
    teamCell.append(teamLabel);
    const wins = document.createElement("td");
    wins.textContent = team.seriesWins;
    const losses = document.createElement("td");
    losses.textContent = team.seriesLosses;
    const gameDiff = document.createElement("td");
    gameDiff.textContent = team.gameWins - team.gameLosses;
    row.append(teamCell, wins, losses, gameDiff);
    body.append(row);
  });
  table.append(body);
  group.append(table);
  return group;
}

function renderStandings() {
  standingsContainer.replaceChildren(
    renderStandingsGroup("NA"),
    renderStandingsGroup("EU/MENA")
  );
}

function renderRoster() {
  const team = season.teams.find((item) => item.id === season.userTeamId);
  userRoster.replaceChildren();
  team.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-card";
    const name = document.createElement("strong");
    name.textContent = player.name;
    const rating = document.createElement("div");
    rating.className = "rating";
    rating.textContent = `Overall ${player.rating.toFixed(1)}`;
    card.append(name, rating);
    userRoster.append(card);
  });
  userRoster.style.display = "grid";
  userRoster.style.gap = "9px";
}

function renderHistory() {
  const playedWeeks = season.weeks.filter((week) =>
    week.matches.every((match) => match.result)
  );
  matchHistory.hidden = playedWeeks.length === 0;
  historyWeeks.replaceChildren();
  playedWeeks.forEach((week) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `Week ${week.number} · ${week.matches.length} matches`;
    details.append(summary);
    const matches = document.createElement("div");
    matches.className = "match-list";
    week.matches.forEach((match) => matches.append(createMatchCard(match)));
    details.append(matches);
    historyWeeks.append(details);
  });
}

function renderChampionship() {
  const champion = season.teams.find((team) => team.id === season.championId);
  const userTeam = season.teams.find((team) => team.id === season.userTeamId);
  const userPlace = getStandings(season, userTeam.region)
    .findIndex((team) => team.id === userTeam.id) + 1;
  championBanner.hidden = false;
  championBanner.textContent = champion.isUserTeam
    ? `You won the RHL championship! ${champion.name} takes the title.`
    : `${champion.name} wins the RHL championship. Your team finished ${userPlace}${userPlace === 1 ? "st" : userPlace === 2 ? "nd" : userPlace === 3 ? "rd" : "th"} in ${userTeam.region}.`;
}

function renderSeason() {
  const userTeam = season.teams.find((team) => team.id === season.userTeamId);
  seasonTitle.textContent = `${userTeam.name} · ${userTeam.region}`;
  renderStandings();
  renderRoster();
  renderHistory();
  championBanner.hidden = !season.final;

  if (season.currentWeek < season.weeks.length) {
    const week = season.weeks[season.currentWeek];
    weekLabel.textContent = `Week ${week.number} of ${season.weeks.length}`;
    weekDescription.textContent = "Regional round-robin · Best-of-5";
    advanceButton.disabled = false;
    advanceButton.textContent = `Simulate week ${week.number}`;
    weekMatches.replaceChildren(...week.matches.map((match) => createMatchCard(match, false)));
  } else if (!season.final) {
    const finalists = ["NA", "EU/MENA"].map((region) => getStandings(season, region)[0]);
    weekLabel.textContent = "League play complete";
    weekDescription.textContent = `Regional leaders ${finalists[0].name} and ${finalists[1].name} meet in a best-of-seven final.`;
    advanceButton.disabled = false;
    advanceButton.textContent = "Simulate championship final";
    weekMatches.replaceChildren(createMatchCard({
      teamAId: finalists[0].id,
      teamBId: finalists[1].id,
      result: null
    }, false));
  } else {
    weekLabel.textContent = "Season complete";
    weekDescription.textContent = "The championship final is complete.";
    advanceButton.disabled = true;
    advanceButton.textContent = "Season complete";
    weekMatches.replaceChildren(createMatchCard(season.final));
    renderChampionship();
  }
}

function startSeason() {
  if (!setup) return;
  try {
    season = createSeason(setup);
    setupScreen.hidden = true;
    seasonScreen.hidden = false;
    renderSeason();
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function advanceSeason() {
  try {
    if (season.currentWeek < season.weeks.length) {
      simulateWeek(season, season.currentWeek);
    } else {
      simulateChampionship(season);
    }
    renderSeason();
  } catch (error) {
    console.error(error);
    weekDescription.textContent = error.message;
    weekDescription.classList.add("error");
  }
}

function resetSeason() {
  setup = null;
  season = null;
  draftPlayers.replaceChildren();
  teamAssignment.hidden = true;
  teamAssignment.textContent = "";
  draftButton.textContent = "Draw your three players";
  startButton.disabled = true;
  setStatus("Draw three players to begin.");
  seasonScreen.hidden = true;
  setupScreen.hidden = false;
}

async function loadPlayers() {
  try {
    const response = await fetch("../data/player_ratings_assigned.csv");
    if (!response.ok) {
      throw new Error(`Could not load player ratings: ${response.status}`);
    }

    players = csvRowsToObjects(await response.text())
      .map(normalizePlayer)
      .filter(validatePlayer);
    if (players.length < 48) {
      throw new Error("The player ratings file does not contain enough players for a 16-team season.");
    }
    const teamCount = new Set(players.map((player) => player.startingTeam).filter(Boolean)).size;
    if (teamCount !== 16) {
      throw new Error(`Expected 16 default teams in player_ratings_assigned.csv, found ${teamCount}.`);
    }
    teamSelect.replaceChildren(new Option("Random team (NA or EU/MENA)", ""));
    getDefaultTeams(players).forEach((team) => {
      teamSelect.add(new Option(`${team.name} (${team.region})`, team.id));
    });

    teamSelect.disabled = false;
    draftButton.disabled = false;
    setStatus(`${players.length} players loaded across ${teamCount} default teams.`);
  } catch (error) {
    console.error(error);
    draftButton.disabled = true;
    setStatus(`Could not start: ${error.message}`, true);
  }
}

draftButton.addEventListener("click", drawSquad);
teamSelect.addEventListener("change", updateSelectedTeam);
startButton.addEventListener("click", startSeason);
advanceButton.addEventListener("click", advanceSeason);
newSeasonButton.addEventListener("click", resetSeason);

loadPlayers();
