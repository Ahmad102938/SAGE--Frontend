"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { HomeSelector } from "@/components/home/home-selector"
import { HomeManagement } from "@/components/home/home-management"
import { CommandInput } from "@/components/command-input"
import { DeviceDashboard } from "@/components/device-dashboard"
import { VoiceCommandInterface } from "@/components/voice-command-interface"
import { RealTimeStatus } from "@/components/real-time-status"
import { CommandHistory } from "@/components/command-history"
import { CommandAnalytics } from "@/components/command-analytics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Settings } from "lucide-react"
import { useState } from "react"

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [selectedHomeId, setSelectedHomeId] = useState<number>()
  const [showAuth, setShowAuth] = useState<"login" | "register">("login")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">IoT Command Interface</h1>
            <p className="text-muted-foreground">Sign in to control your smart devices</p>
          </div>

          {showAuth === "login" ? (
            <div className="space-y-4">
              <LoginForm onSuccess={() => {}} />
              <div className="text-center">
                <Button variant="link" onClick={() => setShowAuth("register")}>
                  Don't have an account? Sign up
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <RegisterForm onSuccess={() => {}} />
              <div className="text-center">
                <Button variant="link" onClick={() => setShowAuth("login")}>
                  Already have an account? Sign in
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">IoT Command Interface</h1>
            <p className="text-lg text-muted-foreground">Welcome back, {user?.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Home Selection</CardTitle>
            <CardDescription>Select a home to manage its devices and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <HomeSelector selectedHomeId={selectedHomeId} onHomeChange={setSelectedHomeId} />
          </CardContent>
        </Card>

        {selectedHomeId ? (
          <Tabs defaultValue="control" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="control">Control</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="control" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <CommandInput homeId={selectedHomeId} />
                  <VoiceCommandInterface homeId={selectedHomeId} />
                </div>
                <div className="space-y-6">
                  <RealTimeStatus homeId={selectedHomeId} />
                  <CommandHistory homeId={selectedHomeId} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="devices">
              <DeviceDashboard homeId={selectedHomeId} />
            </TabsContent>

            <TabsContent value="history">
              <CommandHistory homeId={selectedHomeId} />
            </TabsContent>

            <TabsContent value="analytics">
              <CommandAnalytics homeId={selectedHomeId} />
            </TabsContent>

            <TabsContent value="settings">
              <HomeManagement homeId={selectedHomeId} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Select a Home</h3>
                <p className="text-muted-foreground">Choose a home above to start controlling your IoT devices</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground border-t border-border pt-6">
          <p>IoT Layer 1 Interface - Built for scalable multi-layer architecture</p>
          <p className="mt-1">Supports structured payload communication with Layer 2 systems</p>
        </div>
      </div>
    </div>
  )
}
