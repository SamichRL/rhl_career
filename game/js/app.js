import { csvRowsToObjects } from "./csv.js";
import { normalizePlayer, validatePlayer } from "./player.js";
import {
  advanceToNextUserMatch,
  continueSeason,
  createCareerSetup,
  createSeason,
  getChampion,
  getCurrentRound,
  getDefaultTeams,
  getStageLabel,
  getStandings,
  simulateCurrentStep
} from "./season-engine.js";

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

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function createTeamLogo(team, className = "team-logo") {
  if (!team?.logo) return null;
  const logo = document.createElement("img");
  logo.className = className;
  logo.src = team.logo;
  logo.alt = `${team.name} logo`;
  logo.loading = "lazy";
  logo.addEventListener("error", () => {
    logo.remove();
  });
  return logo;
}

function createPlayerCard(player, labelText, onSelect = null) {
  const card = document.createElement("article");
  card.className = "player-card";
  const label = document.createElement("div");
  label.className = "eyebrow";
  label.textContent = labelText;
  const name = document.createElement("strong");
  name.textContent = player.name;
  const rating = document.createElement("div");
  rating.className = "rating";
  rating.textContent = `Overall ${player.rating.toFixed(1)}`;
  card.append(label, name, rating);
  if (onSelect) {
    const chooseButton = document.createElement("button");
    chooseButton.className = "secondary";
    chooseButton.type = "button";
    chooseButton.textContent = "Choose player";
    chooseButton.addEventListener("click", onSelect);
    card.append(chooseButton);
  }
  return card;
}

