'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface VoiceOptionsProps {
  onSelectVoice: (voice: string) => void
}

const voices = [
  { id: 'adam', name: 'Adam' },
  { id: 'bella', name: 'Bella' },
  { id: 'charlie', name: 'Charlie' },
]

export default function VoiceOptions({ onSelectVoice }: VoiceOptionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-wrap justify-center gap-4 mt-8"
    >
      {voices.map((voice) => (
        <motion.div key={voice.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => onSelectVoice(voice.id)}
            className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-300"
          >
            {voice.name}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  )
}

