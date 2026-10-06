# Swagger implementation

## Included

- Environment-controlled Swagger bootstrap
- OpenAPI UI, JSON, and YAML endpoints
- Stable operation IDs for generated clients
- JWT bearer authentication scheme (`access-token`)
- Module tags for all active controllers
- Swagger CLI plugin for DTO schema generation
- Validation/error schema models
- Excel multipart upload contract
- Explicit public contracts for OTP, Bale webhook, and health endpoints
- Persisted authorization and developer-friendly Swagger UI settings

## URLs

- `/docs`
- `/docs/openapi.json`
- `/docs/openapi.yaml`

## Install

Run `npm install` once after extracting the project so npm resolves the newly added `@nestjs/swagger` dependency and refreshes the lockfile metadata.

## Production

Set `SWAGGER_ENABLED=false` when API documentation must not be exposed. Otherwise protect `/docs` at the reverse proxy or network layer if it should only be available internally.
