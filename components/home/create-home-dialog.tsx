"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { homeService } from "@/lib/home-service"
import { useAuth } from "@/hooks/use-auth"

interface CreateHomeDialogProps {
  onHomeCreated?: () => void
}

export function CreateHomeDialog({ onHomeCreated }: CreateHomeDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setIsLoading(true)
    try {
      homeService.createHome(user.user_id, {
        name: name.trim(),
        address: address.trim(),
      })

      setName("")
      setAddress("")
      setOpen(false)
      onHomeCreated?.()
    } catch (error) {
      console.error("Failed to create home:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Home
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Home</DialogTitle>
          <DialogDescription>
            Set up a new home to manage your IoT devices. You'll be the owner with full control.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="home-name">Home Name</Label>
            <Input
              id="home-name"
              placeholder="e.g., My House, Office, Apartment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="home-address">Address (Optional)</Label>
            <Textarea
              id="home-address"
              placeholder="Enter the home address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating..." : "Create Home"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