function renderDraft() {
  const sections = [];
  if (draft.length > 0) {
    const picksHeading = document.createElement("h3");
    picksHeading.className = "draft-section-label";
    picksHeading.textContent = `Your picks (${draft.length}/3)`;
    sections.push(picksHeading);
    draft.forEach((player, index) => {
      sections.push(createPlayerCard(player, `Pick ${index + 1}`));
    });
  }

  if (currentDraftTeam) {
    const teamHeading = document.createElement("h3");
    teamHeading.className = "draft-section-label";
    const teamHeadingLogo = createTeamLogo(currentDraftTeam, "team-logo team-logo-small");
    teamHeading.append(teamHeadingLogo, document.createTextNode(
      `${currentDraftTeam.name} · ${currentDraftTeam.region} — choose one`
    ));
    sections.push(teamHeading);
    const pickedNames = new Set(draft.map((player) => player.name));
    currentDraftTeam.players
      .filter((player) => !pickedNames.has(player.name))
      .forEach((player) => {
        sections.push(createPlayerCard(player, "Available", () => selectDraftPlayer(player)));
      });
    teamAssignment.hidden = false;
    teamAssignment.textContent = `Pick ${draft.length + 1} of 3 · Choose a player from this randomly drawn team.`;
  } else if (draft.length === 3) {
    const userTeam = setup.teams.find((team) => team.id === setup.userTeamId);
    teamAssignment.hidden = false;
    teamAssignment.textContent = `You’ll take over ${userTeam.name} · ${userTeam.region}`;
  } else {
    teamAssignment.hidden = false;
    teamAssignment.textContent = draft.length === 0
      ? "Draw a random team to make your first pick."
      : `Pick ${draft.length + 1} of 3 · Draw another random team.`;
  }

  draftPlayers.replaceChildren(...sections);
  draftButton.disabled = Boolean(currentDraftTeam) || draft.length === 3;
  draftButton.textContent = draft.length === 0 ? "Draw a random team" : "Draw the next team";
  startButton.disabled = draft.length !== 3;
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

function createMatchCard(match) {
  const teamA = season.teams.find((team) => team.id === match.teamAId);
  const teamB = season.teams.find((team) => team.id === match.teamBId);
  const result = match.result;
  const card = document.createElement("article");
  card.className = "match-card";
  if (teamA.isUserTeam || teamB.isUserTeam) card.classList.add("user-match");
  const label = document.createElement("div");
  label.className = "match-label";
  label.textContent = match.label ?? "Season match";
  card.append(label);

  const sideA = document.createElement("div");
  sideA.className = "match-team";
  const identityA = document.createElement("div");
  identityA.className = "team-name";
  const nameA = document.createElement("strong");
  nameA.textContent = teamA.name;
  identityA.append(createTeamLogo(teamA), nameA);
  const regionA = document.createElement("small");
  regionA.textContent = teamA.isUserTeam ? "Your team" : teamA.region;
  sideA.append(identityA, regionA);

  const score = document.createElement("div");
  score.className = "match-score";
  score.textContent = result ? `${result.teamAWins} – ${result.teamBWins}` : "vs";

  const sideB = document.createElement("div");
  sideB.className = "match-team";
  const identityB = document.createElement("div");
  identityB.className = "team-name";
  const nameB = document.createElement("strong");
  nameB.textContent = teamB.name;
  identityB.append(createTeamLogo(teamB), nameB);
  const regionB = document.createElement("small");
  regionB.textContent = teamB.isUserTeam ? "Your team" : teamB.region;
  sideB.append(identityB, regionB);
  card.append(sideA, score, sideB);

  const gameScores = document.createElement("small");
  gameScores.className = "match-detail";
  gameScores.style.gridColumn = "1 / -1";
  gameScores.style.color = "var(--muted)";
  const scoreLines = result
    ? result.games.map((game) =>
      `${game.scoreA}-${game.scoreB}${game.overtime ? " OT" : ""}`
    ).join(" · ")
    : "Scheduled";
  const advantage = match.advantageA || match.advantageB
    ? ` · Starting advantage ${match.advantageA}-${match.advantageB}`
    : "";
  gameScores.textContent = `${scoreLines}${advantage}`;
  card.append(gameScores);
  return card;
}

function findBracketMatch(stage, key, region = null, group = null) {
  const rounds = season.history.filter((round) => round.stage === stage);
  if (season.activeRound?.stage === stage) rounds.push(season.activeRound);
  for (const round of rounds) {
    const match = round.matches.find((item) =>
      item.key === key &&
      item.region === region &&
      item.group === group
    );
    if (match) return match;
  }
  return null;
}

function getTeamName(id, fallback) {
  return id ? season.teams.find((team) => team.id === id)?.name ?? fallback : fallback;
}

function getBracketOutcome(stage, key, outcome, region = null, group = null, fallback) {
  const match = findBracketMatch(stage, key, region, group);
  const teamId = match?.result?.[`${outcome}Id`];
  return getTeamName(teamId, fallback);
}

function createBracketMatchCard({
  stage,
  key,
  label,
  teamAId = null,
  teamBId = null,
  teamAName = "TBD",
  teamBName = "TBD",
  region = null,
  group = null
}) {
  const match = findBracketMatch(stage, key, region, group);
  const resolvedTeamAId = match?.teamAId ?? teamAId;
  const resolvedTeamBId = match?.teamBId ?? teamBId;
  const resolvedTeamA = getTeamName(resolvedTeamAId, teamAName);
  const resolvedTeamB = getTeamName(resolvedTeamBId, teamBName);
  const card = document.createElement("article");
  card.className = "bracket-match";
  if (match && season.activeRound?.matches.includes(match)) card.classList.add("current");
  if (
    season.teams.find((team) => team.id === resolvedTeamAId)?.isUserTeam ||
    season.teams.find((team) => team.id === resolvedTeamBId)?.isUserTeam
  ) {
    card.classList.add("user-match");
  }

  const heading = document.createElement("div");
  heading.className = "bracket-match-label";
  heading.textContent = label;
  card.append(heading);

  const result = match?.result;
  [
    { team: resolvedTeamA, teamId: resolvedTeamAId, score: result?.teamAWins, winner: result?.winnerId === resolvedTeamAId },
    { team: resolvedTeamB, teamId: resolvedTeamBId, score: result?.teamBWins, winner: result?.winnerId === resolvedTeamBId }
  ].forEach(({ team, teamId, score, winner }) => {
    const row = document.createElement("div");
    row.className = "bracket-team";
    if (winner) row.classList.add("winner");
    const teamName = document.createElement("span");
    teamName.className = "bracket-team-name";
    const teamDetails = season.teams.find((item) => item.id === teamId);
    if (teamDetails) teamName.append(createTeamLogo(teamDetails, "team-logo team-logo-small"));
    const name = document.createElement("span");
    name.textContent = team;
    if (team === "TBD" || team.startsWith("Winner of") || team.startsWith("Loser of")) {
      name.classList.add("bracket-waiting");
    }
    teamName.append(name);
    const scoreNode = document.createElement("span");
    scoreNode.textContent = score === undefined ? "" : score;
    row.append(teamName, scoreNode);
    card.append(row);
  });
  return card;
}

function createBracketColumn(title, cards) {
  const column = document.createElement("div");
  column.className = "bracket-column";
  const heading = document.createElement("h4");
  heading.textContent = title;
  column.append(heading, ...cards);
  return column;
}

function createBracketOutcomeCard(label, teamName) {
  const card = document.createElement("article");
  card.className = "bracket-match";
  const heading = document.createElement("div");
  heading.className = "bracket-match-label";
  heading.textContent = label;
  const row = document.createElement("div");
  row.className = "bracket-team winner";
  const teamDetails = season.teams.find((team) => team.name === teamName);
  if (teamDetails) row.append(createTeamLogo(teamDetails, "team-logo team-logo-small"));
  const name = document.createElement("span");
  name.textContent = teamName;
  row.append(name);
  card.append(heading, row);
  return card;
}

function createBracketLane(title, columns) {
  const lane = document.createElement("div");
  lane.className = title === "Upper Bracket"
    ? "bracket-lane upper-bracket-lane"
    : "bracket-lane lower-bracket-lane";
  const heading = document.createElement("div");
  heading.className = "bracket-lane-title";
  heading.textContent = title;
  const board = document.createElement("div");
  board.className = "bracket-board";
  board.append(...columns);
  lane.append(heading, board);
  return lane;
}

function createBracketSection(
  title,
  upperColumns,
  lowerColumns,
  feeds,
  destinationTitle,
  destinationRoutes,
  destinationCards
) {
  const section = document.createElement("section");
  section.className = "bracket-section";
  const heading = document.createElement("h3");
  heading.textContent = title;

  const lanes = document.createElement("div");
  lanes.className = "bracket-lanes";
  lanes.append(createBracketLane("Upper Bracket", upperColumns));
  if (feeds.length > 0) {
    const feedList = document.createElement("div");
    feedList.className = "bracket-feeds";
    feeds.forEach((text) => {
      const feed = document.createElement("div");
      feed.className = "bracket-feed";
      const arrow = document.createElement("span");
      arrow.textContent = "↓";
      const label = document.createElement("span");
      label.textContent = text;
      feed.append(arrow, label);
      feedList.append(feed);
    });
    lanes.append(feedList);
  }
  lanes.append(createBracketLane("Lower Bracket", lowerColumns));

  const destination = document.createElement("aside");
  destination.className = "bracket-destination";
  const destinationHeading = document.createElement("h4");
  destinationHeading.textContent = destinationTitle;
  destination.append(destinationHeading);
  destinationRoutes.forEach((text) => {
    const route = document.createElement("div");
    route.className = "bracket-destination-route";
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    const label = document.createElement("span");
    label.textContent = text;
    route.append(arrow, label);
    destination.append(route);
  });
  destination.append(...destinationCards);

  const layout = document.createElement("div");
  layout.className = "bracket-layout";
  layout.append(lanes, destination);
  section.append(heading, layout);
  return section;
}

function regionalPlayoffBracket(region) {
  const bracket = season.regionalBrackets[region];
  if (!bracket) return null;
  const [seed1, seed2, seed3, seed4] = bracket.seeds;
  const stage = "regional_playoffs";
  const outcome = (key, result, fallback) =>
    getBracketOutcome(stage, key, result, region, null, fallback);
  return createBracketSection(
    `${region} Regional Playoffs`,
    [
      createBracketColumn("Semifinals", [
        createBracketMatchCard({
          stage, key: "upper_semi_1", region, label: "Semifinal 1",
          teamAId: seed1, teamBId: seed4,
          teamAName: "Seed 1", teamBName: "Seed 4"
        }),
        createBracketMatchCard({
          stage, key: "upper_semi_2", region, label: "Semifinal 2",
          teamAId: seed2, teamBId: seed3,
          teamAName: "Seed 2", teamBName: "Seed 3"
        })
      ]),
      createBracketColumn("Winners Final", [
        createBracketMatchCard({
          stage, key: "winners_final", region, label: "Winners Final",
          teamAName: outcome("upper_semi_1", "winner", "Winner of Semifinal 1"),
          teamBName: outcome("upper_semi_2", "winner", "Winner of Semifinal 2")
        })
      ])
    ],
    [
      createBracketColumn("Losers Semifinal", [
        createBracketMatchCard({
          stage, key: "losers_semi", region, label: "Losers Semifinal",
          teamAName: outcome("upper_semi_1", "loser", "Loser of Semifinal 1"),
          teamBName: outcome("upper_semi_2", "loser", "Loser of Semifinal 2")
        })
      ]),
      createBracketColumn("Losers Final", [
        createBracketMatchCard({
          stage, key: "losers_final", region, label: "Losers Final",
          teamAName: outcome("winners_final", "loser", "Loser of Winners Final"),
          teamBName: outcome("losers_semi", "winner", "Winner of Losers Semifinal")
        })
      ])
    ],
    [
      "Losers of the upper semifinals drop into the Losers Semifinal.",
      "Loser of Winners Final joins the Losers Final."
    ],
    "Regional Grand Final",
    ["Winners Final winner", "Losers Final winner"],
    [
      createBracketMatchCard({
        stage, key: "regional_grand_final", region, label: "Best-of-7 · Upper team starts 1-0",
        teamAName: outcome("winners_final", "winner", "Winner of Winners Final"),
        teamBName: outcome("losers_final", "winner", "Winner of Losers Final")
      })
    ]
  );
}

function regionalLcqBracket(region) {
  const bracket = season.lcqBrackets[region];
  if (!bracket) return null;
  const stage = "regional_lcq";
  const outcome = (key, result, fallback) =>
    getBracketOutcome(stage, key, result, region, null, fallback);
  return createBracketSection(
    `${region} Last Chance Qualifier`,
    [
      createBracketColumn("Upper Final", [
        createBracketMatchCard({
          stage, key: "upper_final", region, label: "Upper Bracket Final",
          teamAId: bracket.thirdPlaceId, teamBId: bracket.fourthPlaceId
        })
      ])
    ],
    [
      createBracketColumn("Lower Semifinal", [
        createBracketMatchCard({
          stage, key: "lower_semi", region, label: "Lower Bracket Semifinal",
          teamAId: bracket.fifthPlaceId, teamBId: bracket.sixthPlaceId
        })
      ]),
      createBracketColumn("Lower Final", [
        createBracketMatchCard({
          stage, key: "lower_final", region, label: "Lower Bracket Final",
          teamAName: outcome("upper_final", "loser", "Loser of Upper Final"),
          teamBName: outcome("lower_semi", "winner", "Winner of Lower Semifinal")
        })
      ])
    ],
    [
      "Loser of the Upper Final drops into the Lower Final.",
      "Winner of the Lower Semifinal advances to the Lower Final."
    ],
    "International Qualifiers",
    ["Upper Final winner qualifies", "Lower Final winner qualifies"],
    [
      createBracketOutcomeCard(
        "Upper Final Qualifier",
        outcome("upper_final", "winner", "Winner of Upper Final")
      ),
      createBracketOutcomeCard(
        "Lower Final Qualifier",
        outcome("lower_final", "winner", "Winner of Lower Final")
      )
    ]
  );
}

function internationalGroupBracket(groupName) {
  const groupTeamIds = season.internationalGroups[groupName];
  if (!groupTeamIds) return null;
  const stage = "international_groups";
  const firstSemiKey = `group_${groupName}_upper_semi_1`;
  const secondSemiKey = `group_${groupName}_upper_semi_2`;
  const upperFinalKey = `group_${groupName}_upper_final`;
  const lowerFinalKey = `group_${groupName}_lower_final`;
  const outcome = (key, result, fallback) =>
    getBracketOutcome(stage, key, result, null, groupName, fallback);
  return createBracketSection(
    `Group ${groupName}`,
    [
      createBracketColumn("Semifinals", [
        createBracketMatchCard({
          stage, key: firstSemiKey, group: groupName, label: "Semifinal 1",
          teamAId: groupTeamIds[0], teamBId: groupTeamIds[3]
        }),
        createBracketMatchCard({
          stage, key: secondSemiKey, group: groupName, label: "Semifinal 2",
          teamAId: groupTeamIds[1], teamBId: groupTeamIds[2]
        })
      ]),
      createBracketColumn("Upper Final", [
        createBracketMatchCard({
          stage, key: upperFinalKey, group: groupName, label: "Upper Final · 1st / 2nd",
          teamAName: outcome(firstSemiKey, "winner", "Winner of Semifinal 1"),
          teamBName: outcome(secondSemiKey, "winner", "Winner of Semifinal 2")
        })
      ])
    ],
    [
      createBracketColumn("Lower Final", [
        createBracketMatchCard({
          stage, key: lowerFinalKey, group: groupName, label: "Lower Final · 3rd / 4th",
          teamAName: outcome(firstSemiKey, "loser", "Loser of Semifinal 1"),
          teamBName: outcome(secondSemiKey, "loser", "Loser of Semifinal 2")
        })
      ])
    ],
    ["Losers of both semifinals meet in the Lower Final; the Upper Final loser remains 2nd."],
    "Group Placements",
    ["Upper Final decides 1st / 2nd", "Lower Final decides 3rd / 4th"],
    [
      createBracketOutcomeCard("1st Place", outcome(upperFinalKey, "winner", "Winner of Upper Final")),
      createBracketOutcomeCard("2nd Place", outcome(upperFinalKey, "loser", "Loser of Upper Final")),
      createBracketOutcomeCard("3rd Place", outcome(lowerFinalKey, "winner", "Winner of Lower Final")),
      createBracketOutcomeCard("4th Place", outcome(lowerFinalKey, "loser", "Loser of Lower Final"))
    ]
  );
}

function internationalChampionshipBracket() {
  const placements = season.internationalGroups?.placements;
  if (!placements?.A || !placements?.B) return null;
  const stage = "international_championship";
  const keys = {
    upper: "international_upper_final",
    quarter1: "international_lower_qf_1",
    quarter2: "international_lower_qf_2",
    semi: "international_lower_semi",
    lower: "international_lower_final",
    final: "international_grand_final"
  };
  const outcome = (key, result, fallback) =>
    getBracketOutcome(stage, key, result, null, null, fallback);
  return createBracketSection(
    "International Championship · 6-Team Bracket",
    [
      createBracketColumn("Upper Final", [
        createBracketMatchCard({
          stage, key: keys.upper, label: "Upper Bracket Final",
          teamAId: placements.A.first, teamBId: placements.B.first
        })
      ])
    ],
    [
      createBracketColumn("Lower Quarterfinals", [
        createBracketMatchCard({
          stage, key: keys.quarter1, label: "Lower Quarterfinal 1",
          teamAId: placements.B.second, teamBId: placements.A.third
        }),
        createBracketMatchCard({
          stage, key: keys.quarter2, label: "Lower Quarterfinal 2",
          teamAId: placements.A.second, teamBId: placements.B.third
        })
      ]),
      createBracketColumn("Lower Semifinal", [
        createBracketMatchCard({
          stage, key: keys.semi, label: "Lower Bracket Semifinal",
          teamAName: outcome(keys.quarter1, "winner", "Winner of Lower Quarterfinal 1"),
          teamBName: outcome(keys.quarter2, "winner", "Winner of Lower Quarterfinal 2")
        })
      ]),
      createBracketColumn("Lower Final", [
        createBracketMatchCard({
          stage, key: keys.lower, label: "Lower Bracket Final",
          teamAName: outcome(keys.upper, "loser", "Loser of Upper Final"),
          teamBName: outcome(keys.semi, "winner", "Winner of Lower Semifinal")
        })
      ])
    ],
    ["Loser of the Upper Final drops into the Lower Final."],
    "Grand Final",
    ["Upper Final winner", "Lower Final winner"],
    [
      createBracketMatchCard({
        stage, key: keys.final, label: "Best-of-7 · No reset",
        teamAName: outcome(keys.upper, "winner", "Winner of Upper Final"),
        teamBName: outcome(keys.lower, "winner", "Winner of Lower Final")
      })
    ]
  );
}

function renderBracket() {
  let sections = [];
  bracketPanel.hidden = true;
  if (season.stage === "regional_playoffs") {
    sections = ["NA", "EU/MENA"].map(regionalPlayoffBracket);
    bracketNote.textContent = "Double elimination · Series scores and advancing teams update as each round is played.";
  } else if (season.stage === "regional_lcq") {
    sections = ["NA", "EU/MENA"].map(regionalLcqBracket);
    bracketNote.textContent = "Four-team double elimination · The upper-final winner and lower-final winner qualify.";
  } else if (season.stage === "international_groups") {
    sections = ["A", "B"].map(internationalGroupBracket);
    bracketNote.textContent = "Each group has two teams from NA and two from EU/MENA; the top three advance.";
  } else if (season.stage === "international_championship" || season.stage === "complete") {
    sections = [internationalChampionshipBracket()];
    bracketNote.textContent = "Six-team double elimination · Best-of-7 · The grand final has no bracket reset.";
  }
  sections = sections.filter(Boolean);
  if (sections.length === 0) {
    weekMatches.classList.remove("bracket-current-match");
    return;
  }
  bracketContent.replaceChildren(...sections);
  bracketPanel.hidden = false;
  weekMatches.classList.add("bracket-current-match");
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
    teamLabel.append(document.createTextNode(`${index + 1}. `));
    const logo = createTeamLogo(team);
    if (logo) teamLabel.append(logo);
    teamLabel.append(document.createTextNode(
      `${team.name}${team.isUserTeam ? " (You)" : ""}`
    ));
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
  matchHistory.hidden = season.history.length === 0;
  historyRounds.replaceChildren();
  season.history.forEach((round) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `${round.title} · ${round.matches.length} series`;
    details.append(summary);
    const matches = document.createElement("div");
    matches.className = "match-list";
    round.matches.forEach((match) => matches.append(createMatchCard(match)));
    details.append(matches);
    historyRounds.append(details);
  });
}

