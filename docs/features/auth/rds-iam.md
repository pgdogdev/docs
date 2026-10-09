---
icon: material/aws
---

# RDS IAM

PgDog supports obtaining temporary credentials from [AWS IAM](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) and using those to connect to RDS PostgreSQL (and Aurora) instances.

## Configuration

To use RDS IAM authentication, configure it on each user in [`users.toml`](../../configuration/users.toml/users.md), for example:

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

### How it works

Under the hood, PgDog is using the [AWS RDS SDK](https://docs.rs/aws-sdk-rds/latest/aws_sdk_rds/) to fetch credentials at runtime. The SDK can retrieve temporary credentials from the environment or from the EC2 IAM API. It will use the role assigned to the EC2 instance or Kubernetes pod to connect to RDS.

If you're deploying PgDog in [Kubernetes](../../installation.md#kubernetes) using our Helm chart, you can assign the PgDog container an IAM role with the correct permissions, for example:

```yaml title="values.yaml"
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/pgdog-role"
```

### Client authentication

RDS IAM authentication is currently only supported for connections between PgDog and PostgreSQL. Clients need to continue using one of the supported authentication mechanisms, e.g., [password](password.md) auth.

To completely avoid using passwords for user authentication, take a look at [mTLS](mtls.md).

### Multiple roles

PgDog supports assuming different roles for each user in order to connect to RDS. This is common when deploying PgDog across different AWS accounts or regions.

For each user in `users.toml`, you can specify its IAM role (and optionally IAM region) as follows:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "pgdog"
    database = "prod"
    password = "hunter2"
    server_auth = "rds_iam"
    server_iam_region = "us-west-2"
    server_iam_assume_role = "arn:aws:iam::123456789012:role/pgdog-role-us-west-2"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: pgdog
        database: prod
        password: hunter2
        serverAuth: rds_iam
        serverIamRegion: us-west-2
        serverIamAssumeRole: arn:aws:iam::123456789012:role/pgdog-role-us-west-2
    ```

In order for this to work correctly, make sure the IAM role used to deploy PgDog has the correct Trust Policy to assume all roles specified in the configuration.

## IAM passthrough

!!! note "Experimental feature"

    This feature is new and experimental. Please make sure to test it before deploying to production.

PgDog can authenticate applications using RDS IAM authentication directly against databases in RDS. This allows apps to _not_ use password auth to connect to PgDog, while maintaining its own connection pool (also using IAM) to the database.

### How it works

Applications can use the RDS SDK to generate temporary tokens to connect to RDS. PgDog can attempt a connection to RDS, and if successful, mark that token as valid for its duration, allowing clients to connect.

To make sure this doesn't cause database connection storms (defeating the purpose of a connection pooler), PgDog caches tokens it receives from clients for 15 minutes. If an application uses temporary tokens correctly, i.e., by caching them for their validity period, this mechanism can work well at scale.

### Configuration

RDS IAM passthrough auth can be configured in `users.toml`, for example:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "pgdog"
    database = "prod"
    auth_type = "external_token"
    server_auth = "rds_iam"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: pgdog
        database: prod
        authType: external_token
        serverAuth: rds_iam
    ```

When IAM passthrough is enabled, there are passwords anywhere in the stack: apps, PgDog and Postgres use temporary credentials.

Additionally, you can configure the size of the token cache in `pgdog.toml`:

=== "pgdog.toml"

    ```toml
    [general]
    auth_token_cache_size = 1_000
    ```

=== "Helm chart"

    ```yaml
    authTokenCacheSize: 1000
    ```

### Monitoring

For this feature to work well, it's important for the token cache in PgDog to have a high hit rate. Otherwise, it would have to create connections to Postgres almost every time a new client connects to the pooler.

The cache metrics are exported via [OpenMetrics](../metrics.md) and [OTEL](../metrics.md#otel):

| Metric                  | Description                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `token_cache_entries`   | Number of tokens in the cache.                                                                                                                  |
| `token_cache_evictions` | Number of tokens evicted from the cache. If this is high, the cache is too small or applications are not IAM authentication using it correctly. |
| `token_cache_hits`      | Number of times the token an application provided was found in the cache. If this is high, the cache is performing well.                        |
| `token_cache_misses`    | Number of times PgDog had to connect to RDS to validate a token.                                                                                |

## Read more

{{ next_steps_links([
    ("TLS", "/features/tls/", "Configure encrypted connections for applications connecting to PgDog and PgDog's connections to the database."),
    ("mTLS", "/features/auth/mtls/", "Passwordless authentication for application connections to PgDog."),
]) }}
