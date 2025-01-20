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
  createLocalTracks,
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
  const [isHost, setIsHost] = useState(false)

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
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', {
        identity: participant.identity,
        sid: participant.sid
      })
      updateParticipants(room)
    })

    // Handle track subscription
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', {
        kind: track.kind,
        source: track.source,
        sid: track.sid,
        participant: participant.identity
      })

      // For guests, handle audio playback
      if (!isHost && track.kind === Track.Kind.Audio) {
        const audioElement = new Audio();
        track.attach(audioElement);
        audioElement.play().catch(error => {
          console.error('Error playing audio:', error);
        });
        console.log('Attached and playing audio track');
      }
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', {
        kind: track.kind,
        source: track.source,
        sid: track.sid,
        participant: participant.identity
      })
      // Detach track when unsubscribed
      track.detach();
    })

    // Auto-subscribe to audio tracks for guests
    if (!isHost) {
      Array.from(room.remoteParticipants.values()).forEach((participant: RemoteParticipant) => {
        participant.on(RoomEvent.TrackPublished, (publication) => {
          if (publication.kind === Track.Kind.Audio && publication instanceof RemoteTrackPublication) {
            publication.setSubscribed(true);
            console.log('Auto-subscribing to audio track:', {
              participant: participant.identity,
              track: publication.trackSid
            });
          }
        });

        // Subscribe to existing tracks
        participant.getTrackPublications().forEach(publication => {
          if (publication.kind === Track.Kind.Audio && publication instanceof RemoteTrackPublication) {
            publication.setSubscribed(true);
            if (publication.track) {
              const audioElement = new Audio();
              publication.track.attach(audioElement);
              audioElement.play().catch(console.error);
              console.log('Attached existing audio track');
            }
          }
        });
      });
    }

    return () => {
      room.removeAllListeners()
    }
  }, [room, updateParticipants, isHost])

  const connectToRoom = useCallback(async (roomName: string, userName: string) => {
    if (!roomName || !userName) {
      throw new Error('Room name and user name are required')
    }

    try {
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured')
      }

      // Request audio playback permission early
      try {
        // Create and play a short audio to trigger permission prompt
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        oscillator.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        await audioContext.resume();
        console.log('Audio context initialized and permission granted');
      } catch (error) {
        console.error('Error requesting audio permission:', error);
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
      
      // Disconnect from any existing room
      if (room) {
        room.disconnect();
        setRoom(null);
      }

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false
        }
      })

      console.log('Connecting to room:', {
        url: livekitUrl,
        name: roomName,
        user: userName
      });
      
      try {
        await newRoom.connect(livekitUrl, token, {
          autoSubscribe: true
        })

        // Set host status based on whether we're creating a new room
        const isNewHost = newRoom.remoteParticipants.size === 0
        setIsHost(isNewHost)

        // For guests, subscribe to all audio tracks immediately
        if (!isNewHost) {
          Array.from(newRoom.remoteParticipants.values()).forEach(participant => {
            participant.getTrackPublications().forEach(publication => {
              if (publication.kind === Track.Kind.Audio && publication instanceof RemoteTrackPublication) {
                const track = publication.track;
                if (track) {
                  const audioElement = new Audio();
                  track.attach(audioElement);
                  audioElement.play().catch(console.error);
                  console.log('Attached initial audio track:', {
                    participant: participant.identity,
                    track: publication.trackSid
                  });
                }
              }
            });
          });
        }

        // Initialize audio context after room connection
        const audioContext = initAudioContext()
        
        // For guests, ensure audio playback is enabled
        if (!isNewHost) {
          await audioContext.context.resume()
          console.log('Audio context resumed for guest');
        }

        setRoom(newRoom)
        updateParticipants(newRoom)

      } catch (connectionError) {
        console.error('Room connection error:', connectionError)
        throw new Error('Failed to connect to room')
      }
    } catch (error) {
      console.error('Error joining room:', error)
      throw error
    }
  }, [room, updateParticipants, initAudioContext])

  // Also update the track subscription handler
  useEffect(() => {
    if (!room) return

    const handleTrackPublished = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (publication.kind === Track.Kind.Audio && !isHost) {
        // Attach the track to an audio element for playback
        const track = publication.track;
        if (track) {
          const audioElement = new Audio();
          track.attach(audioElement);
          audioElement.play().catch(console.error);
          console.log('Attached audio track for playback:', {
            participant: participant.identity,
            track: publication.trackSid,
            isSubscribed: publication.isSubscribed
          });
        }
      }
    };

    // Subscribe to all existing tracks
    room.remoteParticipants.forEach(participant => {
      participant.on(RoomEvent.TrackPublished, (pub) => {
        if (pub instanceof RemoteTrackPublication) {
          handleTrackPublished(pub, participant);
        }
      });

      // Also handle any existing tracks
      participant.getTrackPublications().forEach(pub => {
        if (pub instanceof RemoteTrackPublication) {
          handleTrackPublished(pub, participant);
        }
      });
    });

    // Subscribe to new participants' tracks
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      participant.on(RoomEvent.TrackPublished, (pub) => {
        if (pub instanceof RemoteTrackPublication) {
          handleTrackPublished(pub, participant);
        }
      });
    });

    return () => {
      room.removeAllListeners(RoomEvent.ParticipantConnected);
      room.remoteParticipants.forEach(participant => {
        participant.removeAllListeners(RoomEvent.TrackPublished);
      });
    };
  }, [room, isHost]);

  const speak = useCallback(async (text: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported')
      return
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Initialize audio context and nodes
      const { context, destination, mainGain } = initAudioContext()
      
      // Create a new audio track for publishing
      if (audioTrackRef.current) {
        await room?.localParticipant?.unpublishTrack(audioTrackRef.current)
        audioTrackRef.current.stop()
        audioTrackRef.current = null
      }

      // Create audio track with voice optimized settings
      audioTrackRef.current = await createLocalTracks({
        audio: {
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false
        }
      }).then(tracks => tracks[0] as LocalAudioTrack);

      // Publish track with voice optimized settings
      if (room?.localParticipant && audioTrackRef.current) {
        console.log('Publishing audio track:', {
          trackId: audioTrackRef.current.sid,
          trackName: 'synthesized_speech'
        })
        
        await room.localParticipant.publishTrack(audioTrackRef.current, {
          name: 'synthesized_speech',
          source: Track.Source.Microphone,
          dtx: true, // Enable DTX for voice
          red: true, // Enable redundancy for better quality
          simulcast: false // Disable simulcast since it's voice only
        })
      }

      // Add event listeners for speech
      utterance.onstart = () => {
        console.log('Started speaking')
        setIsSpeaking(true)
      }

      utterance.onend = async () => {
        console.log('Finished speaking')
        setIsSpeaking(false)
        
        // Cleanup track after speech
        if (audioTrackRef.current) {
          try {
            await room?.localParticipant?.unpublishTrack(audioTrackRef.current)
            audioTrackRef.current.stop()
            audioTrackRef.current = null
          } catch (error) {
            console.error('Error unpublishing track:', error)
          }
        }
      }

      // Speak the text
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Error in speak function:', error)
      setIsSpeaking(false)
    }
  }, [room, initAudioContext])

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

  const handleLeaveRoom = useCallback(() => {
    if (room) {
      room.disconnect()
      setRoom(null)
      setIsHost(false)
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
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
    if (!room) return null;

    if (isHost) {
      // For host: get local track
      const publications = room.localParticipant?.getTrackPublications();
      if (!publications) return null;
      
      const audioPublication = Array.from(publications.values())
        .find((pub) => pub.kind === Track.Kind.Audio);
      
      console.log('Host audio track:', {
        found: !!audioPublication?.track,
        kind: audioPublication?.kind,
        source: audioPublication?.source,
        name: audioPublication?.trackName,
        sid: audioPublication?.trackSid
      });
      return audioPublication?.track || null;
    } else {
      // For guest: get remote track from host
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      console.log('Looking for remote tracks:', {
        participants: remoteParticipants.map(p => ({
          identity: p.identity,
          tracks: Array.from(p.getTrackPublications()).map(t => ({
            kind: t.kind,
            source: t.source,
            name: t.trackName,
            sid: t.trackSid,
            isSubscribed: t.isSubscribed
          }))
        }))
      });
      
      for (const participant of remoteParticipants) {
        const publications = participant.getTrackPublications();
        const audioPublication = Array.from(publications.values())
          .find((pub) => pub.kind === Track.Kind.Audio);

        if (audioPublication?.track) {
          console.log('Found remote audio track:', {
            participant: participant.identity,
            track: audioPublication.trackSid,
            source: audioPublication.source,
            name: audioPublication.trackName,
            isSubscribed: audioPublication.isSubscribed
          });
          
          // Ensure track is subscribed and playable
          if (audioPublication instanceof RemoteTrackPublication) {
            if (!audioPublication.isSubscribed) {
              console.log('Subscribing to track:', audioPublication.trackSid);
              audioPublication.setSubscribed(true);
            }
            
            // Enable audio playback by attaching to an audio element
            const track = audioPublication.track;
            if (track) {
              const audioElement = new Audio();
              track.attach(audioElement);
              audioElement.play().catch(console.error);
              console.log('Created and attached audio element for playback');
            }
          }
          
          return audioPublication.track;
        }
      }
      console.log('No audio track found in remote participants');
      return null;
    }
  }, [room, isHost]);

  // Add cleanup for audio elements
  useEffect(() => {
    return () => {
      // Clean up any attached audio elements
      if (room && !isHost) {
        const remoteParticipants = Array.from(room.remoteParticipants.values());
        for (const participant of remoteParticipants) {
          const publications = participant.getTrackPublications();
          const audioPublication = Array.from(publications.values())
            .find((pub) => pub.kind === Track.Kind.Audio);
          
          if (audioPublication?.track) {
            audioPublication.track.detach();
          }
        }
      }
    };
  }, [room, isHost]);

  return {
    connectToRoom,
    generateVoice,
    isLoading,
    generatedText,
    room,
    participants,
    isSpeaking,
    handleLeaveRoom,
    handleSubmit,
    getAudioTrack,
    isHost
  }
}

