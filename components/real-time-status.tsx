"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Zap } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"

interface StatusEvent {
  id: string
  type: "success" | "error" | "warning" | "info"
  message: string
  device?: string
  timestamp: number
}

export function RealTimeStatus() {
  const [events, setEvents] = useState<StatusEvent[]>([])
  const { lastStatus, isConnected } = useWebSocket()

  // Add new status events
  useEffect(() => {
    if (lastStatus) {
      const newEvent: StatusEvent = {
        id: Date.now().toString(),
        type: lastStatus.status === "success" ? "success" : lastStatus.status === "error" ? "error" : "warning",
        message: lastStatus.message,
        device: lastStatus.device,
        timestamp: lastStatus.timestamp,
      }

      setEvents((prev) => [newEvent, ...prev].slice(0, 20)) // Keep last 20 events
    }
  }, [lastStatus])

  // Add connection status events
  useEffect(() => {
    const connectionEvent: StatusEvent = {
      id: `connection-${Date.now()}`,
      type: isConnected ? "success" : "error",
      message: isConnected ? "Connected to IoT system" : "Disconnected from IoT system",
      timestamp: Date.now(),
    }

    setEvents((prev) => [connectionEvent, ...prev].slice(0, 20))
  }, [isConnected])

  const getEventIcon = (type: StatusEvent["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getEventBadgeColor = (type: StatusEvent["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Real-time Status
          <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto text-xs">
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm mt-1">Status updates will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {event.device && (
                        <Badge variant="outline" className="text-xs">
                          {event.device}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
