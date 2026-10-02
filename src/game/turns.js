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

/** Index of the lowest-scoring team (first on ties); they pick first in Double Jeopardy. */
export function lowestScoreIndex(teams) {
  let best = 0
  teams.forEach((team, i) => {
    if (team.score < teams[best].score) {
      best = i
    }
  })
  return best
}
