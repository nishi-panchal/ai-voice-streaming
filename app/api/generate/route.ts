import OpenAI from 'openai'
import { NextResponse } from 'next/server'

// Initialize OpenAI with explicit API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,  // Add ! to assert it exists
})

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key is missing' },
      { status: 500 }
    )
  }

  try {
    const { prompt } = await req.json()
    
    // Non-streaming response for debugging
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      stream: false, // Changed to false for debugging
    })

    const generatedText = response.choices[0].message.content
    
    return NextResponse.json({ text: generatedText })
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate text' },
      { status: 500 }
    )
  }
} 