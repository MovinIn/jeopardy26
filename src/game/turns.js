export function nextTeamIndex(teamCount, currentIndex) {
  if (teamCount <= 0) {
    return 0
  }
  return (currentIndex + 1) % teamCount
}

export function normalizeTeamIndex(teamCount, index) {
  if (teamCount <= 0) {
    return 0
  }
  if (index < 0 || index >= teamCount) {
    return 0
  }
  return index
}
