## Development servers

- Always use Portly (`portly ...`) to start, stop, restart, inspect, or keep local development servers running.
- Start with `portly status --json`. Reuse a healthy managed server; if an in-scope server is running outside Portly, register it and use `portly take-over <project/server> --json`.
- Never launch persistent development servers directly, in the background, or through another supervisor.

Ports: web 5180, api 3020, postgres 5440, prod preview 3021, MinIO S3 9100, MinIO console 9101.

Local MinIO uses `bitnamilegacy/minio` and `bitnamilegacy/minio-client` because the official `minio/*` images were removed from Docker Hub and quay.io. They are frozen at the 2025-07 release; plan to swap to a maintained S3-compatible image (or a self-built MinIO) when needed. Data lives at `/bitnami/minio/data`.
