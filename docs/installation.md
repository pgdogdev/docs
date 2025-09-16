---
icon: material/cog
---
# Installation

## Kubernetes

PgDog comes with its own [Helm chart](https://github.com/pgdogdev/helm). You can install it directly from our chart repository:

```bash
helm repo add pgdogdev https://helm.pgdog.dev
helm install pgdog pgdogdev/pgdog
```

## Docker

Docker images are built automatically for each commit to the `main` branch in [GitHub](https://github.com/pgdogdev/pgdog/pkgs/container/pgdog):

```bash
docker run ghcr.io/pgdogdev/pgdog:main
```

### SemVer

PgDog follows SemVer, and for each tagged release, a corresponding tag will be available in the Docker repository. For example, you can run v0.1.3 like so:

```
docker run ghcr.io/pgdogdev/pgdog:v0.1.3
```

## From source

PgDog can be easily compiled from source. For production deployments, a `Dockerfile` is provided in [GitHub](https://github.com/pgdogdev/pgdog/tree/main/Dockerfile). If you prefer to deploy on bare-metal or you're looking to run PgDog locally, you'll need to install a few dependencies.

### Dependencies

Parts of PgDog depend on C/C++ libraries, which are compiled from source. Make sure to have a working version of a C/C++ compiler installed.

=== "macOS"
    Install [Xcode](https://developer.apple.com/xcode/) from the App Store and CMake & Clang from Homebrew:

    ```bash
    brew install cmake llvm
    ```

=== "Ubuntu"

    Install Clang and CMake:

    ```bash
    sudo apt update && \
    sudo apt install -y cmake clang curl pkg-config libssl-dev git build-essential
    ```

=== "Arch"

    Install Clang and CMake:

    ```bash
    sudo pacman -Syu base-devel clang cmake git
    ```

=== "Windows"

    Install [Visual Studio Community Edition](https://visualstudio.microsoft.com/vs/community/).
    Make sure to include CMake in the installation.

#### Rust compiler

PgDog is written in Rust and uses the latest stable features of the language. Make sure to install the newest version of the toolchain from [rust-lang.org](https://rust-lang.org).

### Compile PgDog

Clone the code from our GitHub repository:

```bash
git clone https://github.com/pgdogdev/pgdog && \
cd pgdog
```

To make sure you get all performance benefits, PgDog should be compiled in release mode:

```bash
cargo build --release
```

### Launch PgDog

You can start PgDog by running the binary directly, located in `target/release/pgdog`, or with Cargo:

```bash
cargo run --release
```

## Configuration

PgDog is configured via two files:

| Configuration file | Description |
|-|-|
| [pgdog.toml](configuration/index.md) | Contains general settings and information about PostgreSQL servers. |
| [users.toml](configuration/users.toml/users.md) | Contains users and passwords that are allowed to connect to PgDog. |

Users are configured separately to allow them to be encrypted at rest in environments that support it, like in Kubernetes or with the AWS Secrets Manager.

Both config files should be placed in the current working directory (`$PWD`) for PgDog to detect them. Alternatively,
you can pass their paths at startup as arguments:

```bash
pgdog \
    --config /path/to/pgdog.toml \
    --users /path/to/users.toml
```

#### [pgdog.toml](configuration/pgdog.toml/general.md)

Most configuration options have sensible defaults. This makes single-database configuration pretty short:

```toml
[[databases]]
name = "postgres"
host = "127.0.0.1"
```

#### [users.toml](configuration/users.toml/users.md)

This config file contains a mapping between databases, users, and passwords. Unless you configured [passthrough authentication](features/authentication.md#passthrough-authentication), users not specified in this file won't be able to connect:

```toml
[[users]]
name = "alice"
database = "postgres"
password = "hunter2"
```

!!! note "Configuring users"

    PgDog creates connection pools for each user/database pair. If no users are configured in `users.toml`, all connection pools will be disabled and PgDog won't connect to the database(s).

## Next steps

<div class="grid">
    <div>
        <h4><a href="/features/">Features</a></h4>
        <p>Read more about PgDog features like load balancing, supported authentication mechanisms, TLS, health checks, and more.</p>
    </div>
    <div>
        <h4><a href="/administration/">Administration</a></h4>
        <p>Learn how to operate PgDog in production, like fetching real-time statistics from the admin database or updating configuration.</p>
    </div>
    <div>
        <h4><a href="/architecture/">Architecture</a></h4>
        <p>Read about PgDog internals and how it works under the hood.</p>
    </div>
    <div>
        <h4><a href="/configuration/">Configuration</a></h4>
        <p>Reference for PgDog configuration like maximum server connections, number of shards, and more.</p>
    </div>
</div>
