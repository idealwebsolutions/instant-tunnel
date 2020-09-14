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

COPY . /opt/instant-tunnel/packages/app
WORKDIR /opt/instant-tunnel/packages/app

COPY --from=gobuild /go/src/github.com/cloudflare/cloudflared/cmd/cloudflared/cloudflared /usr/local/bin/cloudflared

CMD ["/bin/sh", "-c",  "/usr/local/bin/cloudflared", "--version"]
# Run and build source
# RUN wget -O- https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-linux-arm.tgz | tar xz

#CMD ["npm", "run", "start"]
