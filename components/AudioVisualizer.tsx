'use client'

import { useEffect, useRef } from 'react'
import { Track, LocalAudioTrack, RemoteTrack } from 'livekit-client'

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
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext()
      console.log('Created new AudioContext')
    }

    const analyser = audioContextRef.current.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 256 // Reduced for better performance
    analyser.smoothingTimeConstant = 0.6 // More responsive

    // Connect audio source based on track
    if (audioTrack?.mediaStream) {
      try {
        // Always resume context
        audioContextRef.current.resume().catch(console.error)

        // Disconnect previous source if exists
        if (sourceRef.current) {
          sourceRef.current.disconnect()
        }

        // Create and connect new source from the track's media stream
        sourceRef.current = audioContextRef.current.createMediaStreamSource(audioTrack.mediaStream)
        sourceRef.current.connect(analyser)

        // For remote tracks (guests), connect to destination for playback
        if (audioTrack instanceof RemoteTrack) {
          // Create a gain node to control volume
          const gainNode = audioContextRef.current.createGain()
          gainNode.gain.value = 1.0 // Adjust volume as needed
          
          sourceRef.current.connect(gainNode)
          gainNode.connect(audioContextRef.current.destination)
          
          console.log('Connected remote track to audio output');
        }

        console.log('Audio setup complete:', {
          contextState: audioContextRef.current.state,
          isRemoteTrack: audioTrack instanceof RemoteTrack,
          isLocalTrack: audioTrack instanceof LocalAudioTrack,
          mediaStreamActive: audioTrack.mediaStream.active,
          analyzerConnected: true
        })

      } catch (error) {
        console.error('Error setting up audio visualization:', error)
      }
    }

    // Modified animation function for better visibility
    const draw = () => {
      if (!canvas || !ctx || !analyser) return

      animationFrameRef.current = requestAnimationFrame(draw)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)

      // Clear with semi-transparent background for trail effect
      ctx.fillStyle = 'rgba(17, 24, 39, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        // Amplify the visualization
        const barHeight = isPlaying ? 
          Math.max((dataArray[i] / 255) * canvas.height * 1.5, 4) : 
          2

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#dc2626')
        gradient.addColorStop(1, '#ef4444')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 3)
        ctx.fill()

        x += barWidth
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
    }
  }, [isPlaying, audioTrack])

  return (
    <div className="w-full h-32">
      <canvas
        ref={canvasRef}
        width={600}
        height={128}
        className="w-full h-full rounded-lg"
      />
    </div>
  )
}

