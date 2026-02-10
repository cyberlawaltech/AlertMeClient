import { useEffect } from "react"
import { playClickSound, playNotificationSound, playSuccessSound, playErrorSound, playProcessingSound, initializeSoundService, isSoundEnabled } from "@/lib/sound-service"

/**
 * Hook to initialize sound service on mount
 */
export function useSoundInitialization() {
  useEffect(() => {
    initializeSoundService().catch(console.error)
  }, [])
}

/**
 * Hook to play click sound
 */
export function useClickSound() {
  return () => {
    if (isSoundEnabled()) {
      playClickSound()
    }
  }
}

/**
 * Hook to play notification sound
 */
export function useNotificationSound() {
  return () => {
    if (isSoundEnabled()) {
      playNotificationSound()
    }
  }
}

/**
 * Hook to play success sound
 */
export function useSuccessSound() {
  return () => {
    if (isSoundEnabled()) {
      playSuccessSound()
    }
  }
}

/**
 * Hook to play error sound
 */
export function useErrorSound() {
  return () => {
    if (isSoundEnabled()) {
      playErrorSound()
    }
  }
}

/**
 * Hook to play processing sound
 */
export function useProcessingSound() {
  return () => {
    if (isSoundEnabled()) {
      playProcessingSound()
    }
  }
}
