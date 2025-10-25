"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface CommandHistoryItem {
  id: string
  command: string
  timestamp: number
  status: "success" | "error" | "pending"
  device: string
  response?: string
}

interface CommandHistoryProps {
  onCommandSelect?: (command: string) => void
}

export function CommandHistory({ onCommandSelect }: CommandHistoryProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([])

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem("iot-command-history")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error("[v0] Failed to load command history:", error)
      }
    }
  }, [])

  const addToHistory = (item: Omit<CommandHistoryItem, "id">) => {
    const newItem: CommandHistoryItem = {
      ...item,
      id: Date.now().toString(),
    }

    const updatedHistory = [newItem, ...history].slice(0, 50) // Keep last 50 commands
    setHistory(updatedHistory)

    // Save to localStorage
    localStorage.setItem("iot-command-history", JSON.stringify(updatedHistory))
  }

  const getStatusIcon = (status: CommandHistoryItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: CommandHistoryItem["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  // Expose addToHistory for parent components
  useEffect(() => {
    ;(window as any).addCommandToHistory = addToHistory
    return () => {
      delete (window as any).addCommandToHistory
    }
  }, [history])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Command History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No commands yet</p>
              <p className="text-sm mt-1">Your command history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onCommandSelect?.(item.command)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{item.command}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.device}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {item.response && <p className="text-xs text-muted-foreground mt-1 truncate">{item.response}</p>}
                    </div>
                    <div className="flex items-center gap-1">{getStatusIcon(item.status)}</div>
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
