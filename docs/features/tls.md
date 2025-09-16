---
icon: material/lock
---
# TLS encryption

PgDog supports TLS for both client and server connections. TLS encryption protects your connections from eavesdropping, especially if used across the public Internet, and is often required to pass security audits.

## Setting up encryption

To enable encryption for client connections, you need to provide (or generate) a certificate and a corresponding private key. PgDog supports self-signed certificates and the ones provided by a trusted Certificate Authority (CA).

### Configuration

Add the following settings to your `pgdog.toml`:

```toml
[general]
tls_certificate = "/path/to/certificate.pem"
tls_private_key = "/path/to/private_key.pem"
```

Both the certificate and private key need to be formatted using the [PEM](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail) format. The private key should not have a passphrase.

Once both settings are set, restart PgDog and all client connections will be able to use TLS. The choice to connect using encryption is controlled by the client and PgDog will contiue to accept plain text connections.

To enable encryption on the client, set the `sslmode` connection parameter. If you're using database URLs, you can append it to the list of parameters, like so:

```
postgres://user:password@host:port/database?sslmode=prefer
```

### Connection modes

PostgreSQL supports 4 modes for establishing encrypted connections, documented below:

| Mode | Description |
|-|-|
| `disable` | TLS connections are disabled. Client will connect using plain TCP. |
| `prefer` | If PgDog/PostgreSQL support encryption, it will be used. If not, connections will be made using plain TCP. Any certificate will be accepted. This is often used with self-signed certificates. |
| `verify-ca` | Encryption will be used and if not supported, the connection attempt will  be aborted. Additionally, the client will verify the validity of the certificate against a trusted anchor, e.g., local certificate store. |
| `verify-full` | In addition to verifying the certificate, the client will ensure the hostname provided matches the hostname on the certificate. |

The default value for most PostgreSQL connection drivers is typically `prefer`, which means if you configure certificates in PgDog, your clients will start using encrypted connections immediately.

## Server connections

By default, PgDog will attempt to use TLS when connecting to PostgreSQL. This is configurable via a setting:

```toml
tls_verify = "prefer"
```

This setting accepts almost identival values to the `sslmode` parameter used by clients:

| Value | Description |
|-|-|
| `disable` | Don't use TLS. |
| `prefer` | Use TLS if available, accept any certificate. |
| `verify_ca` |  Use TLS, validate the certificate provided by Postgres. |
| `verify_full` | Use TLS and validate the hostname against the certificate provided by Postgres. |

If you use `verify_ca` or `verify_full` and your certificate is not signed by a well known CA, you can configure PgDog to validate it using your own certificate chain:

```toml
tls_server_ca_certificate = "/path/to/ca/certificate.pem"
```

## Performance

Encryption has some performance impact on latency and CPU utilization. While most TLS encryption algorithms are now implemented in hardware and are quite quick, you will still notice some impact on your query turnaround times when using TLS.
