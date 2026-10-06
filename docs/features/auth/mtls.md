---
icon: material/certificate
---

# Mutual TLS (mTLS)

Mutual TLS is a feature that allows applications to authenticate to PgDog, and for PgDog to authenticate to PostgreSQL, without using a password. The underlying mechanism uses TLS (SSL) certificates and ensures the connection is encrypted and secure, by exchanging certificates in advance.

## How it works

mTLS is supported for both [client to PgDog](#client-mtls) and [PgDog to Postgres](#server-mtls) connections. Each is configured separately in `pgdog.toml`.

### Client mTLS

Client (application) to PgDog mutual TLS is configured by enabling [TLS](../tls.md) and specifying a client TLS certificate:

=== "pgdog.toml"

    ```toml
    [general]
    tls_certificate = "/path/to/cert.pem"
    tls_private_key = "/path/to/key.pem"
    tls_client_ca_certificate = "/path/to/client/cert.pem"
    tls_client_required = true
    ```

=== "Helm chart"

    ```yaml
    tlsCertificate: /path/to/cert.pem
    tlsPrivateKey: /path/to/key.pem
    tlsClientCaCertificate: /path/to/client/cert.pem
    tlsClientRequired: true
    ```

| Setting                     | Description                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tls_certificate`           | Path to the certificate provided to clients when they connect to PgDog.                                                       |
| `tls_private_key`           | Path to the certificate private key. Never share this with clients.                                                           |
| `tls_client_ca_certificate` | Path to the CA (certificate authority) certificate that signed the certificates the client provides to PgDog upon connecting. |
| `tls_client_required`       | Rejects any application connections that don't use TLS.                                                                       |

The client CA certificate can be self-signed, i.e., the clients can pass it directly when connecting or it can be used to sign other certificates. It can also be an intermediate, which allows you to build chains of trust without exposing your root certificate.

### Users

PgDog supports issuing different certificates to users in `users.toml`. To validate each user's certificate, PgDog will look at the SAN (Subject Alternative Name) DNSName attribute in the certificate, and match it to the configured user identity:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "pgdog"
    identity = "pgdog"
    database = "postgres"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: pgdog
        identity: pgdog
        database: postgres
    ```

=== "Certificate"

    ```text
    Subject: CN=pgdog
    X509v3 extensions:
        X509v3 Subject Alternative Name:
            DNS:pgdog
        X509v3 Extended Key Usage:
            TLS Web Client Authentication
    ```

#### Configuring apps

Applications that use mTLS to connect to PgDog can be configured to provide the certificate at connection creation. They can also be configured to validate the `tls_certificate` PgDog will provide in return.

##### Examples

Most PostgreSQL client drivers accept the following TLS connection [parameters](https://www.postgresql.org/docs/current/libpq-ssl.html):

| Parameter     | Description                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `sslcert`     | The application's client certificate, signed by a CA trusted by PgDog's `tls_client_ca_certificate`. |
| `sslkey`      | The private key matching the application's client certificate.                                       |
| `sslrootcert` | The CA certificate used by the application to verify PgDog's server certificate (`tls_certificate`). |

=== "Rails"

    ```yaml title="database.yml"
    production:
      adapter: postgresql
      host: pgdog.example.com
      port: 6432
      database: postgres
      username: pgdog
      sslmode: verify-full
      sslcert: /path/to/client/cert.pem
      sslkey: /path/to/client/key.pem
      sslrootcert: /path/to/server/ca.pem
    ```

=== "psycopg (Python)"

    ```python
    import psycopg

    conn = psycopg.connect(
        host="pgdog.example.com",
        port=6432,
        dbname="postgres",
        user="user_one",
        sslmode="verify-full",
        sslcert="/path/to/client/cert.pem",
        sslkey="/path/to/client/key.pem",
        sslrootcert="/path/to/server/ca.pem",
    )
    ```

=== "SQLAlchemy (asyncpg)"

    ```python
    import ssl

    from sqlalchemy.ext.asyncio import create_async_engine

    ssl_context = ssl.create_default_context(cafile="/path/to/server/ca.pem")
    ssl_context.load_cert_chain(
        certfile="/path/to/client/cert.pem",
        keyfile="/path/to/client/key.pem",
    )

    engine = create_async_engine(
        "postgresql+asyncpg://pgdog@pgdog.example.com:6432/postgres",
        connect_args={"ssl": ssl_context},
    )
    ```

=== "pgx (Go)"

    ```go
    import (
        "context"

        "github.com/jackc/pgx/v5"
    )

    ctx := context.Background()
    conn, err := pgx.Connect(ctx,
        "host=pgdog.example.com port=6432 dbname=postgres user=pgdog "+
            "sslmode=verify-full "+
            "sslcert=/path/to/client/cert.pem "+
            "sslkey=/path/to/client/key.pem "+
            "sslrootcert=/path/to/server/ca.pem",
    )
    ```

### Server mTLS

Much like [client mTLS](#client-mtls), PgDog can authenticate itself when connecting to PostgreSQL using a TLS certificate. PgDog can also validate the certificate offered by Postgres, ensuring the connection is validated from both ends:

=== "pgdog.toml"

    ```toml
    [general]
    tls_verify = "verify_full"
    tls_server_ca_certificate = "/path/to/ca/cert.pem"
    tls_server_certificate = "/path/to/cert.pem"
    tls_server_private_key = "/path/to/key.pem"
    ```

=== "Helm chart"

    ```yaml
    tlsVerify: verify_full
    tlsServerCaCertificate: /path/to/ca/cert.pem
    tlsServerCertificate: /path/to/cert.pem
    tlsServerPrivateKey: /path/to/key.pem
    ```

| Setting                     | Description                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tls_verify`                | Level of verification PgDog performs to validate the certificate provided by the server. Available options: `verify_ca` (only check certificate signature), `verify_full` (check certificate name matches database host). |
| `tls_server_ca_certificate` | Path to the CA (certificate authority) certificate (or intermediate) that signed the PostgreSQL server certificate.                                                                                                       |
| `tls_server_certificate`    | Path to the certificate PgDog will offer to Postgres for authentication.                                                                                                                                                  |
| `tls_server_private_key`    | Path to that certificate's private key.                                                                                                                                                                                   |

#### Per-database certificates

PgDog supports using different certificates to authenticate to different `[[databases]]` entries in `pgdog.toml`, for example:

=== "pgdog.toml"

    ```toml
    [[databases]]
    name = "postgres"
    host = "prod.rds.amazonaws.com"
    tls_server_certificate = "/path/to/cert.pem"
    tls_server_private_key = "/path/to/key.pem"
    ```

=== "Helm chart"

    ```yaml
    databases:
      - name: postgres
        host: prod.rds.amazonaws.com
        tlsServerCertificate: /path/to/cert.pem
        tlsServerPrivateKey: /path/to/key.pem
    ```
