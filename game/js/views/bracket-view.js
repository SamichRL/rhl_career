import { createTeamLogo } from "./team-logo.js";

export function createBracketView(elements) {
  let season;
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
    const teamAIsUser = season.teams.find((team) => team.id === resolvedTeamAId)?.isUserTeam;
    const teamBIsUser = season.teams.find((team) => team.id === resolvedTeamBId)?.isUserTeam;
    const userOnRight = teamBIsUser && !teamAIsUser;
    const displayTeamAId = userOnRight ? resolvedTeamBId : resolvedTeamAId;
    const displayTeamBId = userOnRight ? resolvedTeamAId : resolvedTeamBId;
    const displayTeamA = userOnRight ? resolvedTeamB : resolvedTeamA;
    const displayTeamB = userOnRight ? resolvedTeamA : resolvedTeamB;
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
      { team: displayTeamA, teamId: displayTeamAId, score: userOnRight ? result?.teamBWins : result?.teamAWins, winner: result?.winnerId === displayTeamAId },
      { team: displayTeamB, teamId: displayTeamBId, score: userOnRight ? result?.teamAWins : result?.teamBWins, winner: result?.winnerId === displayTeamBId }
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
  function renderBracket(nextSeason) {
    season = nextSeason;
    let sections = [];
    elements.bracketPanel.hidden = true;
    if (season.stage === "regional_playoffs") {
      sections = ["NA", "EU/MENA"].map(regionalPlayoffBracket);
      elements.bracketNote.textContent = "Double elimination · Series scores and advancing teams update as each round is played.";
    } else if (season.stage === "regional_lcq") {
      sections = ["NA", "EU/MENA"].map(regionalLcqBracket);
      elements.bracketNote.textContent = "Four-team double elimination · The upper-final winner and lower-final winner qualify.";
    } else if (season.stage === "international_groups") {
      sections = ["A", "B"].map(internationalGroupBracket);
      elements.bracketNote.textContent = "Each group has two teams from NA and two from EU/MENA; the top three advance.";
    } else if (season.stage === "international_championship" || season.stage === "complete") {
      sections = [internationalChampionshipBracket()];
      elements.bracketNote.textContent = "Six-team double elimination · Best-of-7 · The grand final has no bracket reset.";
    }
    sections = sections.filter(Boolean);
    if (sections.length === 0) {
      elements.weekMatches.classList.remove("bracket-current-match");
      return;
    }
    elements.bracketContent.replaceChildren(...sections);
    elements.bracketPanel.hidden = false;
    elements.weekMatches.classList.add("bracket-current-match");
  }
  return renderBracket;
}
