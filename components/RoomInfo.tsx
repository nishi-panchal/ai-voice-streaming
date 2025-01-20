'use client'

import { RemoteParticipant, Room } from 'livekit-client'

interface RoomInfoProps {
  roomName: string
  participants: RemoteParticipant[]
  room: Room | null
  isHost: boolean
}

export default function RoomInfo({ roomName, participants, room, isHost }: RoomInfoProps) {
  // Get all participants including local
  const allParticipants = room ? [
    {
      identity: room.localParticipant.identity,
      isLocal: true
    },
    ...participants.map(p => ({
      identity: p.identity,
      isLocal: false
    }))
  ] : [];

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 text-white">Room Info</h3>
      <p className="text-gray-300">Room Code: {roomName}</p>
      <p className="text-gray-300 mt-2">Role: {isHost ? 'Host' : 'Guest'}</p>
      <div className="mt-4">
        <h4 className="text-md font-medium text-white mb-2">Participants ({allParticipants.length})</h4>
        <ul className="space-y-1">
          {allParticipants.map((participant) => (
            <li 
              key={participant.identity} 
              className="text-gray-300 flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${participant.isLocal ? 'bg-green-500' : 'bg-blue-500'}`} />
              {participant.identity} {participant.isLocal ? '(You)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

