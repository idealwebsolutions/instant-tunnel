# instant-tunnel
Self-hosted infrastructure as a service for testing/development purposes

![Screenshot](https://user-images.githubusercontent.com/24352255/95298441-9dfc1b80-086b-11eb-8667-34afc3d398b5.png)

## Pre-requisites
`cloudflared` must be in `PATH` or defined as an env variable `CLOUDFLARED_PATH` prior to usage. Download [here](https://developers.cloudflare.com/argo-tunnel/downloads).
Uses whatever redis server is running locally, if not define `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD` with the appropriate values.

## Build
To bootstrap

    npm run bootstrap

To build all packages

    npm run build-all

## Deployment
Two choices, recommended `Dockerfile` is ready to use (don't forget to include redis configuration). Otherwise try the following in (`/packages/app`):

    npm run start

## Motives
There's several upsides to using Cloudflare Argo ([see here](https://www.cloudflare.com/products/argo-smart-routing/)) but here are my own:
- Wanted to utilize old/unused devices sitting around and spend less on external hosting services. Free tier limits mostly suck.
- Build your own platform with similar functionality to Heroku or Google App Engine, except self-hosted and completely free.
- Host a FaaS platform similar to AWS or Azure using [OpenFaaS](https://github.com/openfaas/faas) by routing Cloudflare Argo to your own serverless farm. Checkout demo link to see OpenFaaS in use.

## TODO
App could use some improvements visually, will work on it incrementally as necessary to polish. Suggestions are welcome. 
- Add alerts for timeouts
- Add logging to each tunnel as well as uptime, etc
- Include area/page to override global options (server)

## License
MIT