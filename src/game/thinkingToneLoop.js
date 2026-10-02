/** Classic game-show “thinking” interval (Hz), low volume square-ish tone. */
const THINKING_HZ = [440, 554.37, 659.25, 554.37, 440]

const NOTE_MS = 520
const GAP_MS = 40

/**
 * @returns {{ start: () => void, stop: () => void, setGain: (level: number) => void }}
 */
export function createThinkingToneLoop() {
  let audioContext = null
  let masterGain = null
  let timerId = null
  let noteIndex = 0
  let running = false

  function ensureContext() {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) {
        return null
      }
      audioContext = new Ctx()
      masterGain = audioContext.createGain()
      masterGain.gain.value = 0.08
      masterGain.connect(audioContext.destination)
    }
    return audioContext
  }

  function playNote() {
    const ctx = ensureContext()
    if (!ctx || !masterGain || !running) {
      return
    }
    const hz = THINKING_HZ[noteIndex % THINKING_HZ.length]
    noteIndex += 1

    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = hz
    const t = ctx.currentTime
    noteGain.gain.setValueAtTime(0.0001, t)
    noteGain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, t + NOTE_MS / 1000)
    osc.connect(noteGain)
    noteGain.connect(masterGain)
    osc.start(t)
    osc.stop(t + NOTE_MS / 1000 + 0.05)
  }

  function schedule() {
    if (!running) {
      return
    }
    playNote()
    timerId = window.setTimeout(schedule, NOTE_MS + GAP_MS)
  }

  return {
    start() {
      if (running) {
        return
      }
      running = true
      noteIndex = 0
      const ctx = ensureContext()
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      schedule()
    },
    stop() {
      running = false
      if (timerId !== null) {
        window.clearTimeout(timerId)
        timerId = null
      }
    },
    setGain(level) {
      if (masterGain) {
        masterGain.gain.value = Math.max(0, Math.min(1, level))
      }
    },
  }
}
