export const DEFAULT_TEAM_COUNT = 4

export function createDefaultTeams() {
  return Array.from({ length: DEFAULT_TEAM_COUNT }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    score: 0,
    /** Bonus minigame currency (per team); dice multiplier applies when banked. */
    bonusTokens: 0,
    /** Consumable powerups won in the slots stage (per team). */
    powerups: [],
  }))
}
