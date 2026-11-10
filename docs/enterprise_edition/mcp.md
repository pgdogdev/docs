# MCP

!!! note "New feature"

    MCP is a new feature. Please test it before deploying to production.

MCP (model context protocol) allows coding agents and harnesses to fetch real time PgDog metrics, logs and deployment information to help debug production incidents or configuration issues.

## How it works

MCP is an HTTP protocol and most coding harnesses, e.g., Codex, Pi, Claude Code support it out of the box. It's disabled by default, so to enable MCP you need to set the following config in the [control plane](control_plane/index.md):

=== "Helm chart"

    ```yaml
    control:
      config:
        mcp:
          enabled: true
    ```

=== "control.toml"

    ```toml
    [mcp]
    enabled = true
    ```

When enabled, the MCP server will be running on the same host and port as the control plane, under the `/mcp` path.

### Authentication

Requests to the MCP server require Bearer token authentication. Unauthenticated requests will be rejected automatically. To configure authentication, you have two options:

1. Hardcode a set of tokens in the configuration
2. Enable [Raft](control_plane/ha.md) and add tokens via the web dashboard

#### Configuring tokens

A fixed set of Bearer tokens can be configured as follows:

=== "Helm chart"

    ```yaml
    control:
      config:
        mcp: enabled
        tokens:
          - token_one
          - token_two
    ```

=== "control.toml"

    ```toml
    [mcp]
    enabled = true
    tokens = ["token_one", "token_two"]
    ```

If you're running our [Helm chart](control_plane/installation.md), you can also specify tokens via an environment variable, which is set on the deployment on boot:

```yaml title="values.yaml"
# TODO: specify MCP_TOKENS via env
```

#### Dynamic tokens

Mananging tokens via configuration can be tedious, so the control plane also supports storing authorized tokens in its [Raft](control_plane/ha.md) log. The log is checked on each request to the MCP server, so tokens can be created and deleted at any time without configuration changes.

<center>
    <img src="/images/ee/mcp_system.png" width="100%" alt="MCP Add token">
</center>

### Configuring agents

Most agent harnesses support MCP out of the box, so configuring PgDog's MCP server should be pretty straightforward.

#### Codex

To add the MCP server to Codex, you can add it to either `.codex/config.toml` or `~/.codex/config.toml` as follows:

```toml title=".codex/config.toml"
# TODO add pgdog MCP
```
