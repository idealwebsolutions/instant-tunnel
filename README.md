# instant-tunnel
Deploy apps using your own testing/development environment without the need for an external host

![Screenshot](https://user-images.githubusercontent.com/24352255/95298441-9dfc1b80-086b-11eb-8667-34afc3d398b5.png)

## Pre-requisites
`cloudflared` must be in `PATH` or defined as an env variable `CLOUDFLARED_PATH` prior to usage. Download [here](https://developers.cloudflare.com/argo-tunnel/downloads).
Uses whatever postgresql server is running locally depending on `process.env.NODE_ENV`, if not define `DATABASE_HOST`, `DATABASE_USER` and `DATABASE_PASSWORD` with the appropriate values.

## Build
To bootstrap

    npm run bootstrap

To build all packages

    npm run build-all

## Migrations
To run migrations in production, first move to core package: `cd packages/core`

    npm run migrate:latest --env production

To rollback changes

    npm run migrate:rollback --env production

## Deployment
Two choices, recommended `Dockerfile` is ready to use (don't forget to include postgresql configuration). Otherwise try the following in (`/packages/app`):

    npm run start

If using docker, it's recommended to store any sensitive environment values in [docker secrets](https://docs.docker.com/engine/swarm/secrets/).

## Motives
There's several use cases to using Cloudflare Argo's Free Plan ([see here](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/trycloudflare#faq)) but here are my own:
- Wanted to utilize old/unused devices sitting around and spend less on external hosting services. Free tier limits mostly suck.
- Build your own testing platform with similar functionality to Heroku or Google App Engine, except self-hosted and completely free.
- Host a FaaS platform similar to AWS or Azure using [OpenFaaS](https://github.com/openfaas/faas) by routing Cloudflare Argo to your own serverless farm. Checkout demo link to see OpenFaaS in use.

## TODO
App could use some improvements visually, will work on it incrementally as necessary to polish. Suggestions are welcome. 
- Add alerts for timeouts
- Add logging to each tunnel as well as uptime, etc
- Include area/page to override global options (server)

## License
MIT
