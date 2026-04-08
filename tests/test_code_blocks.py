#!/usr/bin/env python3

import glob
import re
import subprocess
import sys
import pglast

# Match fenced code blocks, including those nested inside mkdocs-material
# `===` content tabs (which indent the fence by 4+ spaces). The leading
# indentation is captured so it can be stripped from each code line, and the
# closing fence must match both the indent and the opening fence marker.
pattern = re.compile(
    r'(?ms)^(?P<indent>[ \t]*)(?P<fence>`{3,}|~{3,})(?P<info>[^\n]*)\r?\n'
    r'(?P<code>.*?)'
    r'^(?P=indent)(?P=fence)[ \t]*\r?$'
)

replication = [
    "CREATE_REPLICATION_SLOT",
    "START_REPLICATION",
]

def verify(binary):
    for file in glob.glob("docs/**/*.md", recursive=True):
        with open(file, "r") as f:
            content = f.read()
        print(f"Checking {file}")
        for m in pattern.finditer(content):
            info = m.group("info").strip().lower()
            indent = m.group("indent")
            code = m.group("code")
            original = code
            if indent:
                # Dedent the code body so configcheck/pglast see clean text.
                stripped_lines = []
                for line in code.splitlines(keepends=True):
                    if line.startswith(indent):
                        stripped_lines.append(line[len(indent):])
                    else:
                        stripped_lines.append(line)
                code = "".join(stripped_lines)

            if info == "toml":
                if "[[users]]" in code:
                    check_file(binary, "users", code)
                elif "[lib]" in code:
                    pass
                else:
                    check_file(binary, "pgdog", code)
            elif info == "postgresql":
                try:
                    pglast.parser.parse_sql(code)
                except Exception as e:
                    found = False
                    for cmd in replication:
                        if cmd in code:
                            found = True
                    if not found:
                        print(f"Error in {file}:")
                        print(original)
                        raise e

def check_file(binary, kind, content):
    tmp = f"/tmp/pgdog_config_test.toml"
    with open(tmp, "w") as f:
        f.write(content)
    if kind =="users":
        arg = "--users"
    else:
        arg = "--config"
    result = subprocess.run([binary, arg, "/tmp/pgdog_config_test.toml", "configcheck"])
    if result.returncode != 0:
        print(f"{content}")
        print(result.stderr)
        exit(1)

if __name__ == "__main__":
    verify(sys.argv[1])
