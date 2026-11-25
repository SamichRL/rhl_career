import { createTeamLogo } from "./team-logo.js";

const SPIN_DURATION_MS = 3000;
const CARD_STEP = 50;
const CARD_CENTER = 22;
const REEL_INSET = 7;
const CENTER_LINE = 80;

function makeCard(team, isWinner = false) {
  const card = document.createElement("div");
  card.className = `team-reel-card${isWinner ? " is-winner" : ""}`;

  const logo = createTeamLogo(team, "team-reel-logo");
  if (logo) {
    logo.alt = "";
    logo.loading = "eager";
    card.append(logo);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "team-reel-fallback";
    fallback.textContent = team.name.slice(0, 2).toUpperCase();
    card.append(fallback);
  }

  const name = document.createElement("span");
  name.className = "team-reel-name";
  name.textContent = team.name;
  const region = document.createElement("span");
  region.className = "team-reel-region";
  region.textContent = team.region ?? "RHL";
  const identity = document.createElement("span");
  identity.className = "team-reel-identity";
  identity.append(name, region);
  card.append(identity);
  return card;
}

function makeIdleCard(titleText, detailText, isSelected = false) {
  const card = document.createElement("div");
  card.className = `team-reel-card is-idle${isSelected ? " is-current" : ""}`;
  const title = document.createElement("span");
  title.className = "team-reel-name";
  title.textContent = titleText;
  const detail = document.createElement("span");
  detail.className = "team-reel-region";
  detail.textContent = detailText;
  const identity = document.createElement("span");
  identity.className = "team-reel-identity";
  identity.append(title, detail);
  card.append(identity);
  return card;
}

export function createTeamReelView(container) {
  const title = document.createElement("h3");
  title.className = "team-reel-title";
  title.textContent = "Random team draw";

  const windowElement = document.createElement("div");
  windowElement.className = "team-reel-window";
  windowElement.setAttribute("aria-hidden", "true");
  const selection = document.createElement("div");
  selection.className = "team-reel-selection";
  const list = document.createElement("div");
  list.className = "team-reel-list";
  windowElement.append(selection, list);

  const announcement = document.createElement("p");
  announcement.className = "visually-hidden";
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.textContent = "The reel stops on a team with available players.";
  container.replaceChildren(title, windowElement, announcement);

  function showIdleReel() {
    list.replaceChildren(
      makeIdleCard("Teams will roll here", "Eligible teams"),
      makeIdleCard("Ready to draw", "Spin to begin", true),
      makeIdleCard("Your next team", "Selected at random")
    );
  }
  showIdleReel();

  let spinning = false;
  let finishTimer = null;

  function reset() {
    if (finishTimer !== null) window.clearTimeout(finishTimer);
    finishTimer = null;
    spinning = false;
    list.style.transition = "none";
    list.style.transform = "translateY(0px)";
    showIdleReel();
    announcement.textContent = "The reel stops on a team with available players.";
  }

  return {
    isSpinning: () => spinning,
    reset,
    spin(teams, winner) {
      if (spinning) return Promise.resolve();
      spinning = true;
      container.hidden = false;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      container.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      announcement.textContent = "Teams are scrolling. Drawing a random team…";

      const run = Array.from({ length: 34 }, () => teams[Math.floor(Math.random() * teams.length)]);
      const winnerPosition = run.length;
      run.push(winner);
      for (let index = 0; index < 5; index += 1) {
        run.push(teams[Math.floor(Math.random() * teams.length)]);
      }

      list.replaceChildren(...run.map((team, index) => makeCard(team, index === winnerPosition)));
      list.style.transition = "none";
      list.style.transform = "translateY(0px)";
      void list.offsetHeight;

      const duration = reducedMotion ? 0 : SPIN_DURATION_MS;
      const targetOffset = REEL_INSET + winnerPosition * CARD_STEP + CARD_CENTER;
      list.style.transition = `transform ${duration}ms cubic-bezier(.10,.72,.14,1)`;
      list.style.transform = `translateY(${CENTER_LINE - targetOffset}px)`;

      return new Promise((resolve) => {
        finishTimer = window.setTimeout(() => {
          spinning = false;
          finishTimer = null;
          announcement.textContent = `${winner.name} · ${winner.region ?? "RHL"}. Choose one player from this team.`;
          resolve();
        }, duration + 80);
      });
    }
  };
}
