"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "@/lib/auth-storage"
import { authService } from "@/lib/auth-service"
import { jwtUtils } from "@/lib/jwt-utils"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const accessToken = localStorage.getItem("accessToken")
    const refreshTokenValue = localStorage.getItem("refreshToken")

    if (accessToken) {
      const payload = jwtUtils.verifyToken(accessToken)
      if (payload) {
        const currentUser = authService.getCurrentUser(accessToken)
        if (currentUser) {
          setUser(currentUser)
          if (jwtUtils.isTokenExpiringSoon(accessToken, 10)) {
            console.log("[v0] Token expiring soon, attempting refresh...")
            refreshAccessToken(refreshTokenValue || "")
          }
        }
      } else if (refreshTokenValue) {
        // Try to refresh the token
        refreshAccessToken(refreshTokenValue)
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(
      () => {
        const accessToken = localStorage.getItem("accessToken")
        const refreshTokenValue = localStorage.getItem("refreshToken")

        if (accessToken && jwtUtils.isTokenExpiringSoon(accessToken, 10)) {
          console.log("[v0] Auto-refreshing token...")
          refreshAccessToken(refreshTokenValue || "")
        }
      },
      5 * 60 * 1000,
    ) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [user])

  const refreshAccessToken = async (refreshTokenValue: string): Promise<boolean> => {
    try {
      const result = await authService.refreshAccessToken(refreshTokenValue)
      if (result.success && result.accessToken) {
        localStorage.setItem("accessToken", result.accessToken)
        setUser(result.user!)
        console.log("[v0] Token refreshed successfully")
        return true
      }
    } catch (error) {
      console.error("Token refresh failed:", error)
    }

    // Clear invalid tokens
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    setUser(null)
    return false
  }

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("refreshToken", refreshToken)
    setUser(userData)
  }

  const logout = () => {
    const refreshTokenValue = localStorage.getItem("refreshToken")
    if (refreshTokenValue) {
      authService.logout(refreshTokenValue)
    }

    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    setUser(null)
  }

  const refreshToken = async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem("refreshToken")
    if (!refreshTokenValue) return false

    return refreshAccessToken(refreshTokenValue)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
