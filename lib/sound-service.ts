/**
 * Sound Service
 * Manages audio playback for notifications, transactions, and button clicks
 */

export type SoundType = "click" | "notification" | "success" | "error" | "processing"

interface SoundConfig {
  type: SoundType
  volume?: number
  loop?: boolean
}

// Base64 encoded audio files (minimal beep sounds)
const SOUND_DATA: Record<SoundType, string> = {
  // Click sound - simple beep
  click:
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",

  // Notification sound - double beep
  notification:
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",

  // Success sound - ascending tones
  success:
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",

  // Error sound - low tone
  error:
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",

  // Processing sound - startup tone
  processing:
    "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
}

let audioContextInstance: AudioContext | null = null
let audioBuffers: Map<SoundType, AudioBuffer> = new Map()
let isInitialized = false

/**
 * Get or create the AudioContext
 */
function getAudioContext(): AudioContext {
  if (!audioContextInstance) {
    audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContextInstance
}

/**
 * Generate a simple beep sound using Web Audio API
 */
async function generateBeep(frequency: number, duration: number, type: SoundType): Promise<AudioBuffer> {
  const audioContext = getAudioContext()
  const sampleRate = audioContext.sampleRate
  const frameCount = (sampleRate * duration) / 1000
  const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate)
  const data = audioBuffer.getChannelData(0)

  const omega = (2 * Math.PI * frequency) / sampleRate
  for (let i = 0; i < frameCount; i++) {
    // Fade in/out to avoid clicks
    const t = i / frameCount
    const envelope = Math.sin(t * Math.PI) // Simple envelope

    data[i] = Math.sin(i * omega) * envelope * 0.3 // Volume: 0.3
  }

  return audioBuffer
}

/**
 * Initialize the sound service
 */
export async function initializeSoundService(): Promise<void> {
  if (isInitialized) return

  try {
    const audioContext = getAudioContext()
    // Attempt to load packaged audio files from public/sounds/*
    const PUBLIC_SOUNDS: Partial<Record<SoundType, string>> = {
      notification: "/sounds/notification.wav",
      click: "/sounds/click.wav",
    }

    for (const [type, url] of Object.entries(PUBLIC_SOUNDS)) {
      try {
        const resp = await fetch(url as string)
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer()
          const decoded = await audioContext.decodeAudioData(arrayBuffer)
          audioBuffers.set(type as SoundType, decoded)
        }
      } catch (e) {
        // ignore and fallback to synthetic generation
      }
    }

    // Generate synthetic sounds for better cross-browser compatibility
    const sounds: Record<SoundType, { frequency: number; duration: number }> = {
      click: { frequency: 800, duration: 100 },
      notification: { frequency: 1000, duration: 200 },
      success: { frequency: 1200, duration: 300 },
      error: { frequency: 400, duration: 300 },
      processing: { frequency: 600, duration: 150 },
    }

    for (const [soundType, config] of Object.entries(sounds) as Array<
      [SoundType, { frequency: number; duration: number }]
    >) {
      const buffer = await generateBeep(config.frequency, config.duration, soundType)
      audioBuffers.set(soundType, buffer)
    }

    isInitialized = true
  } catch (error) {
    console.error("Failed to initialize sound service:", error)
    isInitialized = false
  }
}

/**
 * Play a sound
 */
export async function playSound(config: SoundConfig | SoundType): Promise<void> {
  try {
    // Resume audio context if suspended (required for autoplay)
    const audioContext = getAudioContext()
    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const soundConfig: SoundConfig = typeof config === "string" ? { type: config } : config
    const { type, volume = 0.3, loop = false } = soundConfig

    let audioBuffer = audioBuffers.get(type)

    // Generate buffer if not already created
    if (!audioBuffer) {
      await initializeSoundService()
      audioBuffer = audioBuffers.get(type)
    }

    if (!audioBuffer) {
      console.warn(`Sound buffer not found for type: ${type}`)
      return
    }

    // Create and start the oscillator
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    // Set frequency based on sound type
    const frequencies: Record<SoundType, number> = {
      click: 800,
      notification: 1000,
      success: 1200,
      error: 400,
      processing: 600,
    }

    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime)
    oscillator.type = "sine"

    const durations: Record<SoundType, number> = {
      click: 0.1,
      notification: 0.2,
      success: 0.3,
      error: 0.3,
      processing: 0.15,
    }

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + durations[type])
  } catch (error) {
    console.error("Error playing sound:", error)
  }
}

/**
 * Utility function to play click sound
 */
export function playClickSound(): void {
  playSound("click").catch(console.error)
}

/**
 * Utility function to play notification sound
 */
export function playNotificationSound(): void {
  playSound("notification").catch(console.error)
}

/**
 * Utility function to play success sound
 */
export function playSuccessSound(): void {
  playSound("success").catch(console.error)
}

/**
 * Utility function to play error sound
 */
export function playErrorSound(): void {
  playSound("error").catch(console.error)
}

/**
 * Utility function to play processing sound
 */
export function playProcessingSound(): void {
  playSound("processing").catch(console.error)
}

/**
 * Enable or disable sound globally
 */
let soundEnabled = true

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
  localStorage.setItem("sound-enabled", JSON.stringify(enabled))
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

/**
 * Load sound preference from local storage
 */
export function loadSoundPreference(): void {
  const saved = localStorage.getItem("sound-enabled")
  if (saved !== null) {
    soundEnabled = JSON.parse(saved)
  }
}
