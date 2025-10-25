// Home management service with RBAC integration
import { authStorage, type Home, type UserHomeRole, type User } from "./auth-storage"
import { rbacService } from "./rbac"

export interface CreateHomeData {
  name: string
  address?: string
}

export interface InviteUserData {
  email: string
  role: "member" | "guest"
}

export interface HomeWithRole extends Home {
  userRole: string
  memberCount: number
}

class HomeService {
  createHome(userId: number, data: CreateHomeData): Home {
    // Create the home
    const home = authStorage.create("homes", {
      name: data.name,
      address: data.address || "",
    })

    // Automatically assign creator as owner
    authStorage.create("user_home_roles", {
      user_id: userId,
      home_id: home.home_id,
      role: "owner",
    })

    return home
  }

  getUserHomes(userId: number): HomeWithRole[] {
    // Get all homes where user has a role
    const userRoles = authStorage.findMany("user_home_roles", (role: UserHomeRole) => role.user_id === userId)

    return userRoles.map((role) => {
      const home = authStorage.findOne("homes", (h: Home) => h.home_id === role.home_id)

      const memberCount = authStorage.findMany(
        "user_home_roles",
        (r: UserHomeRole) => r.home_id === role.home_id,
      ).length

      return {
        ...home,
        userRole: role.role,
        memberCount,
      }
    })
  }

  getHomeDetails(homeId: number, userId: number): HomeWithRole | null {
    // Check if user has access to this home
    const userRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === userId && role.home_id === homeId,
    )

    if (!userRole) return null

    const home = authStorage.findOne("homes", (h: Home) => h.home_id === homeId)

    if (!home) return null

    const memberCount = authStorage.findMany("user_home_roles", (role: UserHomeRole) => role.home_id === homeId).length

    return {
      ...home,
      userRole: userRole.role,
      memberCount,
    }
  }

  getHomeMembers(homeId: number, requesterId: number): Array<User & { role: string }> {
    // Check if requester has permission to view members
    const requesterRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === requesterId && role.home_id === homeId,
    )

    if (!requesterRole) return []

    // Get all members of the home
    const homeRoles = authStorage.findMany("user_home_roles", (role: UserHomeRole) => role.home_id === homeId)

    return homeRoles
      .map((role) => {
        const user = authStorage.findOne("users", (u: User) => u.user_id === role.user_id)
        return {
          ...user,
          role: role.role,
        }
      })
      .filter(Boolean)
  }

  inviteUser(homeId: number, inviterId: number, inviteData: InviteUserData): boolean {
    // Check if inviter has permission to invite users
    const inviterRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === inviterId && role.home_id === homeId,
    )

    if (!inviterRole || !rbacService.canInviteUsers([inviterRole.role as any])) {
      return false
    }

    // Find user by email
    const user = authStorage.findOne("users", (u: User) => u.email === inviteData.email)

    if (!user) return false

    // Check if user is already a member
    const existingRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === user.user_id && role.home_id === homeId,
    )

    if (existingRole) return false

    // Add user to home
    authStorage.create("user_home_roles", {
      user_id: user.user_id,
      home_id: homeId,
      role: inviteData.role,
    })

    return true
  }

  removeUser(homeId: number, removerId: number, targetUserId: number): boolean {
    // Check if remover has permission
    const removerRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === removerId && role.home_id === homeId,
    )

    if (!removerRole || !rbacService.canRemoveUsers([removerRole.role as any])) {
      return false
    }

    // Cannot remove owners
    const targetRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === targetUserId && role.home_id === homeId,
    )

    if (!targetRole || targetRole.role === "owner") {
      return false
    }

    // Remove user from home
    return authStorage.delete(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === targetUserId && role.home_id === homeId,
    )
  }

  updateUserRole(homeId: number, updaterId: number, targetUserId: number, newRole: "member" | "guest"): boolean {
    // Check if updater has permission
    const updaterRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === updaterId && role.home_id === homeId,
    )

    if (!updaterRole || !rbacService.canRemoveUsers([updaterRole.role as any])) {
      return false
    }

    // Cannot update owners
    const targetRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === targetUserId && role.home_id === homeId,
    )

    if (!targetRole || targetRole.role === "owner") {
      return false
    }

    // Update role
    return !!authStorage.update(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === targetUserId && role.home_id === homeId,
      { role: newRole },
    )
  }

  deleteHome(homeId: number, userId: number): boolean {
    // Only owners can delete homes
    const userRole = authStorage.findOne(
      "user_home_roles",
      (role: UserHomeRole) => role.user_id === userId && role.home_id === homeId,
    )

    if (!userRole || userRole.role !== "owner") {
      return false
    }

    // Delete home and all related data
    authStorage.delete("user_home_roles", (role: UserHomeRole) => role.home_id === homeId)
    authStorage.delete("devices", (device: any) => device.home_id === homeId)
    authStorage.delete("homes", (home: Home) => home.home_id === homeId)

    return true
  }
}

export const homeService = new HomeService()
