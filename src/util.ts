import { SignJWT } from 'jose/jwt/sign'
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} from '@apollo/client/core/index.js'

declare global {
  const HASURA_JWT_KEY: string // our secret signing key
  const GRAPHQL_ENDPOINT: string // our graphql endpoint, defined in wrangler.toml
}

export async function createToken(
  token: Record<string, unknown>,
  subject: string,
): Promise<string> {
  const enc = new TextEncoder()

  const jwt = await new SignJWT({ ...token })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1 day')
    .setIssuer('auth')
    .setSubject(subject)
    .sign(enc.encode(HASURA_JWT_KEY))

  return jwt
}

export function createApolloClient(authToken: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: GRAPHQL_ENDPOINT,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }),
    cache: new InMemoryCache(),
  })
}
