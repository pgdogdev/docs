---
icon: material/cog
---

# Installation

## Kubernetes

The PgDog control plane comes with its own [Helm chart](https://github.com/pgdogdev/helm-ee). You can install it directly from our chart repository:

```bash
helm repo add pgdogdev-ee https://helm-ee.pgdog.dev
helm install control pgdogdev-ee/pgdog-control
```

The chart has a few external requirements, [documented below](#requirements).

## Dependencies

While the chart creates and manages several resources, including an `Ingress`, some of them have external dependencies which cannot be created by Helm.

If you're not sure if your Kubernetes cluster has all the necessary dependencies, we created a quick script you can run to validate this:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/pgdogdev/helm-ee/main/install.sh | bash
```

The script requires that you have both the `awscli` and `kubectl` installed, which it will use to inspect your environment.

!!! note "Read-only actions"
    The guided installation script is strictly **read-only** and will never make any modifications to your environment.

Since the chart creates an `Ingress` resource for the web dashboard, an ingress controller is required to access the web dashboard. The chart supports four Ingress settings out of the box:

| Ingress | Description |
|-|-|
| [Nginx](#nginx) | Uses the `ingress-nginx` controller with `cert-manager` for TLS. The controller is widely used, although currently deprecated by the Kubernetes consortium. |
| [AWS ALB](#aws-alb) | Uses the AWS ELB controller to create a load balancer. Supports TLS termination with an ACM-managed certificate. |
| Gateway API | Uses the more modern Kubernetes [Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/), with support for gateways like Envoy. |
| Custom | All labels and annotations are exposed to the chart caller, so you can configure your own Ingress. |

### Authentication

If deploying the dashboard with access to the Internet, make sure to configure authentication to protect against unauthorized access. The control plane supports OAuth2 and two providers: GitHub and Google.

## Ingress

Most of the settings that need to be provided are around the Ingress and OAuth authentication. The [guided install](#guided-install) will configure them automatically. However, if you're installing manually, they are documented below:

| Setting | Description | Example |
|-|-|-|
| `ingress.mode` | Which [ingress](#ingress) to use for the web dashboard. | `gateway` |
| `ingress.host` | DNS for the dashboard. Tightly coupled to the TLS certificate, if enabled. | `pgdog.acme.com` |


### Nginx

The [nginx ingress](https://github.com/kubernetes/ingress-nginx/) (deprecated, but still available) is supported out of the box, along with automatic TLS termination (using `cert-manager`).

| Setting | Description | Example |
|-|-|-|
| `ingress.nginx.clusterIssuer` | The name of the `ClusterIssuer` resource. | `letsencrypt-prod` |

##### Example

```yaml title="values.yaml"
ingress:
  mode: nginx
  host: pgdog.acme.com
  nginx:
    clusterIssuer: letsencrypt-prod
```

### AWS ALB

The [AWS ALB ingress](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html) is supported out of the box and uses ACM for TLS termination at the load balancer.

| Setting | Description | Example |
|-|-|-|
| `ingress.aws.scheme` | `internet-facing` or `internal`. | `internet-facing` |
| `ingress.aws.certificateArn` | ARN of the ACM TLS certificate (validated externally, e.g., with DNS). | `arn:aws:acm:us-east-1:111111111111:certificate/abc-123` |

##### Example

```yaml title="values.yaml"
ingress:
  mode: aws
  host: control.acme.com
  aws:
    scheme: internet-facing
    certificateArn: arn:aws:acm:us-east-1:111111111111:certificate/abc-123
```

## OAuth2

OAuth2 authentication is supported out of the box for GitHub and Google providers. Either one can be configured as follows:

=== "GitHub"
    ```yaml title="values.yaml"
    control:
      config:
        auth:
          redirect_base_url: https://control.acme.com
          github:
            client_id: Iv1.0123456789abcdef
            client_secret: shhh
            allowed_orgs:
              - acme-corp
    ```
=== "Google"
    ```yaml title="values.yaml"
    control:
      config:
        auth:
          redirect_base_url: https://control.acme.com
          google:
            client_id: 0123456789-abc.apps.googleusercontent.com
            client_secret: shhh
            allowed_domains:
              - acme.com
    ```

The client secret can be alternatively set as an environment variable:

| Provider | Variable |
|-|-|
| GitHub| `GITHUB_CLIENT_SECRET` |
| Google | `GOOGLE_CLIENT_SECRET` |

### Using a Secret

To keep the client OAuth2 secret out of the `ConfigMap`, you can reference an existing Kubernetes `Secret` instead. The chart will mount it into the environment automatically.

#### Create Secret

The `Secret` resource should be in the same namespace as the chart release:

=== "GitHub"
    ```bash title="kubectl"
    kubectl create secret generic pgdog-oauth-secrets \
      --namespace pgdog \
      --from-literal=github-client-secret=shhh
    ```
=== "Google"
    ```bash title="kubectl"
    kubectl create secret generic pgdog-oauth-secrets \
      --namespace pgdog \
      --from-literal=google-client-secret=shhh
    ```

The secret can then be referenced in `values.yaml`:

=== "GitHub"
    ```yaml title="values.yaml"
    github:
      client_id: Iv1.0123456789abcdef
      allowed_orgs:
        - acme-corp
      secret:
        name: pgdog-oauth-secrets
        clientSecretKey: github-client-secret
    ```
=== "Google"
    ```yaml title="values.yaml"
    google:
      client_id: 0123456789-abc.apps.googleusercontent.com
      allowed_domains:
        - acme.com
      secret:
        name: pgdog-oauth-secrets
        clientSecretKey: google-client-secret
    ```

The same method can be used to store the `client_id` (using `clientIdKey` as key).


### Access control
`allowed_orgs` (GitHub) and `allowed_domains` (Google) restrict logins to members of those organizations or email domains. If left empty, anyone who can authenticate with the provider is allowed in.

Both accept a list, so you can allow more than one:

=== "GitHub"
    ```yaml title="values.yaml"
    github:
      allowed_orgs:
        - acme-corp
        - acme-labs
    ```
=== "Google"
    ```yaml title="values.yaml"
    google:
      allowed_domains:
        - acme.com
        - acme.io
    ```
