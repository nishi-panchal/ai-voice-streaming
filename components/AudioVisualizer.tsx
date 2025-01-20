'use client'

import { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'

interface AudioVisualizerProps {
  isPlaying: boolean
  audioTrack: Track | null
}

export function AudioVisualizer({ isPlaying, audioTrack }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode>()
  const audioContextRef = useRef<AudioContext>()
  const sourceRef = useRef<MediaStreamAudioSourceNode>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create audio context if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const analyser = audioContextRef.current.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 512 // Increased for more bars
    analyser.smoothingTimeConstant = 0.8 // Smoother transitions
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    // Connect audio track to analyser if available
    if (audioTrack?.mediaStream) {
      console.log('Setting up audio track:', {
        id: audioTrack.sid,
        state: audioTrack.streamState,
        muted: audioTrack.isMuted
      })

      // Disconnect previous source if it exists
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }

      // Create and connect new source
      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioTrack.mediaStream)
      sourceRef.current.connect(analyser)

      // Attach track to audio element for playback
      const audioElement = audioTrack.attach()
      document.body.appendChild(audioElement)
      audioElement.style.display = 'none'
    }

    // Animation function
    const draw = () => {
      if (!canvas || !ctx || !analyser) return

      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(17, 24, 39)' // bg-gray-900
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5 // Adjusted for more bars
      let barHeight: number
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = isPlaying ? (dataArray[i] / 255) * canvas.height : 2

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#dc2626') // red-600
        gradient.addColorStop(1, '#ef4444') // red-500

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 3)
        ctx.fill()

        x += barWidth
      }
    }

    // Start animation
    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      // Clean up audio element
      if (audioTrack) {
        audioTrack.detach()
      }
    }
  }, [isPlaying, audioTrack])

  return (
    <div className="w-full h-32"> {/* Made taller */}
      <canvas
        ref={canvasRef}
        width={600} /* Increased resolution */
        height={128}
        className="w-full h-full rounded-lg"
      />
    </div>
  )
}

