"use client"

import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) router.replace("/")
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>

        <LoginForm onSuccess={() => router.push("/")} />
      </div>
    </div>
  )
}


