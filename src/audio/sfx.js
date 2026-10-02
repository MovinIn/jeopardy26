/**
 * Sound effects, synthesised with the Web Audio API so there are no audio files to ship.
 *
 * `play('coin')` fires a sound by name. It does nothing (and never throws) when sound is muted,
 * when the browser has no Web Audio, or when the same sound was played a moment ago.
 * Mute is remembered in localStorage and is separate from the background music.
 */

const PREFS_KEY = 'jeopardy-sfx-prefs-v1'
const MASTER_GAIN = 0.55
const DEFAULT_MIN_GAP_MS = 60

// ---------------------------------------------------------------- preferences

function readMuted() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? Boolean(JSON.parse(raw).muted) : false
  } catch {
    return false
  }
}

let muted = readMuted()
const listeners = new Set()

export function isSfxMuted() {
  return muted
}

/** Re-reads the saved preference (used on startup and by tests). */
export function loadSfxPrefs() {
  muted = readMuted()
  listeners.forEach((listener) => listener())
}

export function setSfxMuted(next) {
  muted = Boolean(next)
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ muted }))
  } catch {
    // storage unavailable: the choice still holds for this session
  }
  listeners.forEach((listener) => listener())
  if (!muted) {
    play('tick') // a little confirmation that sound is back on
  }
}

export function subscribeSfx(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --------------------------------------------------------------------- engine

let context = null
let master = null
let noiseBuffers = new WeakMap()
const lastPlayed = new Map()

function getContext() {
  if (context) {
    return context
  }
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  if (!Ctx) {
    return null
  }
  context = new Ctx()
  const compressor = context.createDynamicsCompressor()
  master = context.createGain()
  master.gain.value = MASTER_GAIN
  master.connect(compressor)
  compressor.connect(context.destination)
  return context
}

/** Forgets the audio context and play history (for tests). */
export function resetSfxEngine() {
  context = null
  master = null
  noiseBuffers = new WeakMap()
  lastPlayed.clear()
}

/** A MIDI note number as a frequency in Hz (69 is A440). */
const hz = (note) => 440 * 2 ** ((note - 69) / 12)

function tone(ctx, out, { freq, type = 'sine', start = 0, dur = 0.15, gain = 0.25, slideTo = null, attack = 0.005 }) {
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  }
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env)
  env.connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.03)
}

function noiseBufferFor(ctx) {
  let buffer = noiseBuffers.get(ctx)
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    noiseBuffers.set(ctx, buffer)
  }
  return buffer
}

