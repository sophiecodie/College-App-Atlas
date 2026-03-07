from nicegui import ui

THEME = {
    "bg": "#FFF9FB",
    "surface": "#FFFFFF",
    "primary": "#FF7FB2",
    "primary_soft": "#FFD6E8",
    "text": "#2E2A33",
    "muted": "#776B7A",
    "border": "#F2DCE8",
}

ui.add_head_html(f"""
<style>
:root {{
  --bg: {THEME['bg']};
  --surface: {THEME['surface']};
  --primary: {THEME['primary']};
  --primary-soft: {THEME['primary_soft']};
  --text: {THEME['text']};
  --muted: {THEME['muted']};
  --border: {THEME['border']};
}}
body {{
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui;
}}
.card {{
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 6px 20px rgba(255,127,178,0.12);
}}
</style>
""")

with ui.column().classes('p-10'):
    ui.label('CollegeApplicationAtlas ✨').classes('text-3xl font-bold')
    ui.label('MVP scaffold loaded.').classes('text-base')

ui.run(title='CollegeApplicationAtlas', reload=False)
