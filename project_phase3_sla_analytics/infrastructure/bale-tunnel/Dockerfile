FROM cloudflare/cloudflared:latest AS cloudflared

FROM alpine:3.22

RUN apk add --no-cache \
    ca-certificates \
    curl \
    grep \
    coreutils

COPY --from=cloudflared /usr/local/bin/cloudflared /usr/local/bin/cloudflared
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]