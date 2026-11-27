#!/usr/bin/env bash
set -euo pipefail
root=${1:?deployment directory}
prefix=${2:?GHCR image prefix}
tag=${3:?commit SHA}
[[ "$tag" =~ ^[a-f0-9]{40}$ ]]
cd "$root"
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is active'; exit 1; }
[[ -s .env.test && -s certs/origin.pem && -s certs/origin.key ]] || { echo 'Missing .env.test or TLS files'; exit 1; }
incoming=".incoming/$tag"
export GHCR_PREFIX="$prefix" IMAGE_TAG="$tag"
# Do not change the running configuration before all images are downloaded.
compose=(docker compose --project-directory "$root" --env-file "$root/.env.test" -f "$root/$incoming/docker-compose.test.yml")
"${compose[@]}" config --quiet
"${compose[@]}" pull
mkdir -p nginx
if [[ -f .release.env && ! -f .release.pending.env ]]; then
  cp .release.env .release.previous.env
  mkdir -p .previous/nginx
  cp docker-compose.test.yml .previous/docker-compose.test.yml
  cp nginx/nginx.httpskasra.conf .previous/nginx/nginx.httpskasra.conf
fi
cp "$incoming/docker-compose.test.yml" docker-compose.test.yml
cp "$incoming/nginx/nginx.httpskasra.conf" nginx/nginx.httpskasra.conf
printf 'GHCR_PREFIX=%s\nIMAGE_TAG=%s\n' "$prefix" "$tag" > .release.pending.env
compose=(docker compose --env-file .env.test --env-file .release.pending.env -f docker-compose.test.yml)
if ! "${compose[@]}" up -d --no-build --wait --wait-timeout 600; then
  "${compose[@]}" ps -a || true
  echo 'Deployment failed; inspect service logs and .release.pending.env.' >&2
  exit 1
fi
"${compose[@]}" exec -T nginx nginx -t
"${compose[@]}" exec -T nginx nginx -s reload
"${compose[@]}" ps -a
mv .release.pending.env .release.env
rm -rf "$incoming"
