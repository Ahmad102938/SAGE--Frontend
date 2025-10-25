// Authentication service with user registration, login, and session management
import { authStorage, type User, type UserHomeRole, type RefreshToken } from "./auth-storage"
import { jwtUtils } from "./jwt-utils"
import bcrypt from "bcryptjs"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  fullName: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  accessToken?: string
  refreshToken?: string
  error?: string
}

class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = authStorage.findOne("users", (user: User) => user.email === data.email)

      if (existingUser) {
        return { success: false, error: "User already exists with this email" }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10)

      // Create user
      const user = authStorage.create("users", {
        email: data.email,
        password_hash: passwordHash,
        full_name: data.fullName,
      })

      // Generate tokens
      const accessToken = jwtUtils.generateToken(user, [])
      const refreshTokenValue = jwtUtils.generateRefreshToken()

      // Store refresh token
      authStorage.create("refresh_tokens", {
        user_id: user.user_id,
        token: refreshTokenValue,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })

      return {
        success: true,
        user,
        accessToken,
        refreshToken: refreshTokenValue,
      }
    } catch (error) {
      return { success: false, error: "Registration failed" }
    }
  }

  async login(credentials: LoginCredentials, homeId?: number): Promise<AuthResponse> {
    try {
      // Find user
      const user = authStorage.findOne("users", (u: User) => u.email === credentials.email)

      if (!user) {
        return { success: false, error: "Invalid email or password" }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash)
      if (!isValidPassword) {
        return { success: false, error: "Invalid email or password" }
      }

      // Get user roles for the specified home (or all homes)
      let roles: UserHomeRole[] = []
      if (homeId) {
        roles = authStorage.findMany(
          "user_home_roles",
          (role: UserHomeRole) => role.user_id === user.user_id && role.home_id === homeId,
        )
      } else {
        roles = authStorage.findMany("user_home_roles", (role: UserHomeRole) => role.user_id === user.user_id)
      }

      // Generate tokens
      const accessToken = jwtUtils.generateToken(user, roles, homeId)
      const refreshTokenValue = jwtUtils.generateRefreshToken()

      // Store refresh token
      authStorage.create("refresh_tokens", {
        user_id: user.user_id,
        token: refreshTokenValue,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      return {
        success: true,
        user,
        accessToken,
        refreshToken: refreshTokenValue,
      }
    } catch (error) {
      return { success: false, error: "Login failed" }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Find refresh token
      const tokenRecord = authStorage.findOne("refresh_tokens", (token: RefreshToken) => token.token === refreshToken)

      if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
        return { success: false, error: "Invalid or expired refresh token" }
      }

      // Get user
      const user = authStorage.findOne("users", (u: User) => u.user_id === tokenRecord.user_id)

      if (!user) {
        return { success: false, error: "User not found" }
      }

      // Get user roles
      const roles = authStorage.findMany("user_home_roles", (role: UserHomeRole) => role.user_id === user.user_id)

      // Generate new access token
      const accessToken = jwtUtils.generateToken(user, roles)

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
      }
    } catch (error) {
      return { success: false, error: "Token refresh failed" }
    }
  }

  logout(refreshToken: string): void {
    // Remove refresh token
    authStorage.delete("refresh_tokens", (token: RefreshToken) => token.token === refreshToken)
  }

  verifyToken(token: string) {
    return jwtUtils.verifyToken(token)
  }

  getCurrentUser(token: string): User | null {
    const payload = this.verifyToken(token)
    if (!payload) return null

    return authStorage.findOne("users", (user: User) => user.user_id === payload.userId)
  }
}

export const authService = new AuthService()
