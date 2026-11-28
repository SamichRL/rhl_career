import {
  advanceToNextUserMatch,
  continueSeason,
  createCareerSetup,
  createSeason,
  getDefaultTeams,
  getCurrentRound,
  simulateCurrentStep
} from "./season-engine.js";

export function createSeasonController({
  getSetup,
  getPlayers,
  setSeason,
  getSeason,
  reportError,
  setupScreen,
  seasonScreen,
  seasonView,
  weekDescription
}) {
  function launchSeason(setup, { toRegionals = false } = {}) {
    try {
      const season = createSeason(setup);
      if (toRegionals) {
        while (season.stage === "league_play" || season.stage === "league_tiebreak") {
          simulateCurrentStep(season, Math.random, { forceUserWins: true });
          continueSeason(season);
        }
      } else {
        advanceToNextUserMatch(season);
      }
      setSeason(season);
      setupScreen.hidden = true;
      seasonScreen.hidden = false;
      seasonView(season);
    } catch (error) {
      console.error(error);
      reportError(error);
    }
  }

  function startSeason() {
    const setup = getSetup();
    if (setup) launchSeason(setup);
  }

  function startPresetSeason({ toRegionals = false } = {}) {
    try {
      const players = getPlayers();
      if (players.length === 0) throw new Error("The player pool is still loading.");
      const playersByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
      const presetDraft = ["drky", "pacify", "pegs"].map((name) => playersByName.get(name));
      if (presetDraft.some((player) => !player)) {
        throw new Error("The temporary preset squad could not be found in the player pool.");
      }
      const teams = getDefaultTeams(players);
      const replacementTeam = teams[Math.floor(Math.random() * teams.length)];
      const setup = createCareerSetup(players, {
        teamId: replacementTeam.id,
        teamName: "Your Team",
        draft: presetDraft
      });
      launchSeason(setup, { toRegionals });
    } catch (error) {
      console.error(error);
      reportError(error);
    }
  }

  function advanceSeason() {
    const season = getSeason();
    if (!season) return;

    try {
      const round = getCurrentRound(season);
      if (round.resultsReady) {
        continueSeason(season);
        const nextMatch = advanceToNextUserMatch(season);
        if (!nextMatch.round || season.stage === "complete") {
          seasonView(season, { updateStandings: false });
          return;
        }
      }
      simulateCurrentStep(season);
      seasonView(season, {
        updateStandings: false,
        updateStandingsAfterAnimation: true
      });
    } catch (error) {
      console.error(error);
      weekDescription.textContent = error.message;
      weekDescription.hidden = false;
      weekDescription.classList.add("error");
    }
  }

  return { startSeason, startPresetSeason, advanceSeason };
}
