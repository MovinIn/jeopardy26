import { MAX_CATEGORIES, MIN_CATEGORIES } from './boardConfig.js'
import { SPELLING_CHAOS_ANIMATION } from './spellingChaos.js'

const JEOPARDY_VALUES = new Set([200, 400, 600, 800, 1000])
const DOUBLE_VALUES = new Set([400, 800, 1200, 1600, 2000])
// A clue with one of these ids opens a mini game on the board instead of the usual question.
const KNOWN_MINIGAMES = new Set(['snake', 'flappy', 'tetris', 'typing', 'reaction'])
// A clue with one of these ids plays an on-screen animation under its question.
const KNOWN_CLUE_ANIMATIONS = new Set([SPELLING_CHAOS_ANIMATION])

function validateRound(rawCategories, label, standardValues, errors, warnings) {
  if (!Array.isArray(rawCategories)) {
    errors.push(`${label} must include a "categories" array.`)
    return null
  }

  if (rawCategories.length < MIN_CATEGORIES || rawCategories.length > MAX_CATEGORIES) {
    errors.push(
      `${label} must have ${MIN_CATEGORIES} or ${MAX_CATEGORIES} categories (found ${rawCategories.length}).`,
    )
  }

  const categories = []
  rawCategories.forEach((cat, ci) => {
    if (!cat || typeof cat !== 'object') {
      errors.push(`${label}: category ${ci + 1} must be an object.`)
      return
    }
    const name = typeof cat.name === 'string' ? cat.name.trim() : ''
    if (!name) {
      errors.push(`${label}: category ${ci + 1} must have a non-empty "name".`)
    }
    if (!Array.isArray(cat.clues)) {
      errors.push(`${label}: category "${name || ci + 1}" must have a "clues" array.`)
      return
    }
    if (cat.clues.length !== 5) {
      errors.push(
        `${label}: category "${name || ci + 1}" must have exactly 5 clues (found ${cat.clues.length}).`,
      )
    }

    const clues = []
    cat.clues.forEach((clue, ri) => {
      if (!clue || typeof clue !== 'object') {
        errors.push(`${label}: clue ${ri + 1} in category "${name}" must be an object.`)
        return
      }
      const value = clue.value
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${label}: clue ${ri + 1} in "${name}" must have a numeric "value".`)
      } else if (!standardValues.has(value)) {
        const list = [...standardValues].join(', ')
        warnings.push(
          `${label}: clue ${ri + 1} in "${name}" has value ${value}; standard values are ${list}.`,
        )
      }
      const clueText = typeof clue.clue === 'string' ? clue.clue.trim() : ''
      const answer = typeof clue.answer === 'string' ? clue.answer.trim() : ''
      if (!clueText) {
        errors.push(`${label}: clue ${ri + 1} in "${name}" must have non-empty "clue" text.`)
      }
      if (!answer) {
        errors.push(`${label}: clue ${ri + 1} in "${name}" must have non-empty "answer" text.`)
      }
      let image
      if (clue.image !== undefined) {
        if (typeof clue.image !== 'string' || !clue.image.trim()) {
          errors.push(
            `${label}: clue ${ri + 1} in "${name}" must have a non-empty string "image" when provided.`,
          )
        } else {
          image = clue.image.trim()
        }
      }
      let animation
      if (clue.animation !== undefined) {
        if (typeof clue.animation !== 'string' || !clue.animation.trim()) {
          errors.push(
            `${label}: clue ${ri + 1} in "${name}" must have a non-empty string "animation" when provided.`,
          )
        } else {
          animation = clue.animation.trim()
          if (!KNOWN_CLUE_ANIMATIONS.has(animation)) {
            warnings.push(`${label}: clue ${ri + 1} in "${name}" has unknown animation "${animation}".`)
          }
        }
      }
      let spellingWord
      if (clue.spellingWord !== undefined) {
        if (typeof clue.spellingWord !== 'string' || !clue.spellingWord.trim()) {
          errors.push(
            `${label}: clue ${ri + 1} in "${name}" must have a non-empty string "spellingWord" when provided.`,
          )
        } else {
          spellingWord = clue.spellingWord.trim()
        }
      }
      let minigame
      if (clue.minigame !== undefined) {
        if (KNOWN_MINIGAMES.has(clue.minigame)) {
          minigame = clue.minigame
        } else {
          warnings.push(
            `${label}: clue ${ri + 1} in "${name}" has unknown minigame "${clue.minigame}"; it will be played as a normal clue.`,
          )
        }
      }
      clues.push({ value, clue: clueText, answer, dailyDouble: clue.dailyDouble === true, minigame, image, animation, spellingWord })
    })

    categories.push({ name: name || `Category ${ci + 1}`, clues })
  })

  return categories
}

function validateFinal(raw, errors) {
  if (!raw || typeof raw !== 'object') {
    errors.push('"finalJeopardy" must be an object with "category", "clue" and "answer".')
    return null
  }
  const category = typeof raw.category === 'string' ? raw.category.trim() : ''
  const clue = typeof raw.clue === 'string' ? raw.clue.trim() : ''
  const answer = typeof raw.answer === 'string' ? raw.answer.trim() : ''
  if (!category || !clue || !answer) {
    errors.push('"finalJeopardy" needs non-empty "category", "clue" and "answer" strings.')
    return null
  }
  return { category, clue, answer }
}

export function validateBoardJson(raw) {
  const errors = []
  const warnings = []

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Board must be a JSON object.'], warnings, data: null }
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) {
    errors.push('Board must include a non-empty "title" string.')
  }

  if (!Array.isArray(raw.categories)) {
    errors.push('Board must include a "categories" array.')
    return { ok: false, errors, warnings, data: null }
  }

  const categories = validateRound(raw.categories, 'Jeopardy!', JEOPARDY_VALUES, errors, warnings)

  let doubleJeopardy = null
  if (raw.doubleJeopardy !== undefined) {
    doubleJeopardy = validateRound(
      raw.doubleJeopardy?.categories,
      'Double Jeopardy!',
      DOUBLE_VALUES,
      errors,
      warnings,
    )
  }

  let finalJeopardy = null
  if (raw.finalJeopardy !== undefined) {
    finalJeopardy = validateFinal(raw.finalJeopardy, errors)
  }

  let spinnerEvents = []
  if (raw.spinnerEvents !== undefined) {
    if (!Array.isArray(raw.spinnerEvents)) {
      errors.push('"spinnerEvents" must be an array when provided.')
    } else {
      spinnerEvents = raw.spinnerEvents
        .map((e) => {
          if (typeof e === 'string' && e.trim()) {
            return e.trim()
          }
          if (e && typeof e === 'object' && typeof e.label === 'string' && e.label.trim()) {
            const out = { label: e.label.trim() }
            if (typeof e.tokens === 'number' && Number.isFinite(e.tokens)) {
              out.tokens = Math.max(0, Math.floor(e.tokens))
            }
            return out
          }
          return null
        })
        .filter(Boolean)
    }
  }

  let slotPowerups = []
  if (raw.slotPowerups !== undefined) {
    if (!Array.isArray(raw.slotPowerups)) {
      errors.push('"slotPowerups" must be an array when provided.')
    } else {
      slotPowerups = raw.slotPowerups
        .map((e) => {
          if (typeof e === 'string' && e.trim()) {
            return e.trim()
          }
          if (e && typeof e === 'object' && typeof e.label === 'string' && e.label.trim()) {
            const out = { label: e.label.trim() }
            if (typeof e.id === 'string' && e.id.trim()) {
              out.id = e.id.trim()
            }
            return out
          }
          return null
        })
        .filter(Boolean)
    }
  }

  let diceFaces = []
  if (raw.diceFaces !== undefined) {
    if (!Array.isArray(raw.diceFaces)) {
      errors.push('"diceFaces" must be an array of numbers when provided.')
    } else {
      diceFaces = raw.diceFaces
        .filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
        .map((v) => Math.floor(v))
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, data: null }
  }

  return {
    ok: true,
    errors: [],
    warnings,
    data: { title, categories, doubleJeopardy, finalJeopardy, spinnerEvents, slotPowerups, diceFaces },
  }
}
