import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SOUND_NAMES,
  isSfxMuted,
  loadSfxPrefs,
  play,
  resetSfxEngine,
  setSfxMuted,
  subscribeSfx,
} from './sfx.js'

const PREFS_KEY = 'jeopardy-sfx-prefs-v1'

/** Just enough of the Web Audio API to see what a sound schedules. */
class FakeParam {
  constructor() {
    this.value = 0
    this.calls = []
  }
  setValueAtTime(value, time) {
    this.calls.push(['set', value, time])
  }
  exponentialRampToValueAtTime(value, time) {
    // Real browsers throw if an exponential ramp targets zero or less.
    if (!(value > 0)) {
      throw new RangeError(`exponential ramp to ${value}`)
    }
    this.calls.push(['ramp', value, time])
  }
}

class FakeNode {
  constructor(ctx, kind) {
    this.ctx = ctx
    this.kind = kind
    this.gain = new FakeParam()
    this.frequency = new FakeParam()
    this.Q = new FakeParam()
    this.connections = []
  }
  connect(target) {
    this.connections.push(target)
    return target
  }
  start(time) {
    this.startedAt = time
    this.ctx.started.push(this)
  }
  stop(time) {
    this.stoppedAt = time
  }
}

class FakeAudioContext {
  static instances = []
  constructor() {
    this.currentTime = 10
    this.sampleRate = 8000
    this.state = 'running'
    this.destination = { kind: 'destination' }
    this.started = []
    this.resumed = 0
    FakeAudioContext.instances.push(this)
  }
  createGain() {
    return new FakeNode(this, 'gain')
  }
  createDynamicsCompressor() {
    return new FakeNode(this, 'compressor')
  }
  createOscillator() {
    return new FakeNode(this, 'oscillator')
  }
  createBiquadFilter() {
    return new FakeNode(this, 'filter')
  }
  createBufferSource() {
    return new FakeNode(this, 'bufferSource')
  }
  createBuffer(channels, length) {
    return { length, getChannelData: () => new Float32Array(length) }
  }
  resume() {
    this.resumed += 1
    this.state = 'running'
    return Promise.resolve()
  }
}

const lastContext = () => FakeAudioContext.instances[FakeAudioContext.instances.length - 1]
let clock = 0

