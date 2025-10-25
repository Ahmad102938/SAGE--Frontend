import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    // In production, forward to your NestJS ASR service (Whisper/Vosk) here.
    // For local dev, just return a placeholder transcript.
    return NextResponse.json({ text: "mock transcript: turn on living room light" })
  } catch (err) {
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }
}