function renderChampion() {
  const champion = getChampion(season);
  championBanner.hidden = !champion;
  if (!champion) return;
  championBanner.replaceChildren();
  const logo = createTeamLogo(champion);
  if (logo) championBanner.append(logo);
  const message = document.createElement("span");
  message.textContent = champion.isUserTeam
    ? `You are the RHL champion! ${champion.name} wins the International Championship.`
    : `${getFinishDescription()} ${champion.name} wins the RHL International Championship.`;
  championBanner.append(message);
}

function getFinishDescription() {
  const rounds = [...season.history];
  if (season.activeRound?.resultsReady) rounds.push(season.activeRound);
  const userTeam = season.teams.find((team) => team.id === season.userTeamId);

  for (let roundIndex = rounds.length - 1; roundIndex >= 0; roundIndex -= 1) {
    const round = rounds[roundIndex];
    const match = [...round.matches].reverse().find((item) =>
      item.teamAId === season.userTeamId || item.teamBId === season.userTeamId
    );
    if (!match) continue;

    if (round.stage === "international_championship") {
      const placements = {
        international_grand_final: "2nd in the International Championship",
        international_lower_final: "3rd in the International Championship",
        international_lower_semi: "4th in the International Championship",
        international_lower_qf_1: "5th–6th in the International Championship",
        international_lower_qf_2: "5th–6th in the International Championship"
      };
      return `You finished ${placements[match.key] ?? "in the International Championship"}.`;
    }

    if (round.stage === "international_groups" && match.key.includes("lower_final")) {
      return `You finished 4th in Group ${match.group}.`;
    }

    if (round.stage === "regional_lcq") {
      const placement = match.key === "lower_final" ? "3rd" : "4th";
      return `You finished ${placement} in the ${match.region} Regional LCQ.`;
    }
  }

  const standing = getStandings(season, userTeam.region)
    .findIndex((team) => team.id === season.userTeamId);
  if (standing !== -1) {
    const position = standing + 1;
    const suffix = position % 100 >= 11 && position % 100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[position % 10] ?? "th");
    return `You finished ${position}${suffix} in ${userTeam.region} League Play.`;
  }

  return "You were eliminated before the International Championship.";
}

