/// These globals will be injected by cloudflare, and represent our environment variables and secrets.
declare global {
  const DISCORD_BOT_TOKEN: string // this is a secret variable
  const DISCORD_GUILD_ID: string // this is cleartext, defined in wrangler.toml

  const KV_GUILD_CACHE: KVNamespace
}

import { gql } from '@apollo/client/core'
import { Router } from 'itty-router'
import { DiscordGuild, DiscordMember } from './types'
import { createApolloClient, createToken } from './util'

class DiscordAPI {
  static DISCORD_API = 'https://discord.com/api/v9'

  token: string
  bot: boolean

  constructor(token: string, bot: boolean) {
    this.token = token
    this.bot = bot
  }

  async fetch(
    url: string,
    { headers = {}, ...options } = {},
  ): Promise<Response> {
    const auth_type = this.bot ? 'Bot' : 'Bearer'
    return fetch(`${DiscordAPI.DISCORD_API}${url}`, {
      headers: {
        Authorization: `${auth_type} ${this.token}`,
        ...headers,
      },
      ...options,
    })
  }

  async getGuildInfo(guildId: string): Promise<DiscordGuild> {
    const res = await this.fetch(`/guilds/${guildId}`)
    const data = await res.json()
    return data
  }

  async getGuildMember(
    guildId: string,
    userId: string,
  ): Promise<DiscordMember | { code: number; message: string }> {
    const res = await this.fetch(`/guilds/${guildId}/members/${userId}`)
    const data = await res.json()
    return data
  }
}

const SET_ROLES = gql`
  mutation setRoles($id: String!, $roles: jsonb!) {
    update_discord_by_pk(pk_columns: { id: $id }, _set: { roles: $roles }) {
      id
      roles
    }
  }
`

export const router = Router()
router.get('/check/:userId', async ({ params = {} }) => {
  if (params.userId) {
    // make sure the userId is numeric
    if (!params.userId.match(/^\d+$/)) {
      return new Response('Error: Invalid userId', { status: 400 })
    }

    const api = new DiscordAPI(DISCORD_BOT_TOKEN, true)

    // The KV_GUILD_CACHE namespace will store info on guilds, each cached for 24 hours.
    let cached_guild_info: DiscordGuild | null = await KV_GUILD_CACHE.get(
      DISCORD_GUILD_ID,
      { type: 'json' },
    )
    if (cached_guild_info === null) {
      // we need to fetch the info and cache it
      const guild_info = await api.getGuildInfo(DISCORD_GUILD_ID)
      console.log('Cacheing guild info')
      KV_GUILD_CACHE.put(DISCORD_GUILD_ID, JSON.stringify(guild_info), {
        expirationTtl: 86400,
      })
      cached_guild_info = guild_info
    }

    const role_map = Object.fromEntries(
      cached_guild_info.roles.map((role) => [role.id, role.name]),
    )

    // get member info for this user
    const member_info = await api.getGuildMember(
      DISCORD_GUILD_ID,
      params.userId,
    )
    console.log('member info:', member_info)
    // map guild into into names
    if ('message' in member_info) {
      // no such user?
      return new Response(`Error: ${member_info.message}`, { status: 400 })
    }
    const member_roles = member_info.roles.map((role) => role_map[role])
    console.log(member_roles)

    // Auth as the gatekeeper, which only has permissinos to the `id` and `roles` fields.
    const JWTUser = {
      id: 'gatekeeper',
      name: 'gatekeeper',
      roles: ['gatekeeper'],
      default_role: 'gatekeeper',
    }

    const token = await createToken(JWTUser, member_info.user.id)

    const client = createApolloClient(token)

    const _result = await client.mutate({
      mutation: SET_ROLES,
      variables: { id: member_info.user.id, roles: member_roles },
    })

    return new Response(JSON.stringify(member_roles), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } else {
    return new Response('Missing userId', { status: 400 })
  }
})

router.get('/whoami', () => {
  return new Response(`hello`)
})
router.get('*', () => {
  return new Response(`vault gatekeeper`)
})
