"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Home, Users } from "lucide-react"
import { homeService, type HomeWithRole } from "@/lib/home-service"
import { useAuth } from "@/hooks/use-auth"
import { CreateHomeDialog } from "./create-home-dialog"

interface HomeSelectorProps {
  selectedHomeId?: number
  onHomeChange?: (homeId: number) => void
}

export function HomeSelector({ selectedHomeId, onHomeChange }: HomeSelectorProps) {
  const [homes, setHomes] = useState<HomeWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const loadHomes = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const userHomes = homeService.getUserHomes(user.user_id)
      setHomes(userHomes)

      // Auto-select first home if none selected
      if (!selectedHomeId && userHomes.length > 0) {
        onHomeChange?.(userHomes[0].home_id)
      }
    } catch (error) {
      console.error("Failed to load homes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHomes()
  }, [user])

  const selectedHome = homes.find((home) => home.home_id === selectedHomeId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <Home className="h-4 w-4" />
        <span className="text-sm">Loading homes...</span>
      </div>
    )
  }

  if (homes.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Home className="h-4 w-4" />
          <span className="text-sm">No homes yet</span>
        </div>
        <CreateHomeDialog onHomeCreated={loadHomes} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4" />
        <Select value={selectedHomeId?.toString()} onValueChange={(value) => onHomeChange?.(Number.parseInt(value))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select a home" />
          </SelectTrigger>
          <SelectContent>
            {homes.map((home) => (
              <SelectItem key={home.home_id} value={home.home_id.toString()}>
                <div className="flex items-center justify-between w-full">
                  <span>{home.name}</span>
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {home.userRole}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {home.memberCount}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedHome && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{selectedHome.userRole}</Badge>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {selectedHome.memberCount} members
          </div>
        </div>
      )}

      <CreateHomeDialog onHomeCreated={loadHomes} />
    </div>
  )
}
