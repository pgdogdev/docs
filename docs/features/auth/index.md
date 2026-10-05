---
icon: material/login
---

# Authentication

PostgreSQL servers support many authentication mechanisms. PgDog supports a subset of those, with the aim to support all of them over time.

Additionally, PgDog supports some non-standard algorithms commonly used in the industry, like RDS IAM, Azure Identity, and others. This makes it relatively easy to deploy to a cloud environment without affecting security.

## Supported authentication

The following table summarizes the current level of support for client and server connection authentication methods:

| Authentication method                        | Client connections              | Server connections              |
| -------------------------------------------- | ------------------------------- | ------------------------------- |
| [Password](password.md)                      | :material-check-circle-outline: | :material-check-circle-outline: |
| Trust (no password)                          | :material-check-circle-outline: | :material-check-circle-outline: |
| [AWS RDS IAM](rds-iam.md)                    | No                              | :material-check-circle-outline: |
| [Azure Workload Identity](azure-workload.md) | No                              | :material-check-circle-outline: |
| [HashiCorp Vault](hashicorp-vault.md)        | No                              | :material-check-circle-outline: |
| [Mutual TLS (mTLS)](mtls.md)                 | :material-check-circle-outline: | :material-check-circle-outline: |

!!! note "Contributions"

    PgDog is an open source project. If you'd like to add an authentication method we don't currently support,
    please [open an issue](https://github.com/pgdogdev/pgdog/issues) to discuss.

## Read more

{{ next_steps_links([
    ("Configuring users", "/features/auth/configuration/", "Configure users with authentication options and other settings."),
    ("Password authentication", "/features/auth/password/", "Configure password authentication with SCRAM and other support algorithms."),
    ("RDS IAM", "/features/auth/rds-iam/", "Passwordless authentication to RDS PostgreSQL and Aurora databases."),
    ("mTLS", "/features/auth/mtls/", "Passwordless authentication for client and server connenctions."),
]) }}
