// Role-Based Access Control implementation
export type Role = "owner" | "member" | "guest"
export type Permission =
  | "device:read"
  | "device:write"
  | "device:delete"
  | "home:manage"
  | "user:invite"
  | "user:remove"

export const rolePermissions: Record<Role, Permission[]> = {
  owner: ["device:read", "device:write", "device:delete", "home:manage", "user:invite", "user:remove"],
  member: ["device:read", "device:write"],
  guest: ["device:read"],
}

export class RBACService {
  hasPermission(userRoles: Role[], requiredPermission: Permission): boolean {
    return userRoles.some((role) => rolePermissions[role]?.includes(requiredPermission))
  }

  canControlDevice(userRoles: Role[], action: "read" | "write" | "delete"): boolean {
    const permission = `device:${action}` as Permission
    return this.hasPermission(userRoles, permission)
  }

  canManageHome(userRoles: Role[]): boolean {
    return this.hasPermission(userRoles, "home:manage")
  }

  canInviteUsers(userRoles: Role[]): boolean {
    return this.hasPermission(userRoles, "user:invite")
  }

  canRemoveUsers(userRoles: Role[]): boolean {
    return this.hasPermission(userRoles, "user:remove")
  }

  getHighestRole(roles: Role[]): Role {
    const roleHierarchy: Role[] = ["owner", "member", "guest"]
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role
      }
    }
    return "guest"
  }
}

export const rbacService = new RBACService()
