---
icon: material/console-line
---

# CLI

The control plane comes with a command-line interface (CLI). It allows you to create users, access tokens, and control other aspects of its operation.

## Commands

The control plane CLI supports the following commands:

| Command | Description |
|-|-|
| [`onboard`](#onboarding) | Create a new user and PgDog deployment. This is typically the first command you need to run when installing the control plane. |
| `migrate` | Run PostgreSQL database migrations. Run this after upgrading your PgDog Enterprise version. |
| `server` | Run the control plane server. This is executed by default when the `control` executable is running. |
| `token` | Create an access token for PgDog to connect to the control plane. |

### Onboarding

The `onboard` command is an all-in-one command to create a PgDog authentication token and a web UI user associated with that token. It's typical to execute this command right after installing the control plane, for example:

```bash
control onboard \
  --email demo@pgdog.dev \
  --password demopass \
  --token 644b527c-b9d6-4fb2-9861-703bad871ec0 \
  --name Demo
```

| Argument | Description |
|-|-|
| `email` | The email for the new user. |
| `password` | The password for the new user. |
| `token` | The authentication token, which grants PgDog access to the control plane to upload telemetry. |
| `name` | The name for the deployment. |
| `generate-token` | If `token` is not specified, this will generate a random one and print it to the terminal. |

This command is idempotent: if the user exists already, this will update its password. If the token already exists, the user will be associated to that token. If all of these are already true, no changes will be made.
