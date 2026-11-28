import { csvRowsToObjects } from "./csv.js";
import { normalizePlayer, validatePlayer } from "./player.js";
import { getDefaultTeams } from "./season-engine.js";
import { renderDraft as renderDraftView } from "./views/draft-view.js";
import { createSeasonView } from "./views/season-view.js";
import { createTeamReelView } from "./views/team-reel.js";
import { createSeasonController } from "./season-controller.js";
import { createDraftController } from "./draft-controller.js";

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
const temporaryRocketShortcut = document.querySelector("#temporary-rocket-shortcut");
const temporaryHockeyShortcut = document.querySelector("#temporary-hockey-shortcut");
const advanceButton = document.querySelector("#advance-button");
const seasonTitle = document.querySelector("#season-title");
const weekDescription = document.querySelector("#week-description");
const weekMatches = document.querySelector("#week-matches");
const standingsContainer = document.querySelector("#standings");
const championBanner = document.querySelector("#champion-banner");
const bracketPanel = document.querySelector("#bracket-panel");
const bracketContent = document.querySelector("#bracket-content");

let players = [];
let setup = null;
let season = null;
let draft = [];
let currentDraftTeam = null;
let draftChoicesVisible = false;
let defaultTeamsByName = new Map();

const seasonView = createSeasonView({
  seasonTitle, weekDescription, weekMatches, standings: standingsContainer,
  championBanner, advanceButton,
  bracketPanel, bracketContent
}, defaultTeamsByName);

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
  setupNotice.hidden = !isError;
  setupNotice.textContent = isError ? message : "";
  setupNotice.classList.toggle("error", isError);
}

let draftController;

function renderDraft() {
  renderDraftView({
    draft,
    currentDraftTeam,
    teamsByName: defaultTeamsByName,
    elements: { draftPlayers, draftPicked, draftProgress, draftButton, startButton },
    onSelectPlayer: (player) => draftController.selectDraftPlayer(player)
  });
  draftController.syncDraftLayout();
}

draftController = createDraftController({
  getPlayers: () => players,
  getDraft: () => draft,
  setDraft: (value) => { draft = value; },
  getSetup: () => setup,
  setSetup: (value) => { setup = value; },
  getCurrentDraftTeam: () => currentDraftTeam,
  setCurrentDraftTeam: (value) => { currentDraftTeam = value; },
  getDraftChoicesVisible: () => draftChoicesVisible,
  setDraftChoicesVisible: (value) => { draftChoicesVisible = value; },
  teamSelect,
  teamNameInput,
  draftButton,
  draftPlayers,
  draftLayout,
  reelColumn,
  teamReelElement,
  teamReel,
  stackedDraftLayout,
  renderDraft,
  setStatus
});
stackedDraftLayout.addEventListener("change", draftController.syncDraftLayout);

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

draftButton.addEventListener("click", draftController.drawRandomTeam);
teamSelect.addEventListener("change", draftController.updateSelectedTeam);
teamNameInput.addEventListener("input", draftController.updateTeamName);
const seasonController = createSeasonController({
  getSetup: () => setup,
  getPlayers: () => players,
  setSeason: (nextSeason) => { season = nextSeason; },
  getSeason: () => season,
  setupScreen,
  seasonScreen,
  seasonView,
  weekDescription,
  reportError: (error) => setStatus(error.message, true)
});

startButton.addEventListener("click", seasonController.startSeason);
advanceButton.addEventListener("click", seasonController.advanceSeason);
temporaryRocketShortcut.addEventListener("click", () => seasonController.startPresetSeason());
temporaryHockeyShortcut.addEventListener("click", () => seasonController.startPresetSeason({ toRegionals: true }));

loadPlayers();
