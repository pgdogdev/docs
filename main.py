import logging
import os
import posixpath
from urllib.parse import urlparse

from mkdocs.structure.files import Files

log = logging.getLogger("mkdocs.plugins.macros")


def define_env(env):

    def _validate_link(href, page):
        """Check that a .md link target exists on disk."""
        parsed = urlparse(href)
        path = parsed.path

        if not path.endswith('.md') or path.startswith('http'):
            return

        page_dir = posixpath.dirname(page.file.src_path)
        resolved = posixpath.normpath(posixpath.join(page_dir, path))
        abs_path = os.path.join(env.conf['docs_dir'], resolved)

        if not os.path.isfile(abs_path):
            log.warning(
                f"Card link in '{page.file.src_path}' points to "
                f"'{href}' but '{resolved}' does not exist."
            )

    def _resolve_link(href, page):
        """Resolve a relative .md link to the correct site URL."""
        _validate_link(href, page)

        parsed = urlparse(href)
        path = parsed.path

        if not path.endswith('.md') or path.startswith('http'):
            return href

        # Get the directory of the current page source
        page_dir = posixpath.dirname(page.file.src_path)
        # Resolve the relative path
        resolved = posixpath.normpath(posixpath.join(page_dir, path))
        # Convert .md to trailing slash
        resolved = resolved.replace('.md', '/')
        # Handle index files
        if resolved.endswith('/index/'):
            resolved = resolved[:-len('index/')]

        url = '/' + resolved
        if parsed.fragment:
            url += '#' + parsed.fragment
        return url

    @env.macro
    def next_steps_links(links):
        page = env.page
        rendered = []
        for link in links:
            title, href, desc = link
            resolved = _resolve_link(href, page)
            rendered.append(f"""
                <div>
                    <h4><a href="{resolved}">{title}</a></h4>
                    <p>{desc}</p>
                </div>
            """)
        rendered = "\n".join(rendered)
        return f'''<div class="grid">{rendered}</div>'''

    @env.macro
    def card_grid(cards):
        """Render a grid of cards with icon, title, link, and description.
        Each card: (icon, title, link, description)
        """
        page = env.page
        rendered = []
        for card in cards:
            icon, title, href, desc = card
            resolved = _resolve_link(href, page)
            rendered.append(f"""
                <div>
                    <span class="card-icon">{icon}</span>
                    <h4><a href="{resolved}">{title}</a></h4>
                    <p>{desc}</p>
                </div>
            """)
        rendered = "\n".join(rendered)
        return f'''<div class="grid">{rendered}</div>'''
