"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Polyfill for cross-browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

interface UseSpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  onResult?: (result: SpeechRecognitionResult) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { continuous = false, interimResults = true, language = "en-US", onResult, onError, onStart, onEnd } = options

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
      recognitionRef.current = new SpeechRecognition()

      const recognition = recognitionRef.current
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = language
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        console.log("[v0] Speech recognition started")
        setIsListening(true)
        setError(null)
        onStart?.()
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          console.log("[v0] Final transcript:", finalTranscript)
          setTranscript(finalTranscript)
          onResult?.({
            transcript: finalTranscript,
            confidence: event.results[event.results.length - 1][0].confidence,
            isFinal: true,
          })
        }

        if (interimTranscript) {
          console.log("[v0] Interim transcript:", interimTranscript)
          setInterimTranscript(interimTranscript)
          onResult?.({
            transcript: interimTranscript,
            confidence: 0,
            isFinal: false,
          })
        }
      }

      recognition.onerror = (event: any) => {
        console.error("[v0] Speech recognition error:", event.error)
        const errorMessage = getErrorMessage(event.error)
        setError(errorMessage)
        setIsListening(false)
        onError?.(errorMessage)
      }

      recognition.onend = () => {
        console.log("[v0] Speech recognition ended")
        setIsListening(false)
        setInterimTranscript("")
        onEnd?.()
      }
    } else {
      console.warn("[v0] Speech recognition not supported")
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [continuous, interimResults, language, onResult, onError, onStart, onEnd])

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) return

    try {
      setTranscript("")
      setInterimTranscript("")
      setError(null)
      recognitionRef.current.start()

      // Auto-stop after 10 seconds for single commands
      if (!continuous) {
        timeoutRef.current = setTimeout(() => {
          stop()
        }, 10000)
      }
    } catch (error) {
      console.error("[v0] Failed to start speech recognition:", error)
      setError("Failed to start voice recognition")
    }
  }, [isSupported, isListening, continuous])

  const stop = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    try {
      recognitionRef.current.stop()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } catch (error) {
      console.error("[v0] Failed to stop speech recognition:", error)
    }
  }, [isListening])

  const abort = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.abort()
      setIsListening(false)
      setTranscript("")
      setInterimTranscript("")
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } catch (error) {
      console.error("[v0] Failed to abort speech recognition:", error)
    }
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    abort,
  }
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "no-speech":
      return "No speech detected. Please try again."
    case "audio-capture":
      return "Microphone not accessible. Please check permissions."
    case "not-allowed":
      return "Microphone permission denied. Please enable microphone access."
    case "network":
      return "Network error occurred. Please check your connection."
    case "service-not-allowed":
      return "Speech recognition service not available."
    case "bad-grammar":
      return "Speech recognition grammar error."
    case "language-not-supported":
      return "Language not supported for speech recognition."
    default:
      return `Speech recognition error: ${error}`
  }
}
