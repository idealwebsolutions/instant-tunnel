FROM golang:alpine as gobuild

ARG GOARCH
ARG GOARM

RUN apk update; \
    apk add git gcc build-base; \
    go get -v github.com/cloudflare/cloudflared/cmd/cloudflared

WORKDIR /go/src/github.com/cloudflare/cloudflared/cmd/cloudflared

RUN GOARCH=${GOARCH} GOARM=${GOARM} go build ./

FROM node:lts-alpine

WORKDIR /usr/src/app
COPY . /opt/instant-tunnel

WORKDIR /opt/instant-tunnel

RUN apk update; apk add python2 make g++

RUN npm install
RUN npm run bootstrap
RUN npm run build-all

WORKDIR /opt/instant-tunnel/packages/app

COPY --from=gobuild /go/src/github.com/cloudflare/cloudflared/cmd/cloudflared/cloudflared /usr/local/bin/cloudflared

CMD ["npm", "run", "start"]
