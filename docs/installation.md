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

PgDog follows SemVer, and for each tagged release, a corresponding tag will be available in the Docker repository. For example, you can run `v0.1.44` like so:

```
docker run ghcr.io/pgdogdev/pgdog:v0.1.44
```

### AWS ECS

!!! note "New feature"
    The ECS Terraform module is a new project. Please report any issues you may encounter. Community contributions are welcome.

We recently added a [Terraform module](https://github.com/pgdogdev/pgdog-ecs-terraform) to deploy PgDog on AWS ECS. It works with the same Docker image as our [Helm chart](#kubernetes), so the experience should be familiar.

## Pre-built binaries

Each PgDog release (every week, on Thursday) contains pre-built binaries for Linux (arm64, amd64), Mac (aarch64, i.e. Apple Silicon), and Debian packages (`.deb`) for convenient installation on Debian/Ubuntu.

You can download all binaries from the [releases page](https://github.com/pgdogdev/pgdog/releases) in GitHub.

#### Linux binaries and glibc

The Linux binaries are built on Ubuntu 24.04 and are linked against glibc version 2.39. To run them, your system needs glibc 2.39 or later.

#### Mac OS security

The Mac OS binary is not signed. To run it locally, make sure to de-quarantine it first, e.g.:

```bash
xattr -d com.apple.quarantine ./pgdog
```

## From source

PgDog can be easily compiled from source. For production deployments, a [`Dockerfile`](https://github.com/pgdogdev/pgdog/tree/main/Dockerfile) is provided in our code repository. If you prefer to deploy on bare-metal or you are looking to run PgDog locally, you will need to install a few dependencies.

### Dependencies

Parts of PgDog depend on C/C++ libraries, which are compiled from source. Make sure to have a working version of a C/C++ compiler installed before building from source:

=== "macOS"
    Install [Xcode](https://developer.apple.com/xcode/) from the App Store and CMake & Clang from Homebrew:

    ```bash
    brew install cmake llvm
    ```

=== "Ubuntu"

    Install Clang and CMake:

    ```bash
    sudo apt update && \
    sudo apt install -y cmake clang curl pkg-config libssl-dev git build-essential mold
    ```

=== "Arch"

    Install Clang and CMake:

    ```bash
    sudo pacman -Syu base-devel clang cmake git mold
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

To make sure you get all performance benefits, PgDog should be compiled in release mode with all optimizations:

```bash
cargo build --release
```

### Launch PgDog

You can start PgDog by running the binary directly, which is located in `target/release/pgdog`, or by running it with Cargo:

```bash
cargo run --release
```

## Configuration

PgDog is configured via two files:

| Configuration file | Description |
|-|-|
| [pgdog.toml](configuration/index.md) | General settings and information about PostgreSQL servers. |
| [users.toml](configuration/users.toml/users.md) | Usernames and passwords that are allowed to connect to PgDog. |

Users are configured separately, which allows them to be encrypted at rest in environments that support it, like in Kubernetes or with the AWS Secrets Manager.

If the configuration files are placed in the current working directory (`$PWD`), PgDog will detect them automatically. Alternatively, you can pass their paths at startup as arguments:

```bash
pgdog \
    --config /path/to/pgdog.toml \
    --users /path/to/users.toml
```

#### [pgdog.toml](configuration/pgdog.toml/general.md)

Most configuration options have sensible defaults. This makes single-database configuration pretty short:

=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "postgres"
    host = "127.0.0.1"
    ```
=== "Helm chart"
    ```yaml
    databases:
      - name: postgres
        host: 127.0.0.1
    ```

#### [users.toml](configuration/users.toml/users.md)

This config file contains a mapping between databases, users, and passwords. Unless you configured [passthrough authentication](features/authentication.md#passthrough-authentication), users not specified in this file will not be able to connect:

=== "users.toml"
    ```toml
    [[users]]
    name = "alice"
    database = "postgres"
    password = "hunter2"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: alice
        database: postgres
        password: hunter2
    ```

!!! note "Configuring users"
    PgDog creates connection pools for each user/database pair. If no users are configured in `users.toml`, all connection pools will be disabled and PgDog won't connect to the database(s).

## Next steps

{{ next_steps_links([
    ("Features", "/features/", "Read more about PgDog features like load balancing, supported authentication mechanisms, TLS, health checks, and more."),
    ("Administration", "/administration/", "Learn how to operate PgDog in production, like fetching real-time statistics from the admin database or updating configuration."),
    ("Architecture", "/architecture/", "Read about PgDog internals and how it works under the hood."),
    ("Configuration", "/configuration/", "Reference for PgDog configuration like maximum server connections, number of shards, and more."),
]) }}
