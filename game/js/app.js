import { csvRowsToObjects } from "./csv.js";
import { normalizePlayer, validatePlayer } from "./player.js";
import {
  advanceToNextUserMatch,
  continueSeason,
  createCareerSetup,
  createSeason,
  getCurrentRound,
  getDefaultTeams,
  simulateCurrentStep
} from "./season-engine.js";
import { renderDraft as renderDraftView } from "./views/draft-view.js";
import { createSeasonView } from "./views/season-view.js";

const setupScreen = document.querySelector("#setup-screen");
const seasonScreen = document.querySelector("#season-screen");
const status = document.querySelector("#status");
const draftPlayers = document.querySelector("#draft-players");
const teamAssignment = document.querySelector("#team-assignment");
const draftButton = document.querySelector("#draft-button");
const teamNameInput = document.querySelector("#team-name");
const teamSelect = document.querySelector("#team-select");
const startButton = document.querySelector("#start-button");
const newSeasonButton = document.querySelector("#new-season-button");
const advanceButton = document.querySelector("#advance-button");
const seasonTitle = document.querySelector("#season-title");
const stageName = document.querySelector("#stage-name");
const weekLabel = document.querySelector("#week-label");
const weekDescription = document.querySelector("#week-description");
const weekMatches = document.querySelector("#week-matches");
const standingsContainer = document.querySelector("#standings");
const userRoster = document.querySelector("#user-roster");
const championBanner = document.querySelector("#champion-banner");
const bracketPanel = document.querySelector("#bracket-panel");
const bracketNote = document.querySelector("#bracket-note");
const bracketContent = document.querySelector("#bracket-content");
const matchHistory = document.querySelector("#match-history");
const historyRounds = document.querySelector("#history-rounds");

let players = [];
let setup = null;
let season = null;
let draft = [];
let currentDraftTeam = null;
let defaultTeamsByName = new Map();
const seasonView = createSeasonView({
  seasonTitle, stageName, weekLabel, weekDescription, weekMatches, standings: standingsContainer,
  userRoster, championBanner, matchHistory, historyRounds, advanceButton,
  bracketPanel, bracketNote, bracketContent
}, defaultTeamsByName);

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderDraft() {
  renderDraftView({
    draft,
    currentDraftTeam,
    setup,
    teamsByName: defaultTeamsByName,
    elements: { draftPlayers, teamAssignment, draftButton, startButton },
    onSelectPlayer: selectDraftPlayer
  });
}

function drawRandomTeam() {
  if (draft.length === 3 || currentDraftTeam) return;
  try {
    const pickedNames = new Set(draft.map((player) => player.name));
    const teams = new Map();
    players.forEach((player) => {
      if (!player.startingTeam || pickedNames.has(player.name)) return;
      const roster = teams.get(player.startingTeam) ?? [];
      roster.push(player);
      teams.set(player.startingTeam, roster);
    });
    const defaultTeamDetails = new Map(
      getDefaultTeams(players).map((team) => [team.name, team])
    );
    const availableTeams = [...teams.entries()]
      .filter(([, roster]) => roster.length > 0)
      .map(([name, roster]) => ({
        name,
        region: defaultTeamDetails.get(name)?.region,
        logo: defaultTeamDetails.get(name)?.logo,
        players: roster.sort((playerA, playerB) =>
          playerB.rating - playerA.rating || playerA.name.localeCompare(playerB.name)
        )
      }));
    if (availableTeams.length === 0) {
      throw new Error("No teams have players available for the next pick.");
    }
    currentDraftTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
    renderDraft();
    setStatus("Choose one player from the randomly drawn team.");
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function selectDraftPlayer(player) {
  if (!currentDraftTeam?.players.includes(player) || draft.length >= 3) return;
  draft.push(player);
  currentDraftTeam = null;
  if (draft.length === 3) {
    try {
      setup = createCareerSetup(players, {
        teamId: teamSelect.value || null,
        teamName: teamNameInput.value,
        draft
      });
      renderDraft();
      setStatus("Your squad is ready. The other teams use their highest-rated available players.");
    } catch (error) {
      console.error(error);
      setStatus(error.message, true);
    }
  } else {
    renderDraft();
    setStatus(`Player ${draft.length} selected. Draw another random team for your next pick.`);
  }
}

function updateSelectedTeam() {
  if (draft.length !== 3) return;
  try {
    setup = createCareerSetup(players, {
      teamId: teamSelect.value || null,
      teamName: teamNameInput.value,
      draft
    });
    renderDraft();
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function updateTeamName() {
  if (!setup) return;
  const userTeam = setup.teams.find((team) => team.id === setup.userTeamId);
  if (!userTeam) {
    throw new Error("Could not find your selected team.");
  }
  userTeam.name = teamNameInput.value.trim() || "Your Team";
  renderDraft();
}

function startSeason() {
  if (!setup) return;
  try {
    season = createSeason(setup);
    advanceToNextUserMatch(season);
    setupScreen.hidden = true;
    seasonScreen.hidden = false;
    seasonView(season);
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

function advanceSeason() {
  try {
    const round = getCurrentRound(season);
    if (round.resultsReady) {
      continueSeason(season);
      advanceToNextUserMatch(season);
    } else {
      simulateCurrentStep(season);
    }
    seasonView(season);
  } catch (error) {
    console.error(error);
    weekDescription.textContent = error.message;
    weekDescription.classList.add("error");
  }
}

function resetSeason() {
  setup = null;
  season = null;
  draft = [];
  currentDraftTeam = null;
  draftPlayers.replaceChildren();
  teamAssignment.hidden = true;
  teamAssignment.textContent = "";
  teamNameInput.value = "";
  draftButton.textContent = "Draw a random team";
  draftButton.disabled = false;
  startButton.disabled = true;
  setStatus("Draw a random team to make your first pick.");
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
    defaultTeamsByName.clear();
    getDefaultTeams(players).forEach((team) => defaultTeamsByName.set(team.name, team));
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
    setStatus(`${players.length} players loaded across ${teamCount} default teams. Draw a random team to begin.`);
  } catch (error) {
    console.error(error);
    draftButton.disabled = true;
    setStatus(`Could not start: ${error.message}`, true);
  }
}

draftButton.addEventListener("click", drawRandomTeam);
teamSelect.addEventListener("change", updateSelectedTeam);
teamNameInput.addEventListener("input", updateTeamName);
startButton.addEventListener("click", startSeason);
advanceButton.addEventListener("click", advanceSeason);
newSeasonButton.addEventListener("click", resetSeason);

loadPlayers();