function getContinueLabel(round) {
  if (round.stage === "league_play") {
    const nextWeek = season.currentWeek + 2;
    return nextWeek <= season.leagueWeeks.length
      ? `Continue to week ${nextWeek}`
      : "Continue";
  }
  if (
    round.stage === "international_championship" &&
    season.stageRoundIndex === 3
  ) {
    return "Finish season";
  }
  if (round.stage === "league_tiebreak") {
    return "Continue to Regional Playoffs";
  }
  if (round.stage === "regional_playoffs" && season.stageRoundIndex === 3) {
    return "Continue to International Groups";
  }
  if (round.stage === "regional_lcq" && season.stageRoundIndex === 1) {
    return "Continue to International Groups";
  }
  if (round.stage === "international_groups" && season.stageRoundIndex === 1) {
    return "Continue to Championship Bracket";
  }
  return "Continue to next round";
}

function renderCurrentRound() {
  if (season.stage === "complete") {
    weekLabel.textContent = "Season complete";
    weekDescription.textContent = "All RHL Season 10 stages are complete.";
    advanceButton.disabled = true;
    advanceButton.textContent = "Season complete";
    const finalRound = season.history[season.history.length - 1];
    const userMatches = finalRound.matches.filter((match) =>
      match.teamAId === season.userTeamId || match.teamBId === season.userTeamId
    );
    weekMatches.replaceChildren(...userMatches.map(createMatchCard));
    return;
  }

  const round = getCurrentRound(season);
  weekLabel.textContent = round.title;
  const userMatches = round.matches.filter((match) =>
    match.teamAId === season.userTeamId || match.teamBId === season.userTeamId
  );
  weekDescription.textContent = round.resultsReady
    ? `${round.description} Your result is final; other matches are simulated automatically.`
    : `${round.description} Other matches are simulated automatically.`;
  advanceButton.disabled = false;
  advanceButton.textContent = round.resultsReady
    ? getContinueLabel(round)
    : round.stage === "league_play"
      ? `Simulate week ${season.currentWeek + 1}`
      : "Simulate your match";
  weekMatches.replaceChildren(...userMatches.map(createMatchCard));
}

function renderSeason() {
  const userTeam = season.teams.find((team) => team.id === season.userTeamId);
  seasonTitle.replaceChildren();
  const logo = createTeamLogo(userTeam);
  if (logo) seasonTitle.append(logo);
  seasonTitle.append(document.createTextNode(`${userTeam.name} · ${userTeam.region}`));
  stageName.textContent = getStageLabel(season);
  renderStandings();
  renderRoster();
  renderHistory();
  renderChampion();
  renderBracket();
  renderCurrentRound();
}

function startSeason() {
  if (!setup) return;
  try {
    season = createSeason(setup);
    advanceToNextUserMatch(season);
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
    const round = getCurrentRound(season);
    if (round.resultsReady) {
      continueSeason(season);
      advanceToNextUserMatch(season);
    } else {
      simulateCurrentStep(season);
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
