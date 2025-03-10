from mkdocs.structure.files import Files

def define_env(env):

    @env.macro
    def next_steps_links(links):
        rendered = []
        for link in links:
            rendered.append(f"""
                <div>
                    <h4><a href="{link[1]}">{link[0]}</a></h4>
                    <p>{link[2]}</p>
                </div>
            """)
        rendered = "\n".join(rendered)
        return f'''<div class="grid">{rendered}</div>'''
