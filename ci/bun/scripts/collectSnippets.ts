// -----------------------------------------------------------------------------
// ----- Constants -------------------------------------------------------------

const TOML_SNIPPET_REGEX = /^([ \t]*)```toml[^\n]*\r?\n([\s\S]*?)^\1```/gm;

const DOCS_ROOT_DIRECTORY = `${process.cwd()}/docs`;
const OUTPUT_DIRECTORY = `${process.cwd()}/ci/tmp`;

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

async function createFileForSnippet(snippet: Snippet) {
  const prefix = guessType(snippet.content);
  const md5 = hash(snippet);
  const filename = `${prefix}_${md5}.toml`;
  const outputFilePath = `${OUTPUT_DIRECTORY}/${filename}`;

  const content = [
    `# file: ${snippet.file}`,
    `# line_number: ${snippet.line}`,
    "",
    `${snippet.content}`,
    "",
  ].join("\n");

  await Bun.write(outputFilePath, content);
}

// -----------------------------------------------------------------------------

type ConfigOrUsers = "config" | "users";

function guessType(snippetContent: string): ConfigOrUsers {
  return snippetContent.includes("[[users]]") ? "users" : "config";
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
