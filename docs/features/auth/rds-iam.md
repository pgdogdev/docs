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

## Read more

{{ next_steps_links([
    ("TLS", "/features/tls/", "Configure encrypted connections applications connecting to PgDog and PgDog's connections to the database."),
    ("mTLS", "/features/auth/mtls/", "Passwordless authentication for application connections to PgDog."),
]) }}
