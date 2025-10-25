"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, UserPlus, Settings } from "lucide-react"
import { homeService } from "@/lib/home-service"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/lib/auth-storage"

interface HomeManagementProps {
  homeId: number
}

export function HomeManagement({ homeId }: HomeManagementProps) {
  const [members, setMembers] = useState<Array<User & { role: string }>>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "guest">("member")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { user } = useAuth()

  const loadMembers = async () => {
    if (!user) return

    try {
      const homeMembers = homeService.getHomeMembers(homeId, user.user_id)
      setMembers(homeMembers)
    } catch (error) {
      console.error("Failed to load members:", error)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [homeId, user])

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !inviteEmail.trim()) return

    setIsLoading(true)
    setMessage("")

    try {
      const success = homeService.inviteUser(homeId, user.user_id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })

      if (success) {
        setMessage("User invited successfully!")
        setInviteEmail("")
        loadMembers()
      } else {
        setMessage("Failed to invite user. They may not exist or already be a member.")
      }
    } catch (error) {
      setMessage("An error occurred while inviting the user.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveUser = async (targetUserId: number) => {
    if (!user) return

    try {
      const success = homeService.removeUser(homeId, user.user_id, targetUserId)
      if (success) {
        setMessage("User removed successfully!")
        loadMembers()
      } else {
        setMessage("Failed to remove user. You may not have permission.")
      }
    } catch (error) {
      setMessage("An error occurred while removing the user.")
    }
  }

  const handleUpdateRole = async (targetUserId: number, newRole: "member" | "guest") => {
    if (!user) return

    try {
      const success = homeService.updateUserRole(homeId, user.user_id, targetUserId, newRole)
      if (success) {
        setMessage("User role updated successfully!")
        loadMembers()
      } else {
        setMessage("Failed to update user role. You may not have permission.")
      }
    } catch (error) {
      setMessage("An error occurred while updating the user role.")
    }
  }

  const currentUserRole = members.find((m) => m.user_id === user?.user_id)?.role
  const canManageUsers = currentUserRole === "owner"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Home Management
          </CardTitle>
          <CardDescription>Manage members and their access levels for this home.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {canManageUsers && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite New Member
              </h3>
              <form onSubmit={handleInviteUser} className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="invite-email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Select value={inviteRole} onValueChange={(value: "member" | "guest") => setInviteRole(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={isLoading || !inviteEmail.trim()}>
                  {isLoading ? "Inviting..." : "Invite"}
                </Button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Members</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                  </div>

                  {canManageUsers && member.role !== "owner" && member.user_id !== user?.user_id && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value: "member" | "guest") => handleUpdateRole(member.user_id, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveUser(member.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
