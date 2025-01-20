'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading: boolean
  generatedText: string | null
}

export default function PromptInput({ onSubmit, isLoading, generatedText }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      onSubmit(prompt)
      setPrompt('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-md mx-auto mt-8"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Enter your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CC3743] bg-gray-800 text-white"
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 bg-[#CC3743] text-white rounded-lg shadow-md hover:bg-[#A02D36] transition-colors duration-300"
        >
          {isLoading ? 'Generating...' : 'Generate Voice'}
        </Button>
      </form>
      {generatedText && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-4 p-4 bg-gray-800 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-2 text-white">Generated Response:</h3>
          <p className="text-gray-300">{generatedText}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

