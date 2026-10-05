# Azure Workload Identity

PgDog supports using temporary credentials provided by Azure Workload Identity to connect to PostgreSQL running on Azure. This uses the [Azure SDK](https://github.com/Azure/azure-sdk-for-rust) and supports fetching credentials from the environment.

To use Workload Identity authentication, configure it on each user in [`users.toml`](../../configuration/users.toml/users.md):

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
