import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roomName, userName } = body

    if (!roomName || !userName) {
      return NextResponse.json(
        { error: 'Missing roomName or userName' },
        { status: 400 }
      )
    }

    // Get credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    // Create a new token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userName,
      ttl: 3600 * 24, // 24 hours
    });

    // Grant permissions for the room
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate token
    const token = await at.toJwt()
    console.log('Generated token for:', { userName, roomName, tokenPreview: token.substring(0, 20) + '...' })

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Could not generate token' },
      { status: 500 }
    )
  }
}

