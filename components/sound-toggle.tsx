"use client"

import { useEffect, useState } from "react"
import { setSoundEnabled, isSoundEnabled, loadSoundPreference } from "@/lib/sound-service"
import { Button } from "@/components/ui/button"

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(true)

  useEffect(() => {
    try {
      loadSoundPreference()
    } catch (e) {
      // ignore
    }
    setEnabled(isSoundEnabled())
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try {
      setSoundEnabled(next)
    } catch (e) {
      // ignore
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} className="px-3">
      {enabled ? "Sound: On" : "Sound: Off"}
    </Button>
  )
}
