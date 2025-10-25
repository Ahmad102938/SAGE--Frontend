"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Send, Loader2, Volume2, AlertTriangle } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import { useMediaRecorderVoice } from "@/hooks/use-mediarecorder-voice"
import { parseCommand } from "@/lib/command-parser"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

interface CommandInputProps {
  onCommandSent?: (command: string) => void
  homeId?: number
}

export function CommandInput({ onCommandSent, homeId }: CommandInputProps) {
  const [textCommand, setTextCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { sendCommand, isConnected, lastStatus } = useWebSocket()

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({
    onResult: (result) => {
      if (result.isFinal) {
        setTextCommand(result.transcript)
        handleCommand(result.transcript)
      }
    },
  })

  // Server voice fallback (MediaRecorder -> /api/voice/transcribe)
  const { isSupported: mrSupported, isRecording, permissionError, start: startRecord, stop: stopRecord } =
    useMediaRecorderVoice({
      onTranscript: (text) => {
        setTextCommand(text)
        handleCommand(text)
      },
    })

  const handleCommand = async (command: string) => {
    if (!command.trim()) return

    setIsProcessing(true)
    onCommandSent?.(command)

    try {
      // Parse natural language command into structured format
      const parsedCommand = parseCommand(command)

      if (parsedCommand) {
        const result = await sendCommand(
          { text: command, structured: { action: parsedCommand.command, deviceName: parsedCommand.device, params: parsedCommand.params } },
          { homeId },
        )
        console.log("[v0] Command result:", result)
      } else {
        // If parsing fails, send as raw command for Layer 2 to handle
        const result = await sendCommand({ text: command }, { homeId })
        console.log("[v0] Command result (raw):", result)
      }
    } catch (error) {
      console.error("[v0] Command processing error:", error)
    } finally {
      setIsProcessing(false)
      setTextCommand("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCommand(textCommand)
  }

  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
          {(voiceSupported || mrSupported) && (
            <>
              <div className="w-px h-4 bg-border mx-2" />
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Voice Ready</span>
              {(isListening || isRecording) && (
                <span className="inline-flex items-center gap-2 text-xs ml-2 px-2 py-1 rounded-full bg-red-100 text-red-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Listening...
                </span>
              )}
            </>
          )}
        </div>

        {!voiceSupported && !mrSupported && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            <AlertTriangle className="h-4 w-4" />
            Your browser does not support built-in voice recognition. Use Chrome or enable a server-side voice gateway.
          </div>
        )}

        {(voiceError || permissionError) && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
            <AlertTriangle className="h-4 w-4" />
            {voiceError || permissionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={textCommand || interimTranscript}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="Enter command or use voice (e.g., 'turn on living room light')"
              disabled={isProcessing || isListening || isRecording}
              className={`pr-12 bg-input border-border text-foreground placeholder:text-muted-foreground ${
                isListening || isRecording ? "border-red-300 bg-red-50" : ""
              }`}
            />
            {(isListening || isRecording) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-600">Listening…</span>
              </div>
            )}
          </div>

          {(voiceSupported || mrSupported) && (
            <Button
              type="button"
              variant={isListening || isRecording ? "default" : "outline"}
              size="icon"
              onClick={() => {
                const canBrowserASR = voiceSupported && !voiceError
                if (canBrowserASR) {
                  toggleVoiceRecognition()
                  return
                }
                if (mrSupported) {
                  if (isRecording) stopRecord()
                  else startRecord()
                }
              }}
              disabled={isProcessing}
              className={`${
                isListening || isRecording ? "bg-red-600 hover:bg-red-700 text-white" : "border-border hover:bg-accent"
              }`}
              aria-pressed={isListening || isRecording}
              aria-label={isListening || isRecording ? "Stop voice input" : "Start voice input"}
            >
              {isListening || isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}

          <Button
            type="submit"
            disabled={!textCommand.trim() || isProcessing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {/* Live Voice Visualizer & Transcript */}
        {(voiceSupported || mrSupported) && (
          <div className="mt-2 space-y-2" aria-live="polite" aria-atomic="true">
            {(isListening || isRecording) && (
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1.5 bg-red-500 rounded-sm animate-pulse" style={{ animationDelay: "0ms", height: "60%" }} />
                  <span className="w-1.5 bg-red-400 rounded-sm animate-pulse" style={{ animationDelay: "150ms", height: "80%" }} />
                  <span className="w-1.5 bg-red-500 rounded-sm animate-pulse" style={{ animationDelay: "300ms", height: "50%" }} />
                  <span className="w-1.5 bg-red-400 rounded-sm animate-pulse" style={{ animationDelay: "450ms", height: "70%" }} />
                  <span className="w-1.5 bg-red-500 rounded-sm animate-pulse" style={{ animationDelay: "600ms", height: "60%" }} />
                </div>
                <span className="text-xs text-muted-foreground">Speak your command…</span>
              </div>
            )}
            {(interimTranscript || transcript) && (
              <div className="text-sm text-foreground/90 bg-accent/40 border border-border rounded-md p-2">
                <span className="font-medium">Heard:</span>
                <span className="ml-2">
                  {interimTranscript || transcript}
                  {(isListening || isRecording) && <span className="animate-pulse">_</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Command Examples */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Example commands:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Turn on living room light",
              "Set thermostat to 72 degrees",
              "Lock front door",
              "Dim bedroom lights to 50%",
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => setTextCommand(example)}
                disabled={isProcessing}
                className="text-xs border-border hover:bg-accent"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Display */}
        {lastStatus && (
          <div
            className={`p-3 rounded-md text-sm ${
              lastStatus.status === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : lastStatus.status === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{lastStatus.device}</span>
              <span className="text-xs opacity-75">{new Date(lastStatus.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="mt-1">{lastStatus.message}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
