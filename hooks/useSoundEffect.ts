"use client""use client"












































}  return { playBeep }  }    }      // fail silently    } catch (e) {      oscillator.stop(now + duration + 0.02)      oscillator.start(now)      gain.connect(ctx.destination)      oscillator.connect(gain)      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)      gain.gain.setValueAtTime(volume, now)      oscillator.frequency.setValueAtTime(frequency, now)      oscillator.type = type as OscillatorType      const gain = ctx.createGain()      const oscillator = ctx.createOscillator()      const now = ctx.currentTime      const ctx = ensureContext()    try {  } = {}) {    volume = 0.08,    type = "sine",    duration = 0.12,    frequency = 880,  function playBeep({  }    return ctxRef.current    }      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()    if (!ctxRef.current) {  function ensureContext() {  const ctxRef = useRef<AudioContext | null>(null)export default function useSoundEffect() {import { useRef } from "react"
import { useRef } from "react"

export default function useSoundEffect() {
  const ctxRef = useRef<AudioContext | null>(null)

  function ensureContext() {
    if (!ctxRef.current) {
      // Safari requires user gesture to resume; create lazily
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return ctxRef.current
  }

  function playBeep({
    frequency = 880,
    duration = 0.12,
    type = "sine",
    volume = 0.08,
  } = {}) {
    try {
      const ctx = ensureContext()
      const now = ctx.currentTime
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = type as OscillatorType
      oscillator.frequency.setValueAtTime(frequency, now)

      gain.gain.setValueAtTime(volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(now)
      oscillator.stop(now + duration + 0.02)
    } catch (e) {
      // fail silently if audio not available
      // console.debug('sound failed', e)
    }
  }

  return { playBeep }
}
