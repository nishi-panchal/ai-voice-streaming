'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction'
import { AudioVisualizer } from './AudioVisualizer'
import { Track, RemoteParticipant, RemoteTrackPublication } from 'livekit-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function VoicePlayground() {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [prompt, setPrompt] = useState('')
  const { 
    room, 
    isSpeaking,
    isLoading,
    generatedText,
    connectToRoom,
    generateVoice,
    getAudioTrack,
    participants 
  } = useVoiceInteraction()
  const [error, setError] = useState('')
  const [isHost, setIsHost] = useState(false)

  // Debug audio setup
  useEffect(() => {
    if (room) {
      console.log('Room state:', {
        localParticipant: {
          identity: room.localParticipant.identity,
          tracks: Array.from(room.localParticipant.getTrackPublications().values()).map(pub => ({
            kind: pub.kind,
            source: pub.source,
            sid: pub.trackSid
          }))
        },
        remoteParticipants: participants.map(p => ({
          identity: p.identity,
          tracks: Array.from(p.getTrackPublications().values()).map(pub => ({
            kind: pub.kind,
            source: pub.source,
            sid: pub.trackSid
          }))
        }))
      });
    }
  }, [room, participants]);

  const handleCreateOrJoinRoom = async () => {
    const code = roomCode || generateRoomCode()
    setError('')
    try {
      // Set host status based on whether we're creating a new room
      const isNewRoom = !roomCode
      setIsHost(isNewRoom)
      await connectToRoom(code, name)
      // Only set room code after successful connection
      setRoomCode(code)
    } catch (error) {
      console.error('Error creating/joining room:', error)
      setError(error instanceof Error ? error.message : 'Failed to join room')
    }
  }

  if (!room) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 min-h-screen flex items-center justify-center p-4 overflow-hidden"
      >
        {/* Animated background */}
        <motion.div 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800"
          animate={{
            background: [
              'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(31, 41, 55))',
              'linear-gradient(to bottom right, rgb(31, 41, 55), rgb(17, 24, 39))'
            ]
          }}
          transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
          <motion.div 
            className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </motion.div>
        
        <Card className="relative w-full max-w-md bg-black/20 backdrop-blur-xl border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              Meet
            </CardTitle>
            <CardDescription className="text-gray-300">Join or create a voice chat room</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-50 font-medium">Your Name</Label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800/50 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomCode" className="text-gray-50 font-medium">Room Code (Optional)</Label>
                <input
                  id="roomCode"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800/50 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to create new room"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateOrJoinRoom}
                disabled={!name}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {roomCode ? 'Join Room' : 'Create Room'}
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card className="bg-black/20 backdrop-blur-xl border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Room: {roomCode}</CardTitle>
                <CardDescription className="text-gray-400">
                  Share this code with others to join • {participants.length + 1} participant{participants.length + 1 !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button 
                onClick={() => {
                  room?.disconnect()
                }}
                variant="outline"
                className="text-gray-400 hover:text-gray-100"
              >
                Leave
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              {/* Participants Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Host Card */}
                <Card className="bg-black/20 backdrop-blur-xl border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={`https://api.dicebear.com/7.x/personas/svg?seed=${room?.localParticipant?.identity || ''}&backgroundColor=b6e3f4&mood=happy`} />
                          <AvatarFallback>{room?.localParticipant?.identity?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <Badge 
                          variant="success" 
                          className="absolute -bottom-1 -right-1 w-4 h-4 p-0 flex items-center justify-center"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white">{room?.localParticipant?.identity || 'Unknown'} (You)</p>
                        <Badge variant={isHost ? "secondary" : "outline"} className="text-gray-400">
                          {isHost ? 'Host' : 'Guest'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Guest Cards */}
                {participants.map((participant) => (
                  <Card key={participant.sid} className="bg-black/20 backdrop-blur-xl border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/personas/svg?seed=${participant.identity}&backgroundColor=b6e3f4&mood=happy`} />
                            <AvatarFallback>{participant.identity[0]}</AvatarFallback>
                          </Avatar>
                          <Badge 
                            variant="success" 
                            className="absolute -bottom-1 -right-1 w-4 h-4 p-0 flex items-center justify-center"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-white">{participant.identity}</p>
                          <Badge variant={!isHost ? "secondary" : "outline"} className="text-gray-400">
                            {!isHost ? 'Host' : 'Guest'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Audio Visualizer in its own card */}
              <Card className="bg-black/20 backdrop-blur-xl border-gray-800">
                <CardContent className="p-6">
                  <AudioVisualizer 
                    isPlaying={isSpeaking} 
                    audioTrack={isHost ? getAudioTrack() : (
                      participants
                        .find(p => !isHost)
                        ?.getTrackPublications()
                        .find(pub => pub.kind === Track.Kind.Audio)
                        ?.track || null
                    )}
                  />
                </CardContent>
              </Card>

              {/* Voice Input Section - Only show for host */}
              {isHost && (
                <Card className="bg-black/20 backdrop-blur-xl border-gray-800">
                  <CardContent className="p-6 space-y-4">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full px-3 py-2 border rounded-md bg-gray-800/50 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => generateVoice(prompt)}
                        disabled={!prompt || isSpeaking || isLoading}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Generating...' : isSpeaking ? 'Speaking...' : 'Generate Voice'}
                      </motion.button>
                    </div>
                    {generatedText && (
                      <div className="mt-4 p-4 bg-gray-800/50 rounded-md">
                        <p className="text-gray-300">{generatedText}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

