# Slack integration

The control plane can send notifications to a Slack channel. Notifications include changes to managed PgDog deployments, like Helm chart updates, configuration reloading, and updates to database topology.

## Configuration

Slack integration is **disabled** by default and can be enabled with configuration:

```yaml title="values.yaml"
control:
  config:
    slack:
      bot_token: "xoxb-[...]"
      channel: "C0123456789"
```

The following parameters can be configured via the [Helm chart](../installation.md):

| Parameters | Description |
|-|-|
| `bot_token` | The Slack API bot token. |
| `channel` | The slack channel ID where the Slack bot is allowed to post messages. |

## Notifications

If Slack integration is configured, the control plane will send the following notifications to a Slack channel:

| Notification | Description |
|-|-|
| Helm install (start) | The control plane starts executing the `helm upgrade --install` command to modify/create a PgDog deployment. |
| Helm install (end) | The control plane is finished executing the `helm ugprade --install` command. If any errors occur, they are included in the notification. |
| Configuration reload | The control plane triggers a configuration reload on all PgDog instances in a deployment. |
