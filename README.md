# Gatekeep (on Cloudflare Workers)

This is a port of the [standalone Gatekeep](https://github.com/BENDERFACToRY/gatekeeper) project
to the [Cloudflare Workers](https://cloudflare.com/workers) platform.

# Setup

The discord tokens and hasura keys are stored as "secret keys".  Create them like this:

> npx wrangler --env local secret put DISCORD_BOT_TOKEN
> npx wrangler --env local secret put HASURA_JWT_KEY

(Before deploying, also run the above commands but without the `--env local` flag)

(Note the HASURA_JWT_KEY is not the full json object, it's just the signing key as a string)

You'll also need to make sure the KV namespaces are created:

> npx wrangler kv:namespace create KV_GUILD_CACHE 
> npx wrangler kv:namespace create KV_GUILD_CACHE --preview

You'll need to make sure that the KV namespace IDs in wrangler.toml are correct for your account.

#