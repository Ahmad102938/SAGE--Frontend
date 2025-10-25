// Local storage implementation for authentication data
// This structure mirrors the database schema for easy migration later

export interface User {
  user_id: number
  email: string
  password_hash: string
  full_name: string
  created_at: string
}

export interface Home {
  home_id: number
  name: string
  address: string
  created_at: string
}

export interface UserHomeRole {
  id: number
  user_id: number
  home_id: number
  role: "owner" | "member" | "guest"
}

export interface Device {
  device_id: number
  home_id: number
  name: string
  type: string
  status: Record<string, any>
  created_at: string
}

export interface Command {
  command_id: number
  user_id: number
  device_id: number
  command: string
  params: Record<string, any>
  status: "pending" | "success" | "error"
  response: string
  created_at: string
  executed_at?: string
}

export interface RefreshToken {
  token_id: number
  user_id: number
  token: string
  expires_at: string
  created_at: string
}

class AuthStorage {
  private getStorageKey(table: string): string {
    return `iot_auth_${table}`
  }

  private getNextId(table: string): number {
    const items = this.getAll(table)
    return items.length > 0 ? Math.max(...items.map((item: any) => item[`${table.slice(0, -1)}_id`] || item.id)) + 1 : 1
  }

  getAll(table: string): any[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(this.getStorageKey(table))
    return data ? JSON.parse(data) : []
  }

  create(table: string, data: any): any {
    if (typeof window === "undefined") return null

    const items = this.getAll(table)
    const idField = table === "user_home_roles" ? "id" : `${table.slice(0, -1)}_id`
    const newItem = {
      ...data,
      [idField]: this.getNextId(table),
      created_at: new Date().toISOString(),
    }

    items.push(newItem)
    localStorage.setItem(this.getStorageKey(table), JSON.stringify(items))
    return newItem
  }

  findOne(table: string, condition: (item: any) => boolean): any {
    const items = this.getAll(table)
    return items.find(condition) || null
  }

  findMany(table: string, condition: (item: any) => boolean): any[] {
    const items = this.getAll(table)
    return items.filter(condition)
  }

  update(table: string, condition: (item: any) => boolean, updates: any): any {
    if (typeof window === "undefined") return null

    const items = this.getAll(table)
    const index = items.findIndex(condition)

    if (index !== -1) {
      items[index] = { ...items[index], ...updates }
      localStorage.setItem(this.getStorageKey(table), JSON.stringify(items))
      return items[index]
    }
    return null
  }

  delete(table: string, condition: (item: any) => boolean): boolean {
    if (typeof window === "undefined") return false

    const items = this.getAll(table)
    const filteredItems = items.filter((item) => !condition(item))

    if (filteredItems.length !== items.length) {
      localStorage.setItem(this.getStorageKey(table), JSON.stringify(filteredItems))
      return true
    }
    return false
  }

  clear(): void {
    if (typeof window === "undefined") return

    const keys = ["users", "homes", "user_home_roles", "devices", "commands", "refresh_tokens"]
    keys.forEach((key) => {
      localStorage.removeItem(this.getStorageKey(key))
    })
  }
}

export const authStorage = new AuthStorage()
