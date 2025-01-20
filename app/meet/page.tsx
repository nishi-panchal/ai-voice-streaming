import VoicePlayground from '@/components/VoicePlayground'
import Script from 'next/script'

export default function Meet() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.min.js" />
      <h1 className="text-4xl font-bold mb-8 text-white">AI Voice Playground</h1>
      <VoicePlayground />
    </main>
  )
}
