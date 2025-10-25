"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseMediaRecorderVoiceOptions {
  mimeType?: string
  onTranscript?: (text: string) => void
  onError?: (message: string) => void
}

export function useMediaRecorderVoice(options: UseMediaRecorderVoiceOptions = {}) {
  const { mimeType = "audio/webm", onTranscript, onError } = options

  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && !!window.MediaRecorder)
  }, [])

  const start = useCallback(async () => {
    if (!isSupported || isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const formData = new FormData()
          formData.append("audio", blob, `recording.${mimeType.includes("webm") ? "webm" : "wav"}`)

          const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData })
          if (!res.ok) {
            const { error } = await res.json().catch(() => ({ error: "Transcription failed" }))
            onError?.(error)
            return
          }
          const data = (await res.json()) as { text: string }
          onTranscript?.(data.text)
        } catch (err) {
          onError?.("Failed to transcribe audio")
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err: any) {
      const message = err?.name === "NotAllowedError" ? "Microphone permission denied" : "Cannot access microphone"
      setPermissionError(message)
      onError?.(message)
    }
  }, [isSupported, isRecording, mimeType, onTranscript, onError])

  const stop = useCallback(() => {
    if (!isRecording) return
    try {
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    } finally {
      setIsRecording(false)
    }
  }, [isRecording])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { isSupported, isRecording, permissionError, start, stop }
}


