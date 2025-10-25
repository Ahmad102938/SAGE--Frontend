"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Grid3X3, List, Search, RefreshCw } from "lucide-react"
import { DeviceCard } from "./device-card"
import type { Device } from "@/lib/types"
import { useWebSocket } from "@/hooks/use-websocket"

interface DeviceDashboardProps {
  className?: string
}

export function DeviceDashboard({ className }: DeviceDashboardProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)

  const { deviceStates, isConnected } = useWebSocket()

  // Mock device data - in production, this would come from your backend
  useEffect(() => {
    const mockDevices: Device[] = [
      {
        id: "living_room_light",
        name: "Living Room Light",
        type: "light",
        room: "Living Room",
        state: { power: true, brightness: 75, color: "#ffffff" },
        isOnline: true,
        lastSeen: Date.now() - 30000,
      },
      {
        id: "bedroom_light",
        name: "Bedroom Light",
        type: "light",
        room: "Bedroom",
        state: { power: false, brightness: 50 },
        isOnline: true,
        lastSeen: Date.now() - 120000,
      },
      {
        id: "main_thermostat",
        name: "Main Thermostat",
        type: "thermostat",
        room: "Hallway",
        state: { power: true, temperature: 72, mode: "auto" },
        isOnline: true,
        lastSeen: Date.now() - 60000,
      },
      {
        id: "front_door_lock",
        name: "Front Door Lock",
        type: "lock",
        room: "Entrance",
        state: { power: true, locked: true },
        isOnline: true,
        lastSeen: Date.now() - 15000,
      },
      {
        id: "garage_camera",
        name: "Garage Camera",
        type: "camera",
        room: "Garage",
        state: { power: true, recording: false },
        isOnline: false,
        lastSeen: Date.now() - 300000,
      },
      {
        id: "kitchen_sensor",
        name: "Kitchen Sensor",
        type: "sensor",
        room: "Kitchen",
        state: { temperature: 68.5, humidity: 45, motion: false },
        isOnline: true,
        lastSeen: Date.now() - 45000,
      },
    ]

    setDevices(mockDevices)
    setIsLoading(false)
  }, [])

  // Update devices with real-time state changes
  useEffect(() => {
    deviceStates.forEach((state, deviceId) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId ? { ...device, state: state.state, lastSeen: state.lastUpdated } : device,
        ),
      )
    })
  }, [deviceStates])

  // Filter devices based on search and filters
  useEffect(() => {
    let filtered = devices

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (device) =>
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Room filter
    if (selectedRoom !== "all") {
      filtered = filtered.filter((device) => device.room === selectedRoom)
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((device) => device.type === selectedType)
    }

    setFilteredDevices(filtered)
  }, [devices, searchQuery, selectedRoom, selectedType])

  const handleDeviceUpdate = (deviceId: string, newState: Record<string, any>) => {
    setDevices((prev) =>
      prev.map((device) => (device.id === deviceId ? { ...device, state: newState, lastSeen: Date.now() } : device)),
    )
  }

  const refreshDevices = () => {
    setIsLoading(true)
    // Simulate refresh delay
    setTimeout(() => setIsLoading(false), 1000)
  }

  const rooms = Array.from(new Set(devices.map((d) => d.room)))
  const types = Array.from(new Set(devices.map((d) => d.type)))
  const onlineCount = devices.filter((d) => d.isOnline).length

  return (
    <div className={className}>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-card-foreground">Device Dashboard</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-sm">
                  {onlineCount}/{devices.length} Online
                </Badge>
                <div className={`flex items-center gap-1 text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshDevices} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              >
                <option value="all">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              >
                <option value="all">All Types</option>
                {types.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Device Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No devices found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {filteredDevices.map((device) => (
                <DeviceCard key={device.id} device={device} onDeviceUpdate={handleDeviceUpdate} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
