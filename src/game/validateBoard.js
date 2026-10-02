const STANDARD_VALUES = new Set([200, 400, 600, 800, 1000])

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

  if (raw.categories.length !== 6) {
    errors.push(`Board must have exactly 6 categories (found ${raw.categories.length}).`)
  }

  const categories = []
  raw.categories.forEach((cat, ci) => {
    if (!cat || typeof cat !== 'object') {
      errors.push(`Category ${ci + 1} must be an object.`)
      return
    }
    const name = typeof cat.name === 'string' ? cat.name.trim() : ''
    if (!name) {
      errors.push(`Category ${ci + 1} must have a non-empty "name".`)
    }
    if (!Array.isArray(cat.clues)) {
      errors.push(`Category "${name || ci + 1}" must have a "clues" array.`)
      return
    }
    if (cat.clues.length !== 5) {
      errors.push(
        `Category "${name || ci + 1}" must have exactly 5 clues (found ${cat.clues.length}).`,
      )
    }

    const clues = []
    cat.clues.forEach((clue, ri) => {
      if (!clue || typeof clue !== 'object') {
        errors.push(`Clue ${ri + 1} in category "${name}" must be an object.`)
        return
      }
      const value = clue.value
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`Clue ${ri + 1} in "${name}" must have a numeric "value".`)
      } else if (!STANDARD_VALUES.has(value)) {
        warnings.push(
          `Clue ${ri + 1} in "${name}" has value ${value}; standard values are 200–1000 in steps of 200.`,
        )
      }
      const clueText = typeof clue.clue === 'string' ? clue.clue.trim() : ''
      const answer = typeof clue.answer === 'string' ? clue.answer.trim() : ''
      if (!clueText) {
        errors.push(`Clue ${ri + 1} in "${name}" must have non-empty "clue" text.`)
      }
      if (!answer) {
        errors.push(`Clue ${ri + 1} in "${name}" must have non-empty "answer" text.`)
      }
      clues.push({
        value,
        clue: clueText,
        answer,
        hint: typeof clue.hint === 'string' && clue.hint.trim() ? clue.hint.trim() : undefined,
      })
    })

    categories.push({ name: name || `Category ${ci + 1}`, clues })
  })

  let spinnerEvents = []
  if (raw.spinnerEvents !== undefined) {
    if (!Array.isArray(raw.spinnerEvents)) {
      errors.push('"spinnerEvents" must be an array of strings when provided.')
    } else {
      spinnerEvents = raw.spinnerEvents
        .filter((e) => typeof e === 'string' && e.trim())
        .map((e) => e.trim())
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, data: null }
  }

  return {
    ok: true,
    errors: [],
    warnings,
    data: {
      title,
      categories,
      spinnerEvents,
    },
  }
}
