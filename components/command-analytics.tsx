"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Download, Trash2, Activity } from "lucide-react"
import { commandLogger, type CommandLog, type SystemLog } from "@/lib/command-logger"

export function CommandAnalytics() {
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([])
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
    avgExecutionTime: 0,
  })

  useEffect(() => {
    // Load initial data
    setCommandLogs(commandLogger.getCommandLogs(100))
    setSystemLogs(commandLogger.getSystemLogs(100))
    setStats(commandLogger.getCommandStats())

    // Subscribe to updates
    const unsubscribeCommands = commandLogger.onCommandLogsChange((logs) => {
      setCommandLogs(logs.slice(0, 100))
      setStats(commandLogger.getCommandStats())
    })

    const unsubscribeSystem = commandLogger.onSystemLogsChange((logs) => {
      setSystemLogs(logs.slice(0, 100))
    })

    return () => {
      unsubscribeCommands()
      unsubscribeSystem()
    }
  }, [])

  // Prepare chart data
  const hourlyData = commandLogs.reduce(
    (acc, log) => {
      const hour = new Date(log.timestamp).getHours()
      const key = `${hour}:00`

      if (!acc[key]) {
        acc[key] = { hour: key, success: 0, error: 0, total: 0 }
      }

      acc[key].total++
      if (log.status === "success") acc[key].success++
      if (log.status === "error") acc[key].error++

      return acc
    },
    {} as Record<string, any>,
  )

  const chartData = Object.values(hourlyData).slice(-12) // Last 12 hours

  const statusData = [
    { name: "Success", value: stats.successful, color: "#10b981" },
    { name: "Error", value: stats.failed, color: "#ef4444" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
  ]

  const deviceUsage = commandLogs.reduce(
    (acc, log) => {
      if (log.parsedCommand?.device) {
        const device = log.parsedCommand.device
        acc[device] = (acc[device] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const topDevices = Object.entries(deviceUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([device, count]) => ({ device, count }))

  const handleExportLogs = () => {
    const data = commandLogger.exportAllLogs()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `iot-logs-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearLogs = () => {
    if (confirm("Are you sure you want to clear all logs? This action cannot be undone.")) {
      commandLogger.clearAllLogs()
    }
  }

  const getStatusIcon = (status: CommandLog["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getLogLevelColor = (level: SystemLog["level"]) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200"
      case "warn":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "debug":
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Commands</p>
                <p className="text-2xl font-bold text-card-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-card-foreground">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold text-card-foreground">{stats.avgExecutionTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Devices</p>
                <p className="text-2xl font-bold text-card-foreground">{Object.keys(deviceUsage).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-card-foreground">Command Analytics & Logs</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="system">System Logs</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Hourly Activity Chart */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Hourly Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="success" fill="#10b981" />
                        <Bar dataKey="error" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="commands">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {commandLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border border-border rounded-lg hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(log.status)}
                            <span className="font-medium text-sm text-card-foreground truncate">{log.command}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.source}
                            </Badge>
                          </div>
                          {log.parsedCommand && (
                            <p className="text-xs text-muted-foreground">
                              {log.parsedCommand.device} → {log.parsedCommand.command}
                            </p>
                          )}
                          {log.response && <p className="text-xs text-muted-foreground mt-1">{log.response}</p>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                          {log.executionTime && <div>{log.executionTime}ms</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="system">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {systemLogs.map((log) => (
                    <div key={log.id} className={`p-3 border rounded-lg text-sm ${getLogLevelColor(log.level)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs uppercase">
                              {log.level}
                            </Badge>
                            {log.component && (
                              <Badge variant="outline" className="text-xs">
                                {log.component}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{log.message}</p>
                          {log.data && (
                            <pre className="text-xs mt-1 opacity-75 overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span className="text-xs opacity-75">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="devices">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-card-foreground">Most Used Devices</h3>
                <div className="space-y-2">
                  {topDevices.map((item, index) => (
                    <div
                      key={item.device}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-card-foreground">{item.device}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.count} commands
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