describe('sound effects', () => {
  beforeEach(() => {
    localStorage.clear()
    FakeAudioContext.instances = []
    vi.stubGlobal('AudioContext', FakeAudioContext)
    window.AudioContext = FakeAudioContext
    resetSfxEngine()
    loadSfxPrefs()
    // Each test starts well after the last one so nothing is "played a moment ago".
    clock += 10000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete window.AudioContext
  })

  it('has a good spread of sounds for the board, shop and every mini game', () => {
    for (const name of [
      'tile', 'correct', 'wrong', 'dailyDouble', 'fanfare', 'win', 'lose', 'coin',
      'shopOpen', 'ticket', 'card', 'ballTick', 'ballLand', 'reelStop', 'jackpot',
      'eat', 'crash', 'flap', 'point', 'hit', 'rotate', 'lock', 'lineClear', 'ceiling', 'key', 'typo',
    ]) {
      expect(SOUND_NAMES).toContain(name)
    }
    expect(SOUND_NAMES.length).toBeGreaterThanOrEqual(30)
  })

  describe('playing', () => {
    it('starts a sound and reports it', () => {
      expect(play('correct')).toBe(true)
      expect(lastContext().started.length).toBeGreaterThan(0)
    })

    it('creates the audio context only when the first sound plays', () => {
      expect(FakeAudioContext.instances).toHaveLength(0)
      play('tick')
      expect(FakeAudioContext.instances).toHaveLength(1)
      clock += 1000
      play('tick')
      expect(FakeAudioContext.instances).toHaveLength(1)
    })

    it('routes everything through one master gain and a compressor to the speakers', () => {
      play('win')
      const ctx = lastContext()
      const osc = ctx.started.find((node) => node.kind === 'oscillator')
      const envelope = osc.connections[0]
      const master = envelope.connections[0]
      expect(master.kind).toBe('gain')
      const compressor = master.connections[0]
      expect(compressor.kind).toBe('compressor')
      expect(compressor.connections[0]).toBe(ctx.destination)
    })

    it('ignores a name it does not know', () => {
      expect(play('nonsense')).toBe(false)
      expect(FakeAudioContext.instances).toHaveLength(0)
    })

    it('does nothing when the browser has no Web Audio', () => {
      delete window.AudioContext
      vi.unstubAllGlobals()
      resetSfxEngine()
      expect(play('coin')).toBe(false)
    })

    it('wakes a suspended audio context (browsers start them paused)', () => {
      play('tick')
      lastContext().state = 'suspended'
      clock += 1000
      play('tick')
      expect(lastContext().resumed).toBe(1)
    })

    it('never throws if the browser rejects a sound', () => {
      play('tick')
      lastContext().createOscillator = () => {
        throw new Error('audio device lost')
      }
      clock += 1000
      expect(() => play('tick')).not.toThrow()
      expect(play('coin')).toBe(false)
    })
  })

  describe('every sound', () => {
    it.each(SOUND_NAMES)('%s plays, schedules in the future and stops itself', (name) => {
      expect(play(name, { lines: 4 })).toBe(true)
      const ctx = lastContext()
      expect(ctx.started.length).toBeGreaterThan(0)
      for (const node of ctx.started) {
        expect(node.startedAt).toBeGreaterThanOrEqual(ctx.currentTime)
        expect(node.stoppedAt).toBeGreaterThan(node.startedAt)
        // Nothing should drone on: every sound is over within a few seconds.
        expect(node.stoppedAt - ctx.currentTime).toBeLessThan(4)
      }
    })
  })

  describe('not spamming', () => {
    it('drops the same sound played again straight away', () => {
      expect(play('correct')).toBe(true)
      expect(play('correct')).toBe(false)
      clock += 500
      expect(play('correct')).toBe(true)
    })

    it('lets different sounds overlap', () => {
      expect(play('correct')).toBe(true)
      expect(play('coin')).toBe(true)
    })

    it('lets quick sounds like keystrokes and ball ticks repeat fast', () => {
      expect(play('key')).toBe(true)
      clock += 15
      expect(play('key')).toBe(true)
      expect(play('ballTick')).toBe(true)
      clock += 20
      expect(play('ballTick')).toBe(true)
    })

    it('blocks a double fire from the same instant (like React strict mode)', () => {
      expect(play('shopOpen')).toBe(true)
      expect(play('shopOpen')).toBe(false)
    })
  })

  describe('options', () => {
    it('plays a longer flourish for more cleared lines', () => {
      play('lineClear', { lines: 1 })
      const one = lastContext().started.length
      clock += 1000
      play('lineClear', { lines: 4 })
      const four = lastContext().started.length - one
      expect(four).toBeGreaterThan(one)
    })
  })

  describe('muting', () => {
    it('makes no sound while muted, and plays again when unmuted', () => {
      setSfxMuted(true)
      expect(isSfxMuted()).toBe(true)
      expect(play('correct')).toBe(false)
      expect(FakeAudioContext.instances).toHaveLength(0)

      clock += 1000
      setSfxMuted(false)
      expect(isSfxMuted()).toBe(false)
      clock += 1000
      expect(play('correct')).toBe(true)
    })

    it('plays a small tick when sound is switched back on', () => {
      setSfxMuted(true)
      setSfxMuted(false)
      expect(lastContext().started.length).toBeGreaterThan(0)
    })

    it('remembers the choice', () => {
      setSfxMuted(true)
      expect(JSON.parse(localStorage.getItem(PREFS_KEY))).toEqual({ muted: true })
      setSfxMuted(false)
      expect(JSON.parse(localStorage.getItem(PREFS_KEY))).toEqual({ muted: false })
    })

    it('starts with sound on, and loads a saved mute', () => {
      expect(isSfxMuted()).toBe(false)
      localStorage.setItem(PREFS_KEY, JSON.stringify({ muted: true }))
      loadSfxPrefs()
      expect(isSfxMuted()).toBe(true)
    })

    it('shrugs off broken saved data', () => {
      localStorage.setItem(PREFS_KEY, '{not json')
      loadSfxPrefs()
      expect(isSfxMuted()).toBe(false)
    })

    it('tells listeners when the setting changes, until they unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSfx(listener)
      setSfxMuted(true)
      expect(listener).toHaveBeenCalledTimes(1)
      unsubscribe()
      setSfxMuted(false)
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
