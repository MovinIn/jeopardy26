export const DEFAULT_TEAM_COUNT = 4

export function createDefaultTeams() {
  return Array.from({ length: DEFAULT_TEAM_COUNT }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    score: 0,
  }))
}
