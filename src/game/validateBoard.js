const JEOPARDY_VALUES = new Set([200, 400, 600, 800, 1000])
const DOUBLE_VALUES = new Set([400, 800, 1200, 1600, 2000])

function validateRound(rawCategories, label, standardValues, errors, warnings) {
  if (!Array.isArray(rawCategories)) {
    errors.push(`${label} must include a "categories" array.`)
    return null
  }

  if (rawCategories.length !== 6) {
    errors.push(`${label} must have exactly 6 categories (found ${rawCategories.length}).`)
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
      clues.push({ value, clue: clueText, answer, dailyDouble: clue.dailyDouble === true })
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

  if (errors.length > 0) {
    return { ok: false, errors, warnings, data: null }
  }

  return {
    ok: true,
    errors: [],
    warnings,
    data: { title, categories, doubleJeopardy, finalJeopardy },
  }
}
