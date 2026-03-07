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
.shell {{ min-height: 100vh; }}
.sidebar {{ width: 240px; background: var(--surface); border-right: 1px solid var(--border); border-radius: 0 24px 24px 0; }}
.nav-item {{ width: 100%; justify-content: flex-start; border-radius: 14px; padding: 10px 14px; }}
.nav-item.active {{ background: var(--primary-soft); color: #8F2F5A; font-weight: 600; }}
.card {{ border-radius: 18px; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 6px 20px rgba(255,127,178,0.12); }}
.add-btn {{ border-radius: 999px; background: var(--primary); color: white; }}
.art {{ width: 220px; height: 320px; border-radius: 22px; border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; color: var(--muted); }}
</style>
""")

widgets = [
    {"name": "Harvard", "progress": 72, "deadline": "Mar 28, 2026"},
    {"name": "Duke", "progress": 38, "deadline": "Apr 05, 2026"},
]


def draw_cards(col):
    col.clear()
    for item in widgets:
        with col:
            with ui.card().classes('card w-full p-4'):
                with ui.row().classes('w-full justify-between items-center'):
                    ui.label(item['name']).classes('text-lg font-bold')
                    ui.icon('auto_awesome', color=THEME['primary'])
                ui.linear_progress(value=item['progress'] / 100).props('rounded size=12px color=positive').classes('w-full mt-3')
                ui.label(f"Progress: {item['progress']}%").classes('text-sm mt-2')
                ui.label(f"Deadline: {item['deadline']}").classes('text-sm mt-2')


with ui.row().classes('shell w-full no-wrap'):
    with ui.column().classes('sidebar p-4 gap-2'):
        ui.label('CollegeAtlas ✨').classes('text-xl font-bold mb-2')
        ui.button('🏠 Home').classes('nav-item active').props('flat')
        ui.button('🔎 College Research').classes('nav-item').props('flat')
        ui.button('📝 Essays').classes('nav-item').props('flat')
        ui.button('💌 Recommendations').classes('nav-item').props('flat')
        ui.button('💳 Fees').classes('nav-item').props('flat')

    with ui.column().classes('p-8 gap-4 w-full max-w-5xl'):
        ui.label('Home').classes('text-3xl font-bold')
        with ui.row().classes('w-full no-wrap items-start gap-8'):
            with ui.column().classes('w-full gap-4') as cards_col:
                draw_cards(cards_col)

                def add_widget():
                    widgets.append({'name': f'New College {len(widgets)+1}', 'progress': 0, 'deadline': 'TBD'})
                    draw_cards(cards_col)

                ui.button('＋ Add another widget', on_click=add_widget).classes('add-btn self-start')
            with ui.column().classes('items-center'):
                with ui.element('div').classes('art'):
                    ui.label('🌳 custom drawing area')

ui.run(title='CollegeApplicationAtlas', reload=False)
