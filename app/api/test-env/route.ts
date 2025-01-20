import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  // Test token generation
  let tokenTest = "Failed"
  try {
    const at = new AccessToken(apiKey!, apiSecret!, {
      identity: "test-identity",
      ttl: 3600 // 1 hour
    })
    const token = at.toJwt()
    tokenTest = "Success"
  } catch (e) {
    tokenTest = `Error: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    config: {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      wsUrl,
    },
    tokenTest,
  })
} 