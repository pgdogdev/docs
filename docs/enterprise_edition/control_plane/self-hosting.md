---
icon: material/server
---

# Self-hosting

Self-hosting the [control plane](index.md) (not managed by PgDog) is supported and requires a bit of configuration and setup.

## Getting started

The easiest way to run the control plane is using our Docker image. It contains both the backend and the web UI and can be deployed as standalone application, either in Kubernetes or on any machine with Docker installed.

### Dependencies

The control plane has two dependencies:

1. A PostgreSQL database used to store historical metrics, query statistics, users and other metadata
2. A Redis database, used for synchronization and real-time metrics

If you're using our [Helm chart](#kubernetes), Redis is deployed automatically, while the PostgreSQL database has to be created manually.

### Kubernetes

If you're already running PgDog in Kubernetes using our [Helm chart](../../installation.md#kubernetes), you can deploy the control plane into the same cluster using our Enterprise Helm chart:

```
helm repo add pgdogdev-ee https://helm-ee.pgdog.dev
helm install pgdogdev-ee/pgdog-control
```

The following values should be set in `values.yaml`:

| Value | Description |
|-|-|
| `image.tag` | The Docker tag for the control plane image. |
| `ingress.host` | The DNS host for the control plane, e.g., `pgdog.database.internal`. |
| `env` | A key/value mapping of [environment variables](#configuration) passed to the control plane application. |

For example:

```yaml
image:
  tag: main-ent
ingress:
  host: pgdog.database.internal
env:
  DATABASE_URL: postgres://user:password@[...]
```

### Configuration

!!! note "Helm chart"
    If you're using the [Helm chart](#kubernetes), all variables except `DATABASE_URL` are generated from settings in `values.yaml` and don't need to be configured manually.

The control plane is configured via environment variables. The following variables are required for it to work correctly:

| Environment variable | Description | Example |
|-|-|-|
| `DATABASE_URL` | URL pointing to the Postgres database used for storing control plane data. | `postgres://user:password@host:5432/db` |
| `SESSION_KEY` | Secret key used to encrypt user session cookies. Can be any value, as long as it's at least 64 bytes. | `abcsf32a[...]` |
| `REDIS_URL` | URL pointing to the Redis database used for synchronization. | `redis://127.0.0.1/0` |
| `FRONTEND_URL` | The URL where the frontend application is hosted. This defaults to `ingress.host` if you're using the Helm chart. | `http://pgdog.internal` |



#### Session key

The control plane requires a 64 bytes randomly generated session key to encrypt user session cookies. If you're not using our Helm chart, you can generate one with just one line of Python:

=== "Command"
    ```bash
    python3 -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
    ```
=== "Output"
    ```
    1b80a3cc1640a37b59b7dd591749ebd6532b720712e9ae2c37cb5572828ed5135332595decdadf702f919d5b58099135fbd4344979c2a0e2cf514ff3c6e640ac
    ```

### Authentication

The control plane web UI supports two authentication methods:

1. Email and password
2. OAuth2

Password authentication works out of the box and requires no additional setup beyond creating users via the [CLI](cli.md).

For OAuth2, you need to configure each provider, and depending on which provider you choose, different environment variables need to be set:

=== "Google"
    | Environment variable | Description |
    |-|-|
    | `GOOGLE_CLIENT_ID` | Google OAuth2 client identifier. You can obtain one by creating an OAuth2 application in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |
    | `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret. |
    | `GOOGLE_REDIRECT_URL` | OAuth redirect URL. It should be set to the following: `${FRONTEND_URL}/google/oauth/callback`. |

=== "GitHub"
    | Environment variable | Description |
    |-|-|
    | `GITHUB_CLIENT_ID` | GitHub OAuth2 client identifier. You can obtain one by creating an OAuth application in the [Developer Settings](https://github.com/settings/developers) in your GitHub account. |
    | `GITHUB_CLIENT_SECRET` | GitHub OAuth2 client secret. |
    | `GITHUB_REDIRECT_URL` | OAuth redirect URL. It should be set to the following: `${FRONTEND_URL}/github/oauth/callback`. |

!!! note "OAuth2 redirect"
     The redirect URL (e.g., `GOOGLE_REDIRECT_URL`) is set automatically by the Helm chart. You only need to set it if you're self-hosting using a different orchestration mechanism.

#### Creating users

You can create a user using the [CLI](cli.md) [`onboard`](cli.md#onboarding) command. It works for both password-based and OAuth2 authentication mechanisms.
