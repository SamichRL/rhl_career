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
import { createTeamReelView } from "./views/team-reel.js";

const setupScreen = document.querySelector("#setup-screen");
const seasonScreen = document.querySelector("#season-screen");
const status = document.querySelector("#status");
const setupNotice = document.querySelector("#setup-notice");
const draftPlayers = document.querySelector("#draft-players");
const draftPicked = document.querySelector("#draft-picked");
const draftProgress = document.querySelector("#draft-progress");
const draftButton = document.querySelector("#draft-button");
const teamReelElement = document.querySelector("#team-reel");
const reelColumn = teamReelElement.parentElement;
const draftLayout = document.querySelector(".draft-layout");
const stackedDraftLayout = window.matchMedia("(max-width: 720px)");
const teamReel = createTeamReelView(teamReelElement);
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
let draftChoicesVisible = false;
let defaultTeamsByName = new Map();

function syncDraftLayout() {
  if (!stackedDraftLayout.matches) {
    if (currentDraftTeam) draftChoicesVisible = true;
    teamReelElement.hidden = false;
    draftPlayers.hidden = false;
    draftLayout.after(draftPlayers);
    return;
  }

  if (currentDraftTeam && draftChoicesVisible) {
    teamReelElement.hidden = true;
    reelColumn.append(draftPlayers);
    draftPlayers.hidden = false;
    return;
  }

  teamReelElement.hidden = false;
  draftPlayers.hidden = true;
  draftLayout.after(draftPlayers);
}

stackedDraftLayout.addEventListener("change", syncDraftLayout);
const seasonView = createSeasonView({
  seasonTitle, stageName, weekLabel, weekDescription, weekMatches, standings: standingsContainer,
  userRoster, championBanner, matchHistory, historyRounds, advanceButton,
  bracketPanel, bracketNote, bracketContent
}, defaultTeamsByName);

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
  setupNotice.hidden = !isError;
  setupNotice.textContent = isError ? message : "";
  setupNotice.classList.toggle("error", isError);
}

function renderDraft() {
  renderDraftView({
    draft,
    currentDraftTeam,
    teamsByName: defaultTeamsByName,
    elements: { draftPlayers, draftPicked, draftProgress, draftButton, startButton },
    onSelectPlayer: selectDraftPlayer
  });
  syncDraftLayout();
}

async function drawRandomTeam() {
  if (draft.length === 3 || currentDraftTeam || teamReel.isSpinning()) return;
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
    const drawnTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
    draftButton.disabled = true;
    draftButton.textContent = "Drawing…";
    setStatus("Drawing a random team…");
    await teamReel.spin(availableTeams, drawnTeam);
    currentDraftTeam = drawnTeam;
    draftChoicesVisible = false;
    renderDraft();
    if (stackedDraftLayout.matches) {
      setStatus("Team drawn. Player choices will appear shortly.");
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (currentDraftTeam === drawnTeam && stackedDraftLayout.matches) {
        draftChoicesVisible = true;
        syncDraftLayout();
      }
    }
    document.querySelector("#draft-candidates")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
    setStatus("Choose one player from the randomly drawn team.");
  } catch (error) {
    console.error(error);
    renderDraft();
    setStatus(error.message, true);
  }
}

function selectDraftPlayer(player) {
  if (!currentDraftTeam?.players.includes(player) || draft.length >= 3) return;
  draft.push(player);
  currentDraftTeam = null;
  draftChoicesVisible = false;
  if (stackedDraftLayout.matches) teamReel.reset();
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
    weekDescription.hidden = false;
    weekDescription.classList.add("error");
  }
}

function resetSeason() {
  setup = null;
  season = null;
  draft = [];
  currentDraftTeam = null;
  teamReel.reset();
  teamNameInput.value = "";
  draftButton.textContent = "Draw a random team";
  draftButton.disabled = false;
  startButton.disabled = true;
  renderDraft();
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
    teamSelect.replaceChildren(new Option("Team to Replace (Default is Random)", ""));
    getDefaultTeams(players).forEach((team) => {
      teamSelect.add(new Option(`${team.name} (${team.region})`, team.id));
    });

    teamSelect.disabled = false;
    draftButton.disabled = false;
    renderDraft();
    setStatus("Draw a random team to make your first pick.");
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
