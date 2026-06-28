---
icon: material/login
---
# Authentication

PostgreSQL servers support many authentication mechanisms. PgDog supports a subset of those, with the aim to support all of them over time. Since PostgreSQL 14, `scram-sha-256` is widely used to encrypt passwords and PgDog supports this algorithm for both client and server connections.

Authentication is **enabled** by default. Applications connecting to PgDog must provide a username and password, configured in [`users.toml`](../configuration/users.toml/users.md).


## Supported methods

PgDog implements a subset of authentication methods supported by Postgres and some others commonly used in the industry. The following table summarizes the current level of support for client and server connection authentication methods:

| Authentication method | Client connections | Server connections |
|-|-|-|
| `scram-sha-256` | :material-check-circle-outline: | :material-check-circle-outline: |
| `scram-sha-256-plus` | No | No |
| `md5` | :material-check-circle-outline: | :material-check-circle-outline: |
| `plain` | :material-check-circle-outline: | :material-check-circle-outline: |
| `trust` | :material-check-circle-outline: | :material-check-circle-outline: |
| [AWS RDS IAM](#rds-iam-authentication) | No | :material-check-circle-outline: |
| [Azure Workload Identity](#azure-workload-identity-authentication) | No | :material-check-circle-outline: |

!!! note "Contributions"
    PgDog is an open source project. If you'd like to add an authentication method we don't currently support,
    please [open an issue](https://github.com/pgdogdev/pgdog/issues) to discuss.

## Client authentication

By default, client connections will use password authentication encrypted with `scram-sha-256`. This method is secure and recommended for production usage. PgDog supports using other methods, e.g., `md5` and `plain`, which you can change with configuration:

=== "pgdog.toml"
    ```toml
    [general]
    auth_type = "scram"
    ```
=== "Helm chart"
    ```yaml
    authType: scram
    ```

The following password authentication algorithms are available for client connections:

| Configuration | Description |
|-|-|
| `scram` | The most secure password encryption, used by default in PostgreSQL. |
| `md5` | Deprecated and insecure, but an order of magnitude faster than SCRAM. Still commonly used with connection poolers (e.g., pgbouncer). |
| `plain` | No encryption is used and the password is sent as-is. Commonly used with TLS-encrypted connections. |
| `trust` | Disables password authentication and allows all users to login. |


### SCRAM performance

The SCRAM-SHA-256 algorithm is computationally expensive and will use a considerable amount of CPU time. This is by design, since it makes passwords difficult to brute-force. However, if your application is frequently creating new connections to the database, like serverless apps running on Vercel, Cloudflare workers, etc., this could also have a latency impact.
    
If your application is affected by this, consider enabling [TLS](tls.md) and using the `plain` authentication method instead. Modern CPUs implement TLS algorithms in hardware which makes them efficient and fast.

## Server authentication

The server authentication method is controlled by PostgreSQL. PgDog will use whatever method Postgres requests during connection creation, which is configurable in the [`pg_hba.conf`](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html) file on the server.

PgDog currently supports four authentication methods for server connections:

| Method | Description |
|-|-|
| Password authentication | PgDog sends the password using one of the supported [password encryption](#client-authentication) algorithms. |
| [AWS RDS IAM](#rds-iam-authentication) | PgDog requests a temporary password from AWS IAM and uses that for password authentication instead. |
| [Azure Workload Identity](#azure-workload-identity-authentication) | Same method as AWS RDS IAM, except supported on Azure. |
| Hashicorp Vault | PgDog connects to a configured instance of Hashicorp Vault and uses the provided username and password. |

### RDS IAM authentication

PgDog supports using temporary credentials from [AWS IAM](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) and using those to connect to RDS PostgreSQL (and Aurora) instances.

Under the hood, PgDog is using the [AWS RDS SDK](https://docs.rs/aws-sdk-rds/latest/aws_sdk_rds/) to fetch credentials at runtime. The SDK can retrieve them from the environment and from the EC2 IAM API. For example, if you're deploying PgDog in [Kubernetes](../installation.md#kubernetes), you just need to assign its container an IAM role with the right permissions.

To use RDS IAM authentication, configure it on each user in [`users.toml`](../configuration/users.toml/users.md):

=== "users.toml"
    ```toml
    [[users]]
    name = "pgdog"
    database = "prod"
    password = "hunter2"
    server_auth = "rds_iam"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: pgdog
        database: prod
        password: hunter2
        serverAuth: rds_iam
    ```

### Azure Workload Identity authentication

PgDog supports using temporary credentials provided by Azure Workload Identity to connect to PostgreSQL running on Azure. This uses the [Azure SDK](https://github.com/Azure/azure-sdk-for-rust) and supports fetching credentials from the environment.

To use Workload Identity authentication, configure it on each user in [`users.toml`](../configuration/users.toml/users.md):

=== "users.toml"
    ```toml
    [[users]]
    name = "pgdog"
    database = "prod"
    password = "hunter2"
    server_auth = "azure_workload_identity"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: pgdog
        database: prod
        password: hunter2
        serverAuth: azure_workload_identity
    ```


### Hashicorp Vault

!!! info "TODO: Documentation"
    Support for Hashicorp Vault authentication has been added in [v0.1.46](https://github.com/pgdogdev/pgdog/releases/tag/v0.1.46). It has not been documented or thoroughly tested yet.

## Configuring users

The [`users.toml`](../configuration/users.toml/users.md) configuration file follows a TOML list structure. To allow a user to connect to PgDog, add a `[[users]]` section with the user name, password and a corresponding database name (located in [`pgdog.toml`](../configuration/pgdog.toml/databases.md)) to `users.toml`, for example:

=== "users.toml"
    ```toml
    [[users]]
    name = "pgdog"
    database = "pgdog"
    password = "hunter2"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: pgdog
        database: pgdog
        password: hunter2
    ```

The `database` parameter must match the name of one of the databases configured in [`pgdog.toml`](../configuration/pgdog.toml/databases.md). For example:

=== "users.toml"
    ```toml
    [[users]]
    name = "alice"
    database = "prod"
    password = "hunter2"
    ```
=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    ```

The `database` parameter in the `[[users]]` entry ("prod") matches the `[[databases]]` entry with the same `name` ("prod"). If you add a user with a `database` name not specified in `pgdog.toml`, that user entry will be ignored by PgDog at runtime and that user will not be able to connect.

The same username, database name and password will also be used by PgDog to connect to PostgreSQL. This makes configuration simpler since the Postgres connection options used by applications don't have to change when PgDog is deployed for the first time.

### Overriding server credentials

If you want to use a different username or password for PgDog to connect to Postgres, you can override them by specifying the `server_user` and `server_password` parameters in the same user configuration entry:

=== "users.toml"
    ```toml
    [[users]]
    name = "pgdog"
    password = "hunter2"
    database = "pgdog"
    server_user = "bob"
    server_password = "opensesame"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: pgdog
        password: hunter2
        database: pgdog
        serverUser: bob
        serverPassword: opensesame
    ```

This allows you to separate client and server authentication credentials. In case your applications accidentally leak their credentials (e.g., by committing them to git), you only need to rotate them in the PgDog configuration, without having to take downtime to change passwords in PostgreSQL.

## Passthrough authentication

With passthrough authentication, instead of storing passwords in `users.toml`, PgDog connects to PostgreSQL using the credentials provided by the client. Passthrough authentication simplifies PgDog deployments by using a single source of truth for user credentials and doesn't require passwords to be stored outside the database or the application.

Passthrough authentication is **disabled** by default and can be enabled with configuration:

=== "pgdog.toml"
    ```toml
    [general]
    passthrough_auth = "enabled"
    ```
=== "Helm chart"
    ```yaml
    passthroughAuth: enabled
    ```

Since PgDog doesn't store the server password anymore, using passthrough authentication will require clients to send passwords in plain text. Therefore, PgDog will automatically change the `auth_method` to `plain` and ignore the setting configured in `pgdog.toml`. 

When a client connects to PgDog for the first time, it will create a connection pool for the database/user pair and the provided password. The database specified by the client must still exist in [`pgdog.toml`](../configuration/pgdog.toml/databases.md).

When configuration is reloaded, connection pools created with passthrough auth are temporarily removed and immediately re-created when a connected client executes a query. As long as `passthrough_auth` is enabled between configuration changes, clients will not be impacted.

### Passthrough authentication security

Sending passwords in plain text over unencrypted connections is not great, even if PgDog and Postgres are on the same local network. For this reason, `passthrough_auth = "enabled"` will only work if PgDog is configured to use [TLS encryption](tls.md).

If you don't want to set up TLS (it has some impact on latency), you can override this behavior and send passwords via plain text and an unencrypted connection:

=== "pgdog.toml"
    ```toml
    [general]
    passthrough_auth = "enabled_plain"
    ```
=== "Helm chart"
    ```yaml
    passthroughAuth: enabled_plain
    ```

### Configuring user options

The most typical deployments of PgDog with passthrough authentication do not configure a `users.toml` at all. However, some user-specific options can only be configured in that file, for example, [server authentication](#server-authentication). To configure users with options and passthrough authentication, add them to `users.toml` without specifying a password:

=== "users.toml"
    ```toml
    [[users]]
    name = "alice"
    pool_size = 10
    server_auth = "rds_iam"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: alice
        poolSize: 10
        serverAuth: rds_iam
    ```

Passthrough authentication must still be enabled in `pgdog.toml`. PgDog will use the password supplied by the client and create a connection pool dynamically when they connect for the first time.

### Changing passwords

Connection pools created dynamically with passthrough authentication will have a static password. If that password is changed inside the server (e.g., by running `ALTER USER [...] PASSWORD` command), PgDog will no longer be able to connect to the database. To change the password in PgDog without restarting the proxy, you can configure the passthrough auth passwords to be changeable:

=== "pgdog.toml"
    ```toml
    [general]
    passthrough_auth = "enabled_allow_change"
    ```
=== "Helm chart"
    ```yaml
    passthroughAuth: enabled_allow_change
    ```

When a client connects with a different password to what's currently stored in PgDog's memory, it will re-create the connection pool with the new password and re-connect to the server.

!!! warning "Trusted clients only"
    Allowing clients to change their passwords at runtime should never be used with PgDog deployments open to the Internet. This feature is built for convenience to allow almost zero-downtime password rotation in Postgres and, if used incorrectly, can open up the proxy to a denial-of-service attack.

#### Plain text connections

If passthrough authentication is used without [TLS](tls.md), set it to `"enabled_plain_allow_change"` instead:

=== "pgdog.toml"
    ```toml
    [general]
    passthrough_auth = "enabled_plain_allow_change"
    ```
=== "Helm chart"
    ```yaml
    passthroughAuth: enabled_plain_allow_change
    ```
    
## Password security

Since PgDog stores passwords in a separate configuration file (i.e., `users.toml`), it's possible to encrypt them at rest without compromising the DevOps experience. For example, Kubernetes provides built-in [secrets management](https://kubernetes.io/docs/concepts/configuration/secret/) to manage this, and our [Helm chart](../installation.md#kubernetes) automatically takes advantage of it.
