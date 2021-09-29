// These types aren't complete, they just contain the fields we need
export interface DiscordRole {
  id: string
  name: string
}

export interface DiscordGuild {
  id: string
  roles: DiscordRole[]
}

export interface DiscordMember {
  roles: string[]
  user: DiscordUser
}

export interface DiscordUser {
  id: string
  username: string
  avatar: string
}
