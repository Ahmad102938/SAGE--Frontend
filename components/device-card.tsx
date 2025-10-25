"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Lightbulb, Thermometer, Lock, Camera, SunSnow as Sensor, Power, Settings, Wifi, WifiOff } from "lucide-react"
import type { Device } from "@/lib/types"
import { useWebSocket } from "@/hooks/use-websocket"

interface DeviceCardProps {
  device: Device
  onDeviceUpdate?: (deviceId: string, newState: Record<string, any>) => void
}

export function DeviceCard({ device, onDeviceUpdate }: DeviceCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { sendCommand } = useWebSocket()

  const getDeviceIcon = () => {
    switch (device.type) {
      case "light":
        return <Lightbulb className="h-5 w-5" />
      case "thermostat":
        return <Thermometer className="h-5 w-5" />
      case "lock":
        return <Lock className="h-5 w-5" />
      case "camera":
        return <Camera className="h-5 w-5" />
      case "sensor":
        return <Sensor className="h-5 w-5" />
      default:
        return <Power className="h-5 w-5" />
    }
  }

  const handleTogglePower = async () => {
    setIsUpdating(true)
    const newPowerState = !device.state.power

    try {
      await sendCommand({
        command: newPowerState ? "turn_on" : "turn_off",
        device: device.id,
      })

      onDeviceUpdate?.(device.id, { ...device.state, power: newPowerState })
    } catch (error) {
      console.error("[v0] Failed to toggle device power:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBrightnessChange = async (value: number[]) => {
    const brightness = value[0]
    setIsUpdating(true)

    try {
      await sendCommand({
        command: "set_brightness",
        device: device.id,
        params: { brightness },
      })

      onDeviceUpdate?.(device.id, { ...device.state, brightness })
    } catch (error) {
      console.error("[v0] Failed to set brightness:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTemperatureChange = async (value: number[]) => {
    const temperature = value[0]
    setIsUpdating(true)

    try {
      await sendCommand({
        command: "set_temperature",
        device: device.id,
        params: { temperature },
      })

      onDeviceUpdate?.(device.id, { ...device.state, temperature })
    } catch (error) {
      console.error("[v0] Failed to set temperature:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = () => {
    if (!device.isOnline) return "text-red-500"
    if (device.state.power) return "text-green-500"
    return "text-gray-400"
  }

  const getLastSeenText = () => {
    const now = Date.now()
    const diff = now - device.lastSeen
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${getStatusColor()}`}>{getDeviceIcon()}</div>
              <div>
                <h3 className="font-semibold text-card-foreground">{device.name}</h3>
                <p className="text-sm text-muted-foreground">{device.room}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={device.isOnline ? "default" : "destructive"} className="text-xs">
                {device.isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {device.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Status Info */}
          <div className="text-xs text-muted-foreground">Last seen: {getLastSeenText()}</div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Power Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">Power</span>
              <Switch
                checked={device.state.power || false}
                onCheckedChange={handleTogglePower}
                disabled={!device.isOnline || isUpdating}
              />
            </div>

            {/* Light-specific controls */}
            {device.type === "light" && device.state.power && (
              <>
                {/* Brightness */}
                {typeof device.state.brightness === "number" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-card-foreground">Brightness</span>
                      <span className="text-sm text-muted-foreground">{device.state.brightness}%</span>
                    </div>
                    <Slider
                      value={[device.state.brightness]}
                      onValueChange={handleBrightnessChange}
                      max={100}
                      step={1}
                      disabled={!device.isOnline || isUpdating}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Color */}
                {device.state.color && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Color</span>
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: device.state.color }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Thermostat-specific controls */}
            {device.type === "thermostat" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Temperature</span>
                    <span className="text-sm text-muted-foreground">{device.state.temperature}°F</span>
                  </div>
                  <Slider
                    value={[device.state.temperature || 70]}
                    onValueChange={handleTemperatureChange}
                    min={50}
                    max={90}
                    step={1}
                    disabled={!device.isOnline || isUpdating}
                    className="w-full"
                  />
                </div>

                {device.state.mode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Mode</span>
                    <Badge variant="outline" className="text-xs">
                      {device.state.mode}
                    </Badge>
                  </div>
                )}
              </>
            )}

            {/* Lock-specific status */}
            {device.type === "lock" && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-card-foreground">Status</span>
                <Badge variant={device.state.locked ? "destructive" : "default"} className="text-xs">
                  {device.state.locked ? "Locked" : "Unlocked"}
                </Badge>
              </div>
            )}

            {/* Sensor-specific readings */}
            {device.type === "sensor" && (
              <div className="space-y-2">
                {Object.entries(device.state).map(
                  ([key, value]) =>
                    key !== "power" && (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-card-foreground capitalize">
                          {key.replace("_", " ")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {typeof value === "number" ? value.toFixed(1) : String(value)}
                        </span>
                      </div>
                    ),
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent" disabled={!device.isOnline}>
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
