import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const cleanText = text
      .replace(/ORDER_RECEIPT_START[\s\S]*?ORDER_RECEIPT_END/g, '')
      .replace(/[*_~`]/g, '')
      .trim()

    console.log('ElevenLabs API Key present:', !!ELEVENLABS_API_KEY)
    console.log('Key prefix:', ELEVENLABS_API_KEY?.substring(0, 8))

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    )

    console.log('ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs error body:', errorText)
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      }
    })
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}