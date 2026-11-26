import { createTeamLogo } from "./team-logo.js";

export function getPlayerTier(rating) {
  if (rating >= 95) return { name: "Iconic", className: "iconic" };
  if (rating >= 85) return { name: "Legendary", className: "legendary" };
  if (rating >= 75) return { name: "Elite", className: "elite" };
  if (rating >= 65) return { name: "Rare", className: "rare" };
  if (rating >= 55) return { name: "Uncommon", className: "uncommon" };
  return { name: "Basic", className: "basic" };
}

export function createPlayerCard(player, labelText, onSelect = null, teamsByName = new Map()) {
  const card = document.createElement("article");
  const overallRating = Math.round(player.rating);
  const tierInfo = getPlayerTier(overallRating);
  card.className = `player-card ${tierInfo.className}`;
  if (onSelect) {
    card.classList.add("is-selectable");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Choose ${player.name}`);
    card.addEventListener("click", onSelect);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    });
  }
  const header = document.createElement("div");
  header.className = "card-header";
  const ratingBlock = document.createElement("div");
  const rating = document.createElement("div");
  rating.className = "card-rating";
  rating.textContent = overallRating;
  const ratingLabel = document.createElement("div");
  ratingLabel.className = "rating-label";
  ratingLabel.textContent = "OVERALL";
  ratingBlock.append(rating, ratingLabel);
  const tier = document.createElement("div");
  tier.className = "card-tier";
  tier.textContent = tierInfo.name;
  header.append(ratingBlock, tier);
  const playerTeam = teamsByName.get(player.startingTeam);
  const logoArea = document.createElement("div");
  logoArea.className = "player-card-logo";
  const logo = createTeamLogo(playerTeam, "player-card-team-logo");
  if (logo) {
    logoArea.append(logo);
  } else {
    const initials = document.createElement("span");
    initials.className = "player-card-logo-fallback";
    initials.textContent = (playerTeam?.name ?? player.startingTeam ?? "RHL").slice(0, 3);
    logoArea.append(initials);
  }
  const info = document.createElement("div");
  info.className = "player-info";
  const name = document.createElement("div");
  name.className = "player-name";
  name.textContent = player.name;
  const teamName = document.createElement("div");
  teamName.className = "player-team-name";
  teamName.textContent = playerTeam?.name ?? player.startingTeam ?? "RHL";
  info.append(name, teamName);
  const footer = document.createElement("div");
  footer.className = "player-card-footer";
  if (labelText) {
    const label = document.createElement("span");
    label.className = "player-card-label";
    label.textContent = labelText;
    footer.append(label);
  }
  card.append(header, logoArea, info);
  if (footer.childElementCount) card.append(footer);
  return card;
}
