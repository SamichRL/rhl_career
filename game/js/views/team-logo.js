export function createTeamLogo(team, className = "team-logo") {
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
