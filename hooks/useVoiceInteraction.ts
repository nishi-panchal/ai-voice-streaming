'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  Room, 
  RoomEvent, 
  LocalTrack, 
  Track, 
  RemoteParticipant,
  createLocalAudioTrack,
  TrackEvent,
  LocalAudioTrack,
  ConnectionState,
  Participant,
  RemoteTrackPublication
} from 'livekit-client'

export function useVoiceInteraction() {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [audioTrack, setAudioTrack] = useState<LocalTrack | null>(null)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mainGainRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const audioTrackRef = useRef<LocalAudioTrack | null>(null)

  // Initialize audio context and nodes
  const initAudioContext = () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext()
      }

      if (!destinationRef.current && audioContextRef.current) {
        destinationRef.current = audioContextRef.current.createMediaStreamDestination()
      }

      if (!compressorRef.current && audioContextRef.current) {
        compressorRef.current = audioContextRef.current.createDynamicsCompressor()
        compressorRef.current.threshold.value = -50
        compressorRef.current.knee.value = 40
        compressorRef.current.ratio.value = 12
        compressorRef.current.attack.value = 0
        compressorRef.current.release.value = 0.25
      }

      if (!mainGainRef.current && audioContextRef.current) {
        mainGainRef.current = audioContextRef.current.createGain()
        mainGainRef.current.gain.value = 1.2
      }

      // Connect nodes if all exist
      if (mainGainRef.current && compressorRef.current && destinationRef.current && audioContextRef.current) {
        mainGainRef.current.connect(compressorRef.current)
        compressorRef.current.connect(destinationRef.current)
        compressorRef.current.connect(audioContextRef.current.destination)

        // Resume context if suspended
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(console.error)
        }

        return {
          context: audioContextRef.current,
          destination: destinationRef.current,
          compressor: compressorRef.current,
          mainGain: mainGainRef.current
        }
      }

      throw new Error('Failed to initialize all audio nodes')
    } catch (error) {
      console.error('Error initializing audio context:', error)
      throw new Error('Failed to initialize audio context')
    }
  }

  // Enhanced participant update
  const updateParticipants = useCallback((room: Room) => {
    if (!room) return
    
    const remoteParticipants = Array.from(room.remoteParticipants.values())
    console.log('Updating participants:', {
      total: remoteParticipants.length,
      local: room.localParticipant?.identity,
      identities: remoteParticipants.map(p => p.identity)
    })
    
    setParticipants(remoteParticipants)
  }, [])

  // Track all participants
  useEffect(() => {
    if (!room) return

    // Initial update
    updateParticipants(room)

    // Track participant changes
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', {
        identity: participant.identity,
        sid: participant.sid
      })
      updateParticipants(room)

      // Subscribe to participant's tracks
      participant.on(RoomEvent.TrackPublished, (publication) => {
        console.log('Track published by participant:', {
          kind: publication.kind,
          sid: publication.trackSid,
          participant: participant.identity
        })
        if (publication.kind === Track.Kind.Audio) {
          publication.setSubscribed(true)
        }
      })
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', {
        identity: participant.identity,
        sid: participant.sid
      })
      updateParticipants(room)
    })

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', {
        kind: track.kind,
        source: track.source,
        sid: track.sid,
        participant: participant.identity
      })
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', {
        kind: track.kind,
        source: track.source,
        sid: track.sid,
        participant: participant.identity
      })
    })

    // Subscribe to existing participants' tracks
    Array.from(room.remoteParticipants.values()).forEach((participant: RemoteParticipant) => {
      participant.on(RoomEvent.TrackPublished, (publication) => {
        console.log('Track published by existing participant:', {
          kind: publication.kind,
          sid: publication.trackSid,
          participant: participant.identity
        })
        if (publication.kind === Track.Kind.Audio) {
          publication.setSubscribed(true)
        }
      })
    })

    return () => {
      room.removeAllListeners()
    }
  }, [room, updateParticipants])

  const connectToRoom = useCallback(async (roomName: string, userName: string) => {
    if (!roomName || !userName) {
      throw new Error('Room name and user name are required')
    }

    try {
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured')
      }

      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, userName })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'Failed to get token')
      }

      const { token } = await response.json()
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true
      })
      
      try {
        await newRoom.connect(livekitUrl, token)

        setRoom(newRoom)
        updateParticipants(newRoom)

        // Initialize audio context after room connection
        initAudioContext()
      } catch (connectionError) {
        console.error('Room connection error:', connectionError)
        throw new Error('Failed to connect to room')
      }
    } catch (error) {
      console.error('Error joining room:', error)
      throw error
    }
  }, [updateParticipants])

  const speak = useCallback(async (text: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
    }

    // Add event listeners to track speech status
    utterance.onstart = () => {
      console.log('Started speaking')
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      console.log('Finished speaking')
      setIsSpeaking(false)
    }

    // Use a promise to ensure speech completes
    await new Promise((resolve, reject) => {
      utterance.onend = resolve
      utterance.onerror = reject
      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const generateVoice = useCallback(async (prompt: string) => {
    if (!room || !prompt) {
      throw new Error('Room or prompt is missing')
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'Failed to generate voice')
      }

      const data = await response.json()
      setGeneratedText(data.text)
      await speak(data.text)
    } catch (error) {
      console.error('Error generating voice:', error)
      throw error
    } finally {
      setIsLoading(false)
      setIsSpeaking(false)
    }
  }, [room, speak])

  // Clean up audio resources
  useEffect(() => {
    return () => {
      if (audioTrackRef.current) {
        audioTrackRef.current.stop()
        audioTrackRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (destinationRef.current) {
        destinationRef.current.disconnect()
        destinationRef.current = null
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
    }
  }, [])

  // Separate cleanup for room disconnection
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [room])

  const handleJoinRoom = useCallback(async (name: string, roomCode: string) => {
    try {
      const response = await fetch('/api/livekit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomCode, participantName: name })
      })

      if (!response.ok) {
        throw new Error('Failed to get token')
      }

      const { token } = await response.json()
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true
      })
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token)
      setRoom(newRoom)
      updateParticipants(newRoom)
      initAudioContext()
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }, [updateParticipants])

  const handleLeaveRoom = useCallback(() => {
    if (room) {
      room.disconnect()
      setRoom(null)
    }
  }, [room])

  const handleSubmit = useCallback(async (prompt: string) => {
    if (!room || !prompt) return

    try {
      setIsSpeaking(true)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        throw new Error('Failed to generate voice')
      }

      const data = await response.json()
      // Handle voice generation and streaming here
      setIsSpeaking(false)
    } catch (error) {
      console.error('Error generating voice:', error)
      setIsSpeaking(false)
    }
  }, [room])

  const getAudioTrack = useCallback(() => {
    if (!room?.localParticipant) return null
    
    const audioPublication = Array.from(room.localParticipant.getTrackPublications().values())
      .find(pub => pub.kind === Track.Kind.Audio)
    
    return audioPublication?.track || null
  }, [room])

  return {
    connectToRoom,
    generateVoice,
    isLoading,
    generatedText,
    room,
    participants,
    isSpeaking,
    handleJoinRoom,
    handleLeaveRoom,
    handleSubmit,
    getAudioTrack
  }
}