function noise(ctx, out, { start = 0, dur = 0.1, gain = 0.2, freq = 2000, slideTo = null, q = 0.8, filter = 'bandpass' }) {
  const t = ctx.currentTime + start
  const src = ctx.createBufferSource()
  src.buffer = noiseBufferFor(ctx)
  const shaper = ctx.createBiquadFilter()
  shaper.type = filter
  shaper.frequency.setValueAtTime(freq, t)
  if (slideTo) {
    shaper.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  }
  shaper.Q.value = q
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(shaper)
  shaper.connect(env)
  env.connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// -------------------------------------------------------------------- recipes

/** Short names for building sounds: t() is a tone, n() is a noise burst. */
function api(ctx) {
  return {
    t: (spec) => tone(ctx, master, spec),
    n: (spec) => noise(ctx, master, spec),
  }
}

/** A coin: two quick square-wave notes, a step apart. */
const coin = ({ t }, start = 0, gain = 0.14) => {
  t({ freq: hz(83), type: 'square', start, dur: 0.07, gain })
  t({ freq: hz(88), type: 'square', start: start + 0.07, dur: 0.3, gain })
}

const SOUNDS = {
  // ---- interface
  tick: { minGap: 25, play: ({ t }) => t({ freq: 1400, type: 'square', dur: 0.03, gain: 0.1 }) },
  tile: {
    play: ({ t, n }) => {
      t({ freq: hz(72), type: 'triangle', dur: 0.14, gain: 0.26, slideTo: hz(84) })
      n({ dur: 0.06, gain: 0.07, freq: 6000, filter: 'highpass' })
    },
  },
  ticket: {
    play: ({ t, n }) => {
      n({ dur: 0.04, gain: 0.12, freq: 1800 })
      t({ freq: hz(88), dur: 0.28, gain: 0.22 })
      t({ freq: hz(95), start: 0.04, dur: 0.22, gain: 0.12 })
    },
  },
  coin: { play: (sound) => coin(sound) },
  reveal: {
    play: ({ t, n }) => {
      n({ dur: 0.35, gain: 0.1, freq: 400, slideTo: 3200 })
      t({ freq: hz(84), start: 0.25, dur: 0.3, gain: 0.18 })
    },
  },
  pass: { play: ({ t }) => t({ freq: 420, type: 'triangle', dur: 0.22, gain: 0.2, slideTo: 240 }) },

  // ---- judging and results
  correct: {
    play: ({ t }) => {
      ;[84, 88, 91].forEach((note, i) =>
        t({ freq: hz(note), start: i * 0.09, dur: 0.25, gain: 0.22 }),
      )
      t({ freq: hz(96), start: 0.27, dur: 0.4, gain: 0.14, type: 'triangle' })
    },
  },
  wrong: {
    play: ({ t }) => {
      t({ freq: 150, type: 'sawtooth', dur: 0.45, gain: 0.26, slideTo: 90 })
      t({ freq: 142, type: 'sawtooth', dur: 0.45, gain: 0.2, slideTo: 84 })
    },
  },
  dailyDouble: {
    minGap: 400,
    play: ({ t, n }) => {
      ;[67, 72, 76, 79].forEach((note, i) =>
        t({ freq: hz(note), type: 'sawtooth', start: i * 0.09, dur: 0.12, gain: 0.16 }),
      )
      ;[72, 76, 79, 84].forEach((note) =>
        t({ freq: hz(note), type: 'sawtooth', start: 0.38, dur: 0.7, gain: 0.13 }),
      )
      n({ start: 0.38, dur: 0.6, gain: 0.12, freq: 7000, filter: 'highpass' })
      for (let i = 0; i < 6; i++) {
        t({ freq: hz(91 + i * 2), type: 'square', start: 0.5 + i * 0.07, dur: 0.12, gain: 0.07 })
      }
    },
  },
  fanfare: {
    minGap: 400,
    play: ({ t }) => {
      ;[[72, 0], [72, 0.13], [72, 0.26], [76, 0.39], [79, 0.55]].forEach(([note, start], i) =>
        t({ freq: hz(note), type: 'square', start, dur: i === 4 ? 0.7 : 0.14, gain: 0.15 }),
      )
      t({ freq: hz(60), type: 'triangle', start: 0.55, dur: 0.7, gain: 0.2 })
    },
  },
  win: {
    minGap: 300,
    play: ({ t }) => {
      ;[72, 76, 79, 84].forEach((note, i) =>
        t({ freq: hz(note), type: 'square', start: i * 0.08, dur: 0.12, gain: 0.15 }),
      )
      ;[72, 76, 79, 84].forEach((note) =>
        t({ freq: hz(note), type: 'triangle', start: 0.34, dur: 0.6, gain: 0.15 }),
      )
      t({ freq: hz(96), start: 0.4, dur: 0.5, gain: 0.1 })
    },
  },
  lose: {
    minGap: 300,
    play: ({ t }) => {
      ;[[62, 61, 0, 0.36], [61, 60, 0.38, 0.36], [60, 59, 0.76, 0.36], [59, 52, 1.14, 0.8]].forEach(
        ([from, to, start, dur]) =>
          t({ freq: hz(from), type: 'sawtooth', start, dur, gain: 0.2, slideTo: hz(to) }),
      )
    },
  },
  jackpot: {
    minGap: 600,
    play: (sound) => {
      const { t } = sound
      for (let i = 0; i < 16; i++) {
        coin(sound, i * 0.075, 0.09)
      }
      ;[72, 76, 79, 84].forEach((note) =>
        t({ freq: hz(note), type: 'triangle', start: 0.1, dur: 1.2, gain: 0.14 }),
      )
      ;[96, 100, 103, 108].forEach((note, i) =>
        t({ freq: hz(note), start: 0.6 + i * 0.12, dur: 0.5, gain: 0.1 }),
      )
    },
  },

  // ---- cards, wheel, reels
  card: {
    play: ({ n }) => {
      n({ dur: 0.07, gain: 0.2, freq: 5000, filter: 'highpass' })
      n({ start: 0.01, dur: 0.05, gain: 0.1, freq: 1500 })
    },
  },
  spinStart: { play: ({ n }) => n({ dur: 0.55, gain: 0.1, freq: 300, slideTo: 2600 }) },
  ballTick: {
    minGap: 14,
    play: ({ t, n }) => {
      n({ dur: 0.02, gain: 0.2, freq: 2600 + Math.random() * 700, q: 2 })
      t({ freq: 1900 + Math.random() * 300, type: 'triangle', dur: 0.016, gain: 0.08 })
    },
  },
  ballLand: {
    minGap: 200,
    play: ({ t }) => {
      t({ freq: 190, dur: 0.16, gain: 0.34, slideTo: 80 })
      t({ freq: hz(88), start: 0.03, dur: 0.3, gain: 0.14 })
    },
  },
  leverPull: {
    minGap: 200,
    play: ({ t }) => {
      for (let i = 0; i < 6; i++) {
        t({ freq: 280 + i * 70, type: 'square', start: i * 0.05, dur: 0.03, gain: 0.1 })
      }
      t({ freq: 160, start: 0.3, dur: 0.12, gain: 0.3, slideTo: 80 })
    },
  },
  reelTick: {
    minGap: 14,
    play: ({ t }) => t({ freq: 900 + Math.random() * 200, type: 'square', dur: 0.02, gain: 0.07 }),
  },
  reelStop: {
    minGap: 80,
    play: ({ t }) => {
      t({ freq: 210, dur: 0.12, gain: 0.3, slideTo: 120 })
      t({ freq: 1200, type: 'square', dur: 0.04, gain: 0.09 })
    },
  },

  // ---- snake and flappy bird
  eat: {
    play: ({ t }) => {
      t({ freq: 520, type: 'square', dur: 0.09, gain: 0.15, slideTo: 880 })
      t({ freq: 880, type: 'square', start: 0.07, dur: 0.1, gain: 0.13, slideTo: 1320 })
    },
  },
  crash: {
    minGap: 200,
    play: ({ t, n }) => {
      n({ dur: 0.36, gain: 0.34, freq: 900, slideTo: 150, filter: 'lowpass' })
      t({ freq: 220, type: 'sawtooth', dur: 0.4, gain: 0.24, slideTo: 55 })
    },
  },
  flap: {
    minGap: 40,
    play: ({ t, n }) => {
      t({ freq: 420, dur: 0.08, gain: 0.2, slideTo: 760 })
      n({ dur: 0.04, gain: 0.05, freq: 5000, filter: 'highpass' })
    },
  },
  point: {
    play: ({ t }) => {
      t({ freq: 988, type: 'square', dur: 0.07, gain: 0.14 })
      t({ freq: 1319, type: 'square', start: 0.07, dur: 0.22, gain: 0.14 })
    },
  },
  hit: {
    minGap: 200,
    play: ({ t, n }) => {
      n({ dur: 0.16, gain: 0.32, freq: 1500, filter: 'lowpass' })
      t({ freq: 170, type: 'sawtooth', dur: 0.22, gain: 0.26, slideTo: 60 })
    },
  },

  // ---- tetris
  move: { minGap: 20, play: ({ t }) => t({ freq: 300, type: 'triangle', dur: 0.025, gain: 0.08 }) },
  rotate: {
    minGap: 30,
    play: ({ t }) => t({ freq: 500, type: 'square', dur: 0.05, gain: 0.09, slideTo: 720 }),
  },
  lock: {
    minGap: 80,
    play: ({ t, n }) => {
      t({ freq: 150, dur: 0.09, gain: 0.3, slideTo: 70 })
      n({ dur: 0.04, gain: 0.08, freq: 800, filter: 'lowpass' })
    },
  },
  lineClear: {
    minGap: 200,
    play: ({ t }, { lines = 1 } = {}) => {
      const notes = 3 + Math.min(4, lines) * 2
      for (let i = 0; i < notes; i++) {
        t({ freq: hz(72 + i * 2 + (i % 2) * 2), type: 'square', start: i * 0.05, dur: 0.1, gain: 0.12 })
      }
      t({ freq: hz(96), start: notes * 0.05, dur: 0.4, gain: 0.12 })
    },
  },
  ceiling: {
    minGap: 300,
    play: ({ t, n }) => {
      n({ dur: 0.7, gain: 0.45, freq: 260, slideTo: 60, filter: 'lowpass' })
      t({ freq: 58, type: 'sawtooth', dur: 0.65, gain: 0.26, slideTo: 38 })
    },
  },
  warning: {
    minGap: 200,
    play: ({ t }) => {
      t({ freq: 880, type: 'square', dur: 0.07, gain: 0.1 })
      t({ freq: 880, type: 'square', start: 0.11, dur: 0.07, gain: 0.1 })
    },
  },

  // ---- typing
  key: {
    minGap: 10,
    play: ({ n }) => n({ dur: 0.014, gain: 0.1, freq: 3200 + Math.random() * 1200, q: 1.5 }),
  },
  typo: { minGap: 60, play: ({ t }) => t({ freq: 110, type: 'square', dur: 0.13, gain: 0.15 }) },

  // ---- the shop
  shopOpen: {
    minGap: 400,
    play: ({ t }) => {
      ;[72, 76, 79, 84, 88].forEach((note, i) => {
        t({ freq: hz(note), type: 'triangle', start: i * 0.07, dur: 0.22, gain: 0.2 })
        t({ freq: hz(note + 12), start: i * 0.07, dur: 0.16, gain: 0.06 })
      })
      t({ freq: hz(91), start: 0.38, dur: 0.5, gain: 0.14 })
    },
  },
}

/** Every sound name, for tests and tooling. */
export const SOUND_NAMES = Object.keys(SOUNDS)

/**
 * Plays a sound by name. `options` go to sounds that take them (e.g. `lineClear` takes `lines`).
 * Returns true if a sound was started.
 */
export function play(name, options = {}) {
  const sound = SOUNDS[name]
  if (!sound || muted) {
    return false
  }
  const ctx = getContext()
  if (!ctx) {
    return false
  }
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const last = lastPlayed.get(name)
  if (last !== undefined && now - last < (sound.minGap ?? DEFAULT_MIN_GAP_MS)) {
    return false
  }
  lastPlayed.set(name, now)
  if (ctx.state === 'suspended') {
    Promise.resolve(ctx.resume?.()).catch(() => {})
  }
  try {
    sound.play(api(ctx), options)
  } catch {
    return false // a sound must never break the game
  }
  return true
}
