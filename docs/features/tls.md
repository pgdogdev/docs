---
icon: material/lock
---
# TLS encryption

PgDog supports TLS for both client and server connections. TLS encryption protects your connections from eavesdropping, especially if used across the public Internet, and is often required to pass security audits.

## Setting up encryption

To enable encryption for client connections, you need to provide (or generate) a certificate and a corresponding private key. PgDog supports self-signed certificates and the ones provided by a trusted Certificate Authority (CA).

### Configuration

Add the following settings to your `pgdog.toml`:

=== "pgdog.toml"
    ```toml
    [general]
    tls_certificate = "/path/to/certificate.pem"
    tls_private_key = "/path/to/private_key.pem"
    ```
=== "Helm chart"
    ```yaml
    tlsCertificate: /path/to/certificate.pem
    tlsPrivateKey: /path/to/private_key.pem
    ```

Both the certificate and private key need to be formatted using the [PEM](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail) format. The private key should not have a passphrase.

Once both settings are set, restart PgDog and all client connections will be able to use TLS. The choice to connect using encryption is controlled by the client and PgDog will continue to accept plain text connections.

To enable encryption on the client, set the `sslmode` connection parameter. If you're using database URLs, you can append it to the list of parameters, like so:

```
postgres://user:password@host:port/database?sslmode=prefer
```

#### Rejecting unencrypted connections

PgDog can reject connections from clients that choose not to use TLS encryption:

=== "pgdog.toml"
    ```toml
    [general]
    tls_client_required = true
    ```
=== "Helm chart"
    ```
    tlsClientRequired: true
    ```

This is helpful to enforce a security protocol but, in some rare scenarios, could limit which clients are allowed to connect. Most Postgres client drivers ship with TLS support bundled in so, in practice, enabling this feature is not going to be a problem.

#### Self-signed certificate

If you're deploying PgDog using our [Helm chart](../installation.md#kubernetes), you can configure it to generate a self-signed TLS certificate at deploy time:

=== "Helm chart"
    ```yaml
    tlsGenerateSelfSignedCert: true
    ```

This is useful for quickly deploying TLS in development or staging. For production deployments, you may want to load your own certificate that your clients can validate instead.

### Connection modes

PostgreSQL supports 4 modes for establishing encrypted connections, documented below:

| Mode | Description |
|-|-|
| `disabled` | TLS connections are disabled. Client will connect using plain TCP. |
| `prefer` | If PgDog/PostgreSQL support encryption, it will be used. If not, connections will be made using plain TCP. Any certificate will be accepted. This is often used with self-signed certificates. |
| `verify-ca` | Encryption will be used and if not supported, the connection attempt will be aborted. Additionally, the client will verify the validity of the certificate against a trusted anchor, e.g., local certificate store. |
| `verify-full` | In addition to verifying the certificate, the client will ensure the hostname provided matches the hostname on the certificate. |

The default value for most PostgreSQL connection drivers is typically `prefer`, which means if you configure certificates in PgDog, your clients will start using encrypted connections immediately.

## Server connections

By default, PgDog will attempt to use TLS when connecting to PostgreSQL. This is configurable via a setting:

=== "pgdog.toml"
    ```toml
    [general]
    tls_verify = "prefer"
    ```
=== "Helm chart"
    ```yaml
    tlsVerify: prefer
    ```

This setting accepts almost identical values to the `sslmode` parameter used by clients:

| Value | Description |
|-|-|
| `disable` | Don't use TLS. |
| `prefer` | Use TLS if available, accept any certificate. |
| `verify_ca` | Use TLS, validate the certificate provided by Postgres. |
| `verify_full` | Use TLS and validate the hostname against the certificate provided by Postgres. |

If you use `verify_ca` or `verify_full` and your certificate is not signed by a well known CA, you can configure PgDog to validate it using your own certificate chain:

=== "pgdog.toml"
    ```toml
    [general]
    tls_server_ca_certificate = "/path/to/ca/certificate.pem"
    ```
=== "Helm chart"
    ```yaml
    tlsServerCaCertificate: /path/to/ca/certificate.pem
    ```

### Deploying on AWS RDS

PgDog is commonly deployed in front of AWS RDS or Aurora. To make it easier to setup secure TLS, we are bundling the [RDS certificate bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificatesDownload) into the Helm chart and making it available to PgDog at runtime:

=== "Helm chart"
    ```yaml
    rdsCertificateBundle:
      enabled: true
    ```
=== "AWS GovCloud"
    If deploying into the AWS GovCloud (US), you can change the bundle accordingly:

    ```yaml
    rdsCertificateBundle:
      type: govcloud
    ```
    

Once the bundle is loaded, you can switch to `verify_ca` (or `verify_full`) for server connections which will ensure that connections from PgDog to RDS are always encrypted _and_ authenticated:

=== "pgdog.toml"
    ```toml
    [general]
    tls_verify = "verify_full"
    ```
=== "Helm chart"
    ```yaml
    tlsVerify: verify_full
    ```


## Mutual TLS

!!! note "New"
    This is a new feature. Please report any issues you may run into.

Mutual TLS (also known as **mTLS**) allows PgDog to authenticate connections received from the client using a mutually agreed upon certificate. If the client doesn't provide the right certificate (or doesn't have one), PgDog will reject the connection. This can be enabled by setting the client CA certificate in [`pgdog.toml`](../configuration/pgdog.toml/general.md):

=== "pgdog.toml"
    ```toml
    [general]
    tls_client_ca_certificate = "/path/to/client/ca.pem"
    ```
=== "Helm chart"
    ```yaml
    tlsClientCaCertificate: /path/to/client/ca.pem
    ```

The certificate provided by the client doesn't have to be self-signed. In fact, any certificate signed by any of the certs in the chain loaded via `tls_client_ca_certificate` is an acceptable anchor. This allows an internal CA (Certificate Authority) to issue unique certificates to each application, while also making them short-lived (e.g., 30 days expiration) to satisfy security or compliance requirements.

## TLS in practice

PgDog terminates TLS from clients and opens a separate connection to Postgres. Traffic can be encrypted on both network hops, but it is not end-to-end encryption in the cryptographic sense: PgDog decrypts client traffic so it can read PostgreSQL protocol messages, route queries, and manage connections.

For the client side, configure applications to use TLS when connecting to PgDog. Use `sslmode=verify-full` when clients should can PgDog's certificate and hostname. If you want PgDog to authenticate clients during the TLS handshake, set [`tls_client_ca_certificate`](#mutual-tls).

For the server side, set `tls_verify` setting to `"verify_full"` so PgDog can validate the Postgres server certificate and hostname on each connection. It does not currently present a client TLS certificate to Postgres, so mutual TLS between PgDog and PostgreSQL is not currently supported.

## Performance

Encryption has some performance impact on latency and CPU utilization. While most TLS encryption algorithms are now implemented in hardware and are quite quick, you will still notice some impact on your query turnaround times when using TLS.
