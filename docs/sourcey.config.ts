import { defineConfig, markdown } from "sourcey";

export default defineConfig({
  name: "PgDog",
  siteUrl: "https://docs.pgdog.dev",
  prettyUrls: "slash",
  repo: "https://github.com/pgdogdev/docs",
  editBranch: "main",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        source: markdown({
          groups: [
            {
              group: "Getting started",
              pages: [
                "index",
                "installation",
                "client-drivers",
                "about",
                "roadmap",
                "migrating-to-pgdog/index",
                "migrating-to-pgdog/from-pgbouncer",
              ],
            },
            {
              group: "Administration",
              pages: [
                "administration/index",
                "administration/clients",
                "administration/servers",
                "administration/pools",
                "administration/config",
                "administration/replication",
                "administration/tasks",
              ],
            },
            {
              group: "Architecture and configuration",
              pages: [
                "architecture/index",
                "architecture/comparison",
                "architecture/benchmarks",
                "configuration/index",
              ],
            },
            {
              group: "Features",
              pages: [
                "features/index",
                "features/authentication",
                "features/metrics",
                "features/mirroring",
                "features/multi-tenancy",
                "features/plugins/index",
                "features/tls",
              ],
            },
            {
              group: "Connection pooling",
              pages: [
                "features/connection-pooler/index",
                "features/connection-pooler/connection-recovery",
                "features/connection-pooler/prepared-statements",
                "features/connection-pooler/session-mode",
                "features/connection-pooler/transaction-mode",
              ],
            },
            {
              group: "Load balancing",
              pages: [
                "features/load-balancer/index",
                "features/load-balancer/healthchecks",
                "features/load-balancer/manual-routing",
                "features/load-balancer/replication-failover",
                "features/load-balancer/transactions",
              ],
            },
            {
              group: "Sharding",
              pages: [
                "features/sharding/index",
                "features/sharding/basics",
                "features/sharding/dry-run",
                "features/sharding/explain",
                "features/sharding/manual-routing",
                "features/sharding/omnishards",
                "features/sharding/query-routing",
                "features/sharding/sequences",
                "features/sharding/sharding-functions",
                "features/sharding/supported-queries",
                "features/sharding/unique-ids",
                "features/sharding/2pc/index",
                "features/sharding/2pc/crash-recovery",
                "features/sharding/cross-shard-queries/index",
                "features/sharding/cross-shard-queries/copy",
                "features/sharding/cross-shard-queries/ddl",
                "features/sharding/cross-shard-queries/insert",
                "features/sharding/cross-shard-queries/select",
                "features/sharding/cross-shard-queries/update",
                "features/sharding/internals/logical-replication/index",
                "features/sharding/internals/query-protocol",
                "features/sharding/resharding/index",
                "features/sharding/resharding/cutover",
                "features/sharding/resharding/databases",
                "features/sharding/resharding/move",
                "features/sharding/resharding/replica-identity",
                "features/sharding/resharding/schema",
              ],
            },
          ],
        }),
      },
    ],
  },
});
