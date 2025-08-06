// -----------------------------------------------------------------------------
// ----- Constants -------------------------------------------------------------

const TOML_SNIPPET_REGEX = /^([ \t]*)```toml[^\n]*\r?\n([\s\S]*?)^\1```/gm;

const DOCS_ROOT_DIRECTORY = `${process.cwd()}/docs`;
const OUTPUT_DIRECTORY = `${process.cwd()}/tests/bun/tmp`;

// TODO -> Remove hash when Docker image is updated
// const DOCKER_IMAGE = "ghcr.io/pgdogdev/pgdog:main";
const DOCKER_IMAGE =
  "ghcr.io/pgdogdev/pgdog:main@sha256:3036d2ac7b684643dd187c42971f003f9d76e5f54cd129dcba742c309d7debd0";

const SnippetsByMd5 = new Map<string, Snippet>();

// -----------------------------------------------------------------------------
// ----- Invoke main() ---------------------------------------------------------

main();

// -----------------------------------------------------------------------------
// ----- Main ------------------------------------------------------------------

async function main() {
  await setup();

  // Scan docs for TOML snippets
  const snippets = await extractTomlSnippets();

  // Create one temporary {md5}.toml file for each snippet
  await Promise.all(snippets.map(createFileForSnippet));

  // Verify each snippet off the latest Docker image
  for (const snippet of snippets) {
    const result = await verifySnippet(snippet);

    if (!result.success) {
      console.error(result.errorMessage);
      await cleanup();
      process.exit(1);
    }
  }

  // Remove temporary files
  await cleanup();

  // Exit with success status code
  console.log("\nAll snippets verified successfully!");
  process.exit(0);
}

// -----------------------------------------------------------------------------
// ----- Types -----------------------------------------------------------------

type Snippet = {
  file: string;
  content: string;
  line: number;
};

// -----------------------------------------------------------------------------
// ----- Helpers ---------------------------------------------------------------

async function extractTomlSnippets() {
  const glob = new Bun.Glob("**/*.md");
  const paths = glob.scan(DOCS_ROOT_DIRECTORY);

  const snippets: Snippet[] = [];

  for await (const relativePath of paths) {
    const fullPath = `${DOCS_ROOT_DIRECTORY}/${relativePath}`;
    const fileText = await Bun.file(fullPath).text();

    while (true) {
      const match = TOML_SNIPPET_REGEX.exec(fileText);
      if (match === null) {
        break;
      }

      const codeIndent = match[1];
      const deindentedContent = match[2]
        .split(/\r?\n/)
        .map((line) =>
          line.startsWith(codeIndent) ? line.slice(codeIndent.length) : line,
        )
        .join("\n")
        .trim();

      const startIndex = match.index;
      const startLineNumber = fileText
        .slice(0, startIndex)
        .split(/\r?\n/).length;

      const snippet = {
        file: relativePath,
        content: deindentedContent,
        line: startLineNumber,
      };

      const md5 = hash(snippet);

      SnippetsByMd5.set(md5, snippet);
      snippets.push(snippet);
    }
  }

  return snippets;
}

// -----------------------------------------------------------------------------

function hash(snippet: Snippet): string {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(JSON.stringify(snippet));
  const md5 = hasher.digest("hex");
  return md5;
}

// -----------------------------------------------------------------------------

async function setup() {
  await Bun.$`mkdir -p ${OUTPUT_DIRECTORY}`;
  await Bun.$`rm -rf ${OUTPUT_DIRECTORY}`.nothrow();
}

// -----------------------------------------------------------------------------

async function cleanup() {
  await Bun.$`rm -rf ${OUTPUT_DIRECTORY}`.nothrow();
}

// -----------------------------------------------------------------------------

async function createFileForSnippet(snippet: Snippet) {
  const md5 = hash(snippet);
  const filename = `${md5}.toml`;
  const outputFilePath = `${OUTPUT_DIRECTORY}/${filename}`;

  // Write snippet content with trailing newline
  await Bun.write(outputFilePath, `${snippet.content}\n`);
}

// -----------------------------------------------------------------------------

type VerificationResult =
  | { success: true }
  | {
      success: false;
      errorMessage: string;
    };

const MAX_RETRIES = 3;

// The TOML snippets are either pgdog.toml or users.toml
// We don't annotate the config type so we need to check for both.
// Retries every two minutes because the script occasionally fails. No idea why.
// The GitHub job will die after 10 minutes so we don't need an exponential backoff.
async function verifySnippet(snippet: Snippet): Promise<VerificationResult> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    attempts++;

    const configValid = await verifyConfigSnippet(snippet);

    if (configValid) {
      console.log(
        `${snippet.file}:${snippet.line} is a valid pgdog.toml snippet`,
      );
      return { success: true };
    }

    const usersValid = await verifyUsersSnippet(snippet);

    if (usersValid) {
      console.log(
        `${snippet.file}:${snippet.line} is a valid users.toml snippet`,
      );
      return { success: true };
    }
  }

  return {
    success: false,
    errorMessage: `Validation failed for ${snippet?.file ?? "unknown"}:${snippet?.line ?? "?"}`,
  };
}

async function verifyConfigSnippet(snippet: Snippet): Promise<boolean> {
  const outputFilePath = `${OUTPUT_DIRECTORY}/${snippet.file}`;
  const containerFilePath = "/pgdog.toml";

  const cmd = [
    "docker",
    "run",
    "--rm",
    "--entrypoint",
    "pgdog",
    "-v",
    `${outputFilePath}:${containerFilePath}`,
    DOCKER_IMAGE,
    "configcheck",
    "--config",
    containerFilePath,
  ];

  const result = Bun.spawnSync({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });

  return result.success;
}

async function verifyUsersSnippet(snippet: Snippet): Promise<boolean> {
  const md5 = hash(snippet);
  const outputFilePath = `${OUTPUT_DIRECTORY}/${md5}.toml`;
  const containerFilePath = "/users.toml";

  const cmd = [
    "docker",
    "run",
    "--rm",
    "--entrypoint",
    "pgdog",
    "-v",
    `${outputFilePath}:${containerFilePath}`,
    DOCKER_IMAGE,
    "configcheck",
    "--users",
    containerFilePath,
  ];

  const result = Bun.spawnSync({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });

  return result.success;
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
