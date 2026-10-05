# Password authentication

Since PostgreSQL 14, `scram-sha-256` is widely used to encrypt passwords. PgDog supports this algorithm for both client and server connections. When enabled, applications connecting to PgDog must provide a username and password, either configured in [`users.toml`](../../configuration/users.toml/users.md) or via [passthrough](#passthrough-authentication) authentication.

## Configuration

Password authentication is configured in [`users.toml`](../../configuration/users.toml/users.md), by specifying a list of users and passwords, for example:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "user_one"
    database = "postgres"
    password = "super-secret"

    [[users]]
    name = "user_two"
    database = "postgres"
    password = "definitely-secret"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: user_one
        database: postgres
        password: super-secret
      - name: user_two
        database: postgres
        password: definitely-secret
    ```

Each user will have its own dedicated connection pool. The password will be used to authenticate users connecting to PgDog and for connecting to Postgres. This is the most common use case, requiring no changes to your users in order to deploy PgDog between your application and the database.

## Supported algorithms

PgDog supports multiple password encryption algorithms commonly used by modern PostgreSQL servers and applications:

| Password encryption | Client connections              | Server connections              |
| ------------------- | ------------------------------- | ------------------------------- |
| SCRAM-SHA-256       | :material-check-circle-outline: | :material-check-circle-outline: |
| SCRAM-SHA-256-PLUS  | :material-check-circle-outline: | No                              |
| MD5                 | :material-check-circle-outline: | :material-check-circle-outline: |
| Plain               | :material-check-circle-outline: | :material-check-circle-outline: |
| Trust (no password) | :material-check-circle-outline: | :material-check-circle-outline: |

!!! note "SCRAM performance"

    The SCRAM-SHA-256 algorithm is computationally expensive and will use a considerable amount of CPU time. This is by design, since it makes passwords difficult to brute-force. However, if your application is frequently creating new connections to the database, like serverless apps running on Vercel, Cloudflare workers, etc., this could also have a latency impact.

    If your application is affected by this, consider enabling [TLS](tls.md) and using the `plain` authentication method instead. Modern CPUs implement TLS algorithms in hardware which makes them efficient and fast.

### Overriding database credentials

PgDog can connect to Postgres using different users and/or passwords than the application. This is useful when configuring multiple connection pools which re-use the same Postgres user, for example:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "user_one"
    database = "postgres"
    password = "super-secret"
    server_user = "postgres"
    server_password = "different-secret"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: user_one
        database: postgres
        password: super-secret
        serverUser: postgres
        serverPassword: different-secret
    ```

Applications connecting to PgDog will use the `user_one` user, meanwhile PgDog will connect to Postgres using the `postgres` user and a different password. Any combinations of these settings are supported, e.g., different passwords and same username, or same username and different passwords.

### Securing passwords

If you're using our [Helm chart](/installation.md), `users.toml` will be automatically stored as a `Secret`.

If you're using GitOps tools, e.g., ArgoCD, you can avoid exposing passwords in version control by using the `ExternalSecret` operator, which can store the contents of `users.toml` in a supported SecretStore, e.g., AWS Secrets Manager:

```yaml title="values.yaml"
externalSecrets:
  enabled: true
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  remoteRefs:
    - secretKey: users.toml
      remoteRef:
        key: pgdog/users
```

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

### How it works

Since PgDog doesn't store the server password anymore, using passthrough authentication will require clients to send passwords in plain text. Therefore, PgDog will automatically change the `auth_method` to `plain` and ignore the setting configured in `pgdog.toml`.

When a client connects to PgDog for the first time, it will create a connection pool for the database/user pair and the provided password. The database specified by the client must still exist in [`pgdog.toml`](../configuration/pgdog.toml/databases.md).

#### Configuration updates

When configuration is changed and reloaded, connection pools created with passthrough auth are temporarily removed and immediately re-created when a connected client executes a query. As long as `passthrough_auth` is enabled between configuration changes, clients will not be impacted.

### Security

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

#### Plaintext connections

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

## Passwords rotation

When using passwords, it's common practice to change passwords occasionally to protect the database against unauthorized access.

PostgreSQL password rotation has been a problem for a while, since it typically requires downtime in order to change the password across your entire stack.

PgDog makes it somewhat easier by allowing _multiple_ passwords to be specified for any entry in `users.toml`, for example:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "user_one"
    passwords = ["old-secret", "new-secret"]
    database = "postgres"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: user_one
        passwords: ["old-secret", "new-secret"]
        database: postgres
    ```

PgDog will accept connections from applications using all passwords specified in `passwords` and will attempt to connect to Postgres until a password is accepted.

Once the password is successfully rotated everywhere, the old entry can be removed from the configuration, without downtime. This works for SCRAM, md5 and plaintext authentication algorithms, so no additional configuration is required for this feature to work.
