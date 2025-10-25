"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, MicOff, Volume2, VolumeX, Headphones } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useWebSocket } from "@/hooks/use-websocket"
import { parseCommand } from "@/lib/command-parser"

interface VoiceCommandInterfaceProps {
  onCommandProcessed?: (command: string, success: boolean) => void
}

export function VoiceCommandInterface({ onCommandProcessed }: VoiceCommandInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastCommand, setLastCommand] = useState<string>("")
  const [confidence, setConfidence] = useState<number>(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [listeningProgress, setListeningProgress] = useState(0)

  const { sendCommand, isConnected } = useWebSocket()

  const { isSupported, isListening, transcript, interimTranscript, error, start, stop, abort } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: "en-US",
    onResult: (result) => {
      if (result.isFinal) {
        handleVoiceCommand(result.transcript, result.confidence)
      }
      setConfidence(result.confidence)
    },
    onError: (error) => {
      console.error("[v0] Voice recognition error:", error)
      setIsProcessing(false)
    },
    onStart: () => {
      setIsProcessing(true)
      setListeningProgress(0)
    },
    onEnd: () => {
      setIsProcessing(false)
      setListeningProgress(0)
    },
  })

  // Progress animation while listening
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isListening) {
      interval = setInterval(() => {
        setListeningProgress((prev) => {
          if (prev >= 100) return 0
          return prev + 2
        })
      }, 100)
    } else {
      setListeningProgress(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isListening])

  const handleVoiceCommand = async (command: string, confidence: number) => {
    if (!command.trim() || !isConnected) return

    setLastCommand(command)
    setIsProcessing(true)

    try {
      console.log("[v0] Processing voice command:", command, "Confidence:", confidence)

      // Parse the voice command
      const parsedCommand = parseCommand(command)

      if (parsedCommand) {
        sendCommand(parsedCommand)
        onCommandProcessed?.(command, true)

        // Add to command history
        if ((window as any).addCommandToHistory) {
          ;(window as any).addCommandToHistory({
            command,
            timestamp: Date.now(),
            status: "success",
            device: parsedCommand.device,
            response: `Voice command processed: ${parsedCommand.command}`,
          })
        }
      } else {
        // Send as raw command if parsing fails
        sendCommand({
          command: "raw_command",
          device: "system",
          params: { text: command, source: "voice", confidence },
        })
        onCommandProcessed?.(command, false)
      }
    } catch (error) {
      console.error("[v0] Voice command processing error:", error)
      onCommandProcessed?.(command, false)
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }

  const handleEmergencyStop = () => {
    abort()
    setIsProcessing(false)
  }

  if (!isSupported) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <VolumeX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-card-foreground mb-2">Voice Commands Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support voice recognition. Please use text commands instead.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          Voice Commands
          <Badge variant={voiceEnabled ? "default" : "secondary"} className="ml-auto text-xs">
            {voiceEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-muted-foreground">{isConnected ? "Connected to IoT system" : "Disconnected"}</span>
        </div>

        {/* Voice Control Button */}
        <div className="text-center space-y-4">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={toggleListening}
            disabled={!voiceEnabled || !isConnected || isProcessing}
            className={`w-24 h-24 rounded-full ${
              isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>

          <div className="space-y-2">
            <p className="text-sm font-medium text-card-foreground">{isListening ? "Listening..." : "Tap to speak"}</p>

            {isListening && <Progress value={listeningProgress} className="w-full h-2" />}
          </div>
        </div>

        {/* Live Transcript */}
        {(transcript || interimTranscript) && (
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {transcript ? "Recognized:" : "Listening..."}
              </span>
              {confidence > 0 && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(confidence * 100)}% confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground">{transcript || interimTranscript}</p>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && (
          <div className="p-3 bg-accent/20 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-card-foreground">Last Command:</span>
            </div>
            <p className="text-sm text-muted-foreground">{lastCommand}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <p className="text-sm font-medium">Voice Recognition Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setVoiceEnabled(!voiceEnabled)} className="flex-1">
            {voiceEnabled ? (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Disable Voice
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Enable Voice
              </>
            )}
          </Button>

          {isListening && (
            <Button variant="destructive" size="sm" onClick={handleEmergencyStop}>
              Stop
            </Button>
          )}
        </div>

        {/* Voice Command Examples */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-card-foreground">Try saying:</p>
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
            <p>"Turn on the living room light"</p>
            <p>"Set bedroom light to 50 percent"</p>
            <p>"Lock the front door"</p>
            <p>"Set thermostat to 72 degrees"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
