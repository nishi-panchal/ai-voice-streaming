'use client'

import { useState } from 'react'

interface Voice {
  name: string
  value: string
}

const voices: Voice[] = [
  { name: 'Voice 1', value: 'voice1' },
  { name: 'Voice 2', value: 'voice2' },
  // Add more voices as needed
]

interface VoiceOptionsProps {
  // Remove the function prop and use an action ID instead
  defaultVoice?: string
}

export function VoiceOptions({ defaultVoice = voices[0].value }: VoiceOptionsProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(defaultVoice)

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice)
    // Dispatch a custom event instead of using a callback
    const event = new CustomEvent('voiceSelected', { detail: voice })
    window.dispatchEvent(event)
  }

  return (
    <div className="flex flex-col space-y-2">
      <label htmlFor="voice-select" className="text-sm font-medium text-gray-700">
        Select Voice
      </label>
      <select
        id="voice-select"
        value={selectedVoice}
        onChange={(e) => handleVoiceChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
      >
        {voices.map((voice) => (
          <option key={voice.value} value={voice.value}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  )
}

