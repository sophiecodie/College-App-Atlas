from nicegui import ui
from datetime import datetime
from pathlib import Path
import json
import re

THEME = {
    "bg": "#F8F5EF",
    "surface": "#FFFDF9",
    "primary": "#B96B7A",
    "primary_soft": "#EFD9D5",
    "text": "#2F2A25",
    "muted": "#746A60",
    "border": "#E9DED1",
}


def hex_to_rgb(color: str):
    cleaned = color.lstrip('#')
    return tuple(int(cleaned[index:index + 2], 16) for index in (0, 2, 4))


def mix_hex(color_a: str, color_b: str, ratio: float):
    ratio = max(0.0, min(1.0, ratio))
    red_a, green_a, blue_a = hex_to_rgb(color_a)
    red_b, green_b, blue_b = hex_to_rgb(color_b)
    mixed = (
        round(red_a + (red_b - red_a) * ratio),
        round(green_a + (green_b - green_a) * ratio),
        round(blue_a + (blue_b - blue_a) * ratio),
    )
    return '#{:02X}{:02X}{:02X}'.format(*mixed)


def theme_palette(accent: str):
    red, green, blue = hex_to_rgb(accent)
    return {
        "bg": mix_hex(accent, "#FBF7F0", 0.92),
        "surface": mix_hex(accent, "#FFFDF9", 0.96),
        "primary": accent,
        "primary_soft": mix_hex(accent, "#FFF4F1", 0.72),
        "text": "#2F2A25",
        "muted": "#746A60",
        "border": mix_hex(accent, "#E9DED1", 0.82),
        "primary_deep": mix_hex(accent, "#3E322B", 0.28),
        "hover": mix_hex(accent, "#F6EEE6", 0.82),
        "shadow": f"rgba({red}, {green}, {blue}, 0.16)",
    }

ui.add_head_html(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap');
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
  font-family: Manrope, ui-sans-serif, system-ui;
}}
.shell {{ min-height: 100vh; }}
.sidebar {{ width: 240px; background: linear-gradient(180deg, #fffdf9 0%, #f7f1e7 100%); border-right: 1px solid var(--border); border-radius: 0 24px 24px 0; }}
.nav-item {{ width: 100%; justify-content: flex-start; border-radius: 14px; padding: 10px 14px; transition: background-color .2s ease, transform .2s ease; }}
.nav-item.active {{ background: var(--primary-soft); color: #8F2F5A; font-weight: 600; }}
.nav-item:hover {{ background: #f4ece2; transform: translateY(-1px); }}
.card {{ border-radius: 20px; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 8px 24px rgba(80, 58, 40, 0.08); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }}
.card:hover {{ transform: translateY(-2px); box-shadow: 0 12px 28px rgba(80, 58, 40, 0.12); border-color: #d8c8b6; }}
.add-btn {{ border-radius: 999px; background: var(--primary); color: white; transition: transform .2s ease, filter .2s ease; }}
.add-btn:hover {{ transform: translateY(-1px); filter: brightness(1.03); }}
.plus-square {{ width: 42px; height: 42px; min-width: 42px; border-radius: 12px; background: var(--primary); color: white; font-size: 1.2rem; font-weight: 700; }}
.art {{ width: 220px; height: 320px; border-radius: 22px; border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; color: var(--muted); }}
.stat-num {{ font-size: 1.8rem; font-weight: 700; color: #7F4B56; font-family: Fraunces, serif; }}
.section-title {{ font-size: 1.1rem; font-weight: 700; }}
.chip {{ border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 4px 10px; font-size: 0.8rem; color: var(--muted); }}
.progress-ring {{ width: 64px; height: 64px; border-radius: 999px; display:flex; align-items:center; justify-content:center; font-size: 0.85rem; font-weight: 700; color: #7F4B56; }}
h1, h2, h3, .text-3xl, .text-xl {{ font-family: Fraunces, serif; letter-spacing: 0.2px; }}
.q-tab, .q-expansion-item__container, .q-btn {{ border-radius: 12px; }}
.q-tab--active {{ background: #f2e7db; color: #6a3e48; }}
.q-expansion-item__container {{ border: 1px solid var(--border); background: #fffdfa; }}
.q-expansion-item__container:hover {{ border-color: #d8c8b6; }}
.q-field__control {{ border-radius: 12px !important; }}
.q-btn {{ transition: transform .2s ease, box-shadow .2s ease; }}
.q-btn:hover {{ transform: translateY(-1px); }}
.split-layout {{ display: flex; gap: 16px; width: 100%; align-items: flex-start; }}
.split-main {{ flex: 2 1 0; min-width: 0; display: flex; flex-direction: column; gap: 16px; }}
.split-side {{ flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 16px; }}
.four-col {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; }}
.three-col {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; width: 100%; align-items: stretch; }}
.research-grid {{
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr 1.2fr 1fr 1fr auto;
  gap: 14px;
  width: 100%;
  align-items: center;
}}
.research-row {{
  padding: 10px 8px;
  border-radius: 12px;
  transition: background-color .18s ease;
}}
.research-row:hover {{ background: #f7efe5; }}
.status-pill {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: max-content;
  white-space: nowrap;
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
  font-weight: 600;
}}
.pill-reach-high {{ background: #fde7e9; color: #a1303e; }}
.pill-reach {{ background: #feefe2; color: #a45a1f; }}
.pill-target {{ background: #e7effe; color: #2f5da8; }}
.pill-safety {{ background: #e7f8ed; color: #277a3d; }}
.pill-priority-high {{ background: #fff3d6; color: #8e6718; }}
.pill-priority-medium {{ background: #f3f1ee; color: #665f55; }}
.pill-priority-low {{ background: #f3f1ee; color: #665f55; }}
.pill-visit {{ background: #f1edf8; color: #5b4e78; }}
.research-list-card {{
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: #fffdfa;
}}
.research-list-card:hover {{
  background: #fcf5eb;
  border-color: #d8c8b6;
}}
.research-cards-grid {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  margin-top: 12px;
}}
.research-college-card {{
  min-height: 190px;
  max-height: 190px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}
.fees-grid {{
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
}}
.fee-card {{
  padding: 14px;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #fffdf9 0%, #fff9f2 100%);
  box-shadow: 0 8px 24px rgba(80, 58, 40, 0.06);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}}
.fee-card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(80, 58, 40, 0.10);
  border-color: #dccab7;
}}
.fee-card-top {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}}
.fee-core-grid {{
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(140px, 0.8fr));
  gap: 10px;
  width: 100%;
  align-items: end;
}}
.fee-inline-meta {{
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}}
.fee-total-pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 14px;
  background: #f7ede5;
  border: 1px solid #ead7c6;
}}
.fee-total-pill strong {{
  font-family: Fraunces, serif;
  font-size: 1.15rem;
  color: #7F4B56;
}}
.fee-optional-grid {{
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}}
.fee-optional-item {{
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fffdfa;
  padding: 10px 12px;
}}
.fee-toggle-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}}
.requirements-grid {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}}
.requirements-card {{
  border: 1px solid var(--border);
  border-radius: 20px;
  background: linear-gradient(180deg, #fffdf9 0%, #fff8ef 100%);
  padding: 16px;
}}
.requirements-card-title {{
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a5a45;
}}
.requirements-list {{
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}}
.requirement-row {{
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #efe4d6;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
}}
.requirement-row.checkbox-only {{
  grid-template-columns: 1fr;
}}
.requirement-label {{
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}}
.requirement-hint {{
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 2px;
}}
.activities-layout {{
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}}
.activities-board {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}}
.activity-final-list {{
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}}
.activity-card {{
  border: 1px solid var(--border);
  border-radius: 20px;
  background: linear-gradient(180deg, #fffdf9 0%, #fff8ee 100%);
  padding: 16px;
  box-shadow: 0 10px 24px rgba(80, 58, 40, 0.07);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}}
.activity-card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(80, 58, 40, 0.10);
  border-color: #dccab7;
}}
.activity-card.brainstorm-card {{
  background: linear-gradient(180deg, #fffaf4 0%, #fff4ea 100%);
  border-color: #ecd9c7;
  position: relative;
  overflow: hidden;
}}
.activity-card.brainstorm-card::before {{
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: linear-gradient(180deg, #d99b6d 0%, #efc9a8 100%);
}}
.activity-card.final-card {{
  background: #fffdf9;
  padding: 14px;
}}
.activity-card.drag-card {{
  cursor: grab;
}}
.activity-card.drag-card:active {{
  cursor: grabbing;
}}
.activity-card-top {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}}
.activity-fields-grid {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}}
.activity-fields-grid.final {{
  grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) repeat(3, minmax(110px, 0.7fr));
}}
.brainstorm-meta {{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}}
.brainstorm-badge {{
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f5e6d6;
  color: #8f5a2b;
  font-size: 0.78rem;
  font-weight: 600;
}}
.activity-rank-pill {{
  min-width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #f3e8dc;
  border: 1px solid #e3d2bf;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #7F4B56;
  font-family: Fraunces, serif;
}}
.activity-actions {{
  display: flex;
  gap: 6px;
  align-items: center;
}}
.activity-description textarea,
.activity-notes textarea {{
  min-height: 90px !important;
}}
.activity-description.compact textarea {{
  min-height: 74px !important;
}}
.activity-insights-grid {{
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}}
.insight-card {{
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  background: #fffdfa;
}}
.insight-label {{
  font-size: 0.82rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}}
.insight-value {{
  font-family: Fraunces, serif;
  font-size: 1.9rem;
  color: #7F4B56;
}}
.category-chip-wrap {{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}}
.activity-bar-list {{
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}}
.activity-bar-row {{
  display: grid;
  grid-template-columns: 120px 1fr 36px;
  gap: 10px;
  align-items: center;
}}
.activity-bar-track {{
  height: 10px;
  border-radius: 999px;
  background: #f2e8de;
  overflow: hidden;
}}
.activity-bar-fill {{
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d99b6d 0%, #b96b7a 100%);
}}
.essays-layout {{
  display: grid;
  grid-template-columns: minmax(220px, 0.78fr) minmax(540px, 1.95fr) minmax(260px, 0.9fr);
  gap: 14px;
  width: 100%;
  align-items: start;
}}
.essay-panel {{
  border: 1px solid #efe7dd;
  border-radius: 20px;
  background: #fffdfa;
  box-shadow: 0 6px 18px rgba(80, 58, 40, 0.04);
}}
.essay-panel.compact {{
  padding: 12px;
}}
.essay-panel.writer {{
  padding: 14px 16px 16px 16px;
  min-height: 760px;
  background: #fffefd;
}}
.essay-panel.tools {{
  padding: 12px;
}}
.essay-sidebar-top {{
  display: flex;
  align-items: center;
  gap: 8px;
}}
.essay-sidebar-toggle {{
  flex: 1 1 auto;
}}
.essay-tree-block {{
  border-top: 1px solid #f0e7dc;
  padding-top: 7px;
}}
.essay-tree-block:first-child {{
  border-top: none;
  padding-top: 0;
}}
.essay-tree-header {{
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 4px;
}}
.essay-tree-title {{
  font-size: 0.88rem;
  font-weight: 700;
}}
.essay-tree-chevron {{
  font-size: 0.78rem;
  color: var(--muted);
  width: 14px;
}}
.essay-tree-items {{
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}}
.essay-tree-item {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #4d433a;
  cursor: pointer;
  transition: background-color .16s ease, color .16s ease;
}}
.essay-tree-item:hover {{
  background: #f8f3ec;
}}
.essay-tree-item.active {{
  background: #f5eaeb;
  color: #6a3e48;
  font-weight: 600;
}}
.essay-tree-item-text {{
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}}
.essay-tree-item-meta {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  font-size: 0.7rem;
  color: var(--muted);
}}
.essay-tree-dot {{
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #d4c7b8;
}}
.essay-tree-dot.not-started {{ background: #d4c7b8; }}
.essay-tree-dot.drafting {{ background: #d89a69; }}
.essay-tree-dot.revise {{ background: #a687c4; }}
.essay-tree-dot.final {{ background: #61a97c; }}
.essay-header-row {{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}}
.essay-meta-row {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 0.82rem;
}}
.essay-meta-separator {{
  color: #b6a696;
}}
.essay-mini-pill {{
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #f6efe6;
  color: #6f6459;
}}
.essay-tag {{
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  background: #f3eee7;
  color: #6a5548;
  padding: 4px 9px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}}
.essay-autosave {{
  color: #6d655d;
  font-size: 0.74rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}}
.essay-autosave::before {{
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #67a77a;
}}
.essay-editor textarea {{
  min-height: 640px !important;
  font-size: 1rem;
  line-height: 1.75;
  border-width: 1px !important;
  border-color: #eee4d8 !important;
  background: #fffefd !important;
  box-shadow: 0 8px 22px rgba(80, 58, 40, 0.04);
}}
.essay-version-chip {{
  width: 100%;
  justify-content: flex-start;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px 8px;
  background: transparent;
  color: #4d433a;
  transition: background-color .16s ease, color .16s ease;
}}
.essay-version-chip:hover {{
  background: #f7f1ea;
}}
.essay-version-chip.active {{
  border-color: #d7b3bc;
  background: #f8eff1;
}}
.essay-utility-tabs {{
  width: 100%;
}}
.essay-list-stack {{
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}}
.essay-list-item {{
  border: 1px solid #eee5da;
  border-radius: 12px;
  padding: 9px 10px;
  background: #fffdfa;
}}
.essay-tab-panel {{
  padding-left: 0 !important;
  padding-right: 0 !important;
}}
.essay-small-button {{
  font-size: 0.76rem;
  padding: 0 10px;
}}
.essay-item-meta {{
  font-size: 0.72rem;
  color: var(--muted);
}}
.essay-word-count.over {{
  color: #9a5a44;
  background: #f9eee8;
}}
.essay-input-compact .q-field__control {{
  min-height: 40px !important;
}}
.settings-layout {{
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.65fr);
  gap: 18px;
  width: 100%;
  align-items: start;
}}
.settings-sidebar {{
  border: 1px solid var(--border);
  border-radius: 24px;
  background: linear-gradient(180deg, #fffdf9 0%, #f8f1e7 100%);
  padding: 14px;
  box-shadow: 0 12px 28px rgba(80, 58, 40, 0.07);
}}
.settings-content {{
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}}
.settings-nav-button {{
  width: 100%;
  justify-content: flex-start;
  border-radius: 16px;
  padding: 12px 14px;
  background: transparent;
  border: 1px solid transparent;
}}
.settings-nav-button.active {{
  background: #fff8fb;
  border-color: #dcb5be;
  box-shadow: inset 0 0 0 1px rgba(185, 107, 122, 0.10);
}}
.settings-hero {{
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 18px;
  background: linear-gradient(135deg, #fffdf9 0%, #f7efe5 50%, #f5e3e4 100%);
}}
.settings-grid {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}}
.settings-card {{
  border: 1px solid var(--border);
  border-radius: 22px;
  background: #fffdfa;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(80, 58, 40, 0.06);
}}
.settings-card.full {{
  grid-column: 1 / -1;
}}
.settings-card-title {{
  font-weight: 700;
  font-size: 1rem;
}}
.settings-card-subtitle {{
  color: var(--muted);
  font-size: 0.84rem;
}}
.settings-swatch-row {{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}}
.settings-swatch {{
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 14px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}}
.settings-swatch:hover {{
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(80, 58, 40, 0.10);
}}
.settings-swatch.active {{
  border-color: #4b4037;
  box-shadow: 0 10px 20px rgba(80, 58, 40, 0.12);
}}
.settings-density-option {{
  border: 1px solid #e8dccf;
  border-radius: 18px;
  padding: 12px;
  background: #fffdfa;
  cursor: pointer;
}}
.settings-density-option.active {{
  border-color: #d4a0ac;
  background: #fff8fb;
}}
.settings-preview {{
  border-radius: 24px;
  padding: 16px;
  border: 1px solid #e5d7c9;
  background: linear-gradient(180deg, #fffdf9 0%, #fff7ec 100%);
}}
.settings-preview-shell {{
  border-radius: 18px;
  border: 1px solid #eadbcc;
  background: #fffdfa;
  padding: 14px;
}}
.settings-preview-chip {{
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  color: white;
  font-size: 0.76rem;
  font-weight: 700;
}}
.settings-account-callout {{
  border: 1px dashed #d9c7b4;
  border-radius: 20px;
  padding: 18px;
  background: #fffaf4;
}}
@media (max-width: 1100px) {{
  .four-col {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  .three-col {{ grid-template-columns: 1fr; }}
  .split-layout {{ flex-direction: column; }}
  .research-grid {{ grid-template-columns: 1fr; }}
  .research-cards-grid {{ grid-template-columns: 1fr; }}
  .fee-core-grid {{ grid-template-columns: 1fr 1fr; }}
  .fee-optional-grid {{ grid-template-columns: 1fr 1fr; }}
  .activities-board {{ grid-template-columns: 1fr; }}
  .activity-fields-grid.final {{ grid-template-columns: 1fr 1fr; }}
  .activity-insights-grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  .essays-layout {{ grid-template-columns: 1fr; }}
  .essay-summary-grid {{ grid-template-columns: 1fr; }}
  .essay-compare-grid {{ grid-template-columns: 1fr; }}
  .settings-layout {{ grid-template-columns: 1fr; }}
  .settings-grid {{ grid-template-columns: 1fr; }}
}}
@media (max-width: 700px) {{
  .fee-card-top {{ flex-direction: column; }}
  .fee-core-grid {{ grid-template-columns: 1fr; }}
  .fee-optional-grid {{ grid-template-columns: 1fr; }}
  .activity-card-top {{ flex-direction: column; align-items: flex-start; }}
  .activity-fields-grid {{ grid-template-columns: 1fr; }}
  .activity-fields-grid.final {{ grid-template-columns: 1fr; }}
  .activity-insights-grid {{ grid-template-columns: 1fr; }}
  .activity-bar-row {{ grid-template-columns: 90px 1fr 32px; }}
  .essay-header-row {{ flex-direction: column; }}
}}
@keyframes softFadeUp {{
  0% {{ opacity: 0; transform: translateY(8px); }}
  100% {{ opacity: 1; transform: translateY(0); }}
}}
.shell > div:last-child {{
  animation: softFadeUp .35s ease-out;
}}
</style>
""")

ui.add_head_html("""
<style>
:root {
  --primary-deep: #6A3E48;
  --hover: #F4ECE2;
  --theme-shadow: rgba(185, 107, 122, 0.16);
  --card-radius: 20px;
  --panel-radius: 24px;
  --nav-radius: 14px;
  --field-radius: 12px;
  --panel-gap: 16px;
  --section-gap: 16px;
}
body.density-compact {
  --card-radius: 18px;
  --panel-radius: 22px;
  --nav-radius: 13px;
  --field-radius: 11px;
  --panel-gap: 14px;
  --section-gap: 14px;
}
body.density-cozy {
  --card-radius: 24px;
  --panel-radius: 28px;
  --nav-radius: 16px;
  --field-radius: 14px;
  --panel-gap: 20px;
  --section-gap: 18px;
}
body {
  background: var(--bg);
  color: var(--text);
}
.sidebar {
  background: linear-gradient(180deg, var(--surface) 0%, var(--primary-soft) 100%);
  border-right: 1px solid var(--border);
  border-radius: 0 var(--panel-radius) var(--panel-radius) 0;
}
.nav-item {
  border-radius: var(--nav-radius);
}
.nav-item.active {
  background: var(--primary-soft);
  color: var(--primary-deep);
}
.nav-item:hover {
  background: var(--hover);
}
.card,
.essay-panel,
.settings-sidebar,
.settings-card,
.settings-hero,
.settings-preview,
.fee-card,
.activity-card,
.research-list-card {
  border-color: var(--border) !important;
  border-radius: var(--card-radius);
}
.card,
.fee-card,
.activity-card,
.research-list-card {
  background: var(--surface);
}
.card:hover,
.fee-card:hover,
.activity-card:hover,
.research-list-card:hover {
  border-color: var(--primary-soft) !important;
}
.section-title,
.stat-num,
.progress-ring,
.essay-summary-value {
  color: var(--primary-deep);
}
.chip,
.essay-tag,
.essay-mini-pill,
.status-pill,
.fee-total-pill,
.activity-rank-pill,
.settings-preview-chip {
  border-color: var(--border);
}
.q-tab--active,
.settings-nav-button.active,
.settings-density-option.active,
.essay-prompt-card.active,
.essay-version-chip.active {
  background: var(--primary-soft) !important;
  color: var(--primary-deep) !important;
  border-color: var(--primary) !important;
}
.q-field__control,
.q-tab,
.q-btn,
.q-expansion-item__container {
  border-radius: var(--field-radius) !important;
}
.q-expansion-item__container,
.settings-preview-shell,
.essay-compare-card,
.essay-list-item,
.essay-version-chip,
.fee-optional-item {
  background: var(--surface);
  border-color: var(--border);
}
.split-layout,
.four-col,
.three-col,
.research-cards-grid,
.fees-grid,
.activities-board,
.activity-final-list,
.essay-summary-grid,
.essays-layout,
.settings-layout,
.settings-grid,
.essay-compare-grid {
  gap: var(--panel-gap) !important;
}
.settings-sidebar,
.settings-card,
.settings-hero,
.settings-preview,
.essay-panel.writer,
.essay-panel.tools,
.essay-panel.compact {
  padding: calc(var(--section-gap) - 2px) !important;
}
.todo-card {
  background: linear-gradient(180deg, #fffdf9 0%, #fff7ee 100%);
}
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.todo-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.todo-quick-add {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(150px, 0.7fr) minmax(130px, 0.6fr) auto;
  gap: 8px;
  width: 100%;
  align-items: end;
}
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.todo-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 11px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
}
.todo-item.completed {
  background: #fbf6f0;
}
.todo-item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.todo-item-title {
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
  word-break: break-word;
}
.todo-item-title.completed {
  color: var(--muted);
  text-decoration: line-through;
}
.todo-meta {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
}
.todo-priority-high {
  background: #fde7e9;
  color: #a1303e;
}
.todo-priority-medium {
  background: #fff3d6;
  color: #8e6718;
}
.todo-priority-low {
  background: #edf5e9;
  color: #47703b;
}
.todo-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.todo-empty {
  border: 1px dashed var(--border);
  border-radius: 14px;
  padding: 14px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.55);
}
@media (max-width: 900px) {
  .todo-quick-add {
    grid-template-columns: 1fr;
  }
  .todo-header {
    align-items: flex-start;
  }
  .todo-item {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .todo-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
  .requirements-grid {
    grid-template-columns: 1fr;
  }
  .requirement-row {
    grid-template-columns: 1fr;
  }
}
</style>
""")

widgets = [
    {"name": "Harvard", "progress": 72, "deadline": "Mar 28, 2026"},
    {"name": "Duke", "progress": 38, "deadline": "Apr 05, 2026"},
]


COLLEGE_DATA_PATH = Path(__file__).with_name('college_plans.json')
APPLICATION_STATUS_OPTIONS = ['In Progress', 'Ready to Submit', 'Submitted']
TASK_PRIORITY_OPTIONS = ['', 'High', 'Medium', 'Low']
TASK_VIEW_OPTIONS = ['Due Soon', 'Incomplete', 'Completed']
TESTING_POLICY_OPTIONS = ['Not required', 'Self-report', 'Official report required']
REQUIREMENT_SECTIONS = [
    {
        'title': 'Application',
        'items': [
            {'key': 'common_app_submitted', 'label': 'Common App submitted', 'type': 'checkbox'},
            {'key': 'supplement_submitted', 'label': 'Supplement submitted', 'type': 'checkbox'},
        ],
    },
    {
        'title': 'Testing',
        'items': [
            {'key': 'sat_requirement', 'label': 'SAT requirement', 'type': 'select'},
            {'key': 'sat_submission_method', 'label': 'SAT self-report vs official send', 'type': 'select'},
            {'key': 'act_accepted', 'label': 'ACT accepted', 'type': 'select'},
            {'key': 'ap_requirement', 'label': 'AP score requirement', 'type': 'select'},
            {'key': 'ap_submission_method', 'label': 'AP self-report vs official send', 'type': 'select'},
        ],
    },
    {
        'title': 'Documents',
        'items': [
            {'key': 'transcript', 'label': 'Transcript', 'type': 'checkbox'},
            {'key': 'school_report', 'label': 'School report', 'type': 'checkbox'},
            {'key': 'counselor_recommendation', 'label': 'Counselor recommendation', 'type': 'checkbox'},
            {'key': 'teacher_recommendations', 'label': 'Teacher recommendations', 'type': 'checkbox'},
            {'key': 'midyear_report', 'label': 'Midyear report', 'type': 'checkbox'},
        ],
    },
    {
        'title': 'Financial Aid',
        'items': [
            {'key': 'fafsa', 'label': 'FAFSA', 'type': 'checkbox'},
            {'key': 'css_profile', 'label': 'CSS Profile', 'type': 'checkbox'},
        ],
    },
    {
        'title': 'Extras',
        'items': [
            {'key': 'interview', 'label': 'Interview', 'type': 'checkbox'},
            {'key': 'portfolio', 'label': 'Portfolio', 'type': 'checkbox'},
        ],
    },
]


def parse_iso_date(date_text: str):
    if not date_text:
        return None
    try:
        return datetime.strptime(date_text, '%Y-%m-%d').date()
    except ValueError:
        return None


def default_home_tasks():
    return [
        {
            'id': 1,
            'title': 'Finish Harvard supplemental draft',
            'completed': False,
            'due_date': '2026-03-20',
            'priority': 'High',
        },
        {
            'id': 2,
            'title': 'Follow up with Ms. Patel about recommendation letter',
            'completed': False,
            'due_date': '2026-03-18',
            'priority': 'Medium',
        },
        {
            'id': 3,
            'title': 'Pay Duke application fee',
            'completed': True,
            'due_date': '',
            'priority': '',
        },
    ]


def normalize_home_tasks(raw_tasks):
    if not isinstance(raw_tasks, list):
        return default_home_tasks()

    normalized = []

    for index, item in enumerate(raw_tasks, start=1):
        if isinstance(item, str):
            task = {
                'id': index,
                'title': item.strip(),
                'completed': False,
                'due_date': '',
                'priority': '',
            }
        elif isinstance(item, dict):
            task = {
                'id': item.get('id', index),
                'title': str(item.get('title', '')).strip(),
                'completed': bool(item.get('completed', False)),
                'due_date': str(item.get('due_date', '') or ''),
                'priority': str(item.get('priority', '') or ''),
            }
        else:
            continue

        if not task['title']:
            continue
        if task['priority'] not in TASK_PRIORITY_OPTIONS:
            task['priority'] = ''
        if parse_iso_date(task['due_date']) is None:
            task['due_date'] = ''
        normalized.append(task)

    return normalized


def load_college_catalog():
    global home_tasks
    try:
        with COLLEGE_DATA_PATH.open('r', encoding='utf-8') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        print(f'Could not load college catalog from {COLLEGE_DATA_PATH}: {error}')
        home_tasks = default_home_tasks()
        return {}

    # Backward compatibility: old format was {college_name: {plans: {...}}}
    if isinstance(data, dict) and 'colleges' not in data:
        home_tasks = default_home_tasks()
        converted = {}
        for college_name, value in data.items():
            plans = value.get('plans', {}) if isinstance(value, dict) else {}
            converted[college_name] = {
                'name': college_name,
                'application_options': [{'type': plan_type, 'deadline': deadline} for plan_type, deadline in plans.items()],
                'selected_application_type': next(iter(plans), 'Regular Decision'),
                'status': 'In Progress',
                'major': 'Undeclared',
                'quick_notes': '',
                'important_links': [],
                'basic_info': {},
                'essay_prompts': [],
                'research_page_reference': f'research://{college_name}',
                'required_recommendations': [
                    {'label': 'Required Recommender 1', 'assigned_recommender': ''},
                    {'label': 'Required Recommender 2', 'assigned_recommender': ''},
                ],
                'optional_recommendations': [
                    {'label': 'Optional Recommender', 'assigned_recommender': ''},
                ],
            }
        return converted

    colleges = data.get('colleges', []) if isinstance(data, dict) else []
    home_tasks = normalize_home_tasks(data.get('home_tasks', default_home_tasks()) if isinstance(data, dict) else default_home_tasks())
    by_name = {}
    for college in colleges:
        if isinstance(college, dict) and college.get('name'):
            by_name[college['name']] = college
    return by_name


def save_college_catalog():
    payload = {'colleges': list(college_data.values()), 'home_tasks': home_tasks}
    with COLLEGE_DATA_PATH.open('w', encoding='utf-8') as file:
        json.dump(payload, file, indent=2)


college_data = load_college_catalog()
essays_due = [
    {"title": "Harvard Supplemental", "due": "Mar 20, 2026"},
    {"title": "Duke Why Us", "due": "Mar 24, 2026"},
]
missing_recommendations = [
    {"college": "Harvard", "recommender": "Ms. Patel"},
]
fees_status = [
    {"college": "Harvard", "status": "Pending fee"},
    {"college": "Duke", "status": "Submitted"},
]
fee_tracker = {
    "Harvard": {
        "college_name": "Harvard",
        "application_fee": 85,
        "fee_waiver_status": "Requested",
        "payment_status": "Not paid",
        "notes": "Waiver request drafted. Keep an eye on the CSS deadline.",
        "css_profile_required": True,
        "css_profile_cost": 25,
        "fafsa_required": False,
        "fafsa_cost": 0,
        "sat_score_send_required": True,
        "sat_score_send_cost": 14,
        "ap_score_send_required": False,
        "ap_score_send_cost": 0,
    },
    "Duke": {
        "college_name": "Duke",
        "application_fee": 75,
        "fee_waiver_status": "Approved",
        "payment_status": "Paid",
        "notes": "Application fee waived. Only tracking the remaining send costs.",
        "css_profile_required": True,
        "css_profile_cost": 16,
        "fafsa_required": True,
        "fafsa_cost": 0,
        "sat_score_send_required": True,
        "sat_score_send_cost": 14,
        "ap_score_send_required": True,
        "ap_score_send_cost": 15,
    },
}
ACTIVITY_CATEGORIES = [
    "Leadership",
    "Research",
    "Community Service",
    "Arts",
    "Athletics",
    "STEM",
    "Work",
    "Family Responsibilities",
    "Academic Club",
    "Other",
]
brainstorm_activities = [
    {
        "activity_name": "Girls Who Code chapter",
        "category": "Leadership",
        "notes": "Started chapter meetings, planned workshops, and mentored newer members.",
        "years_involved": "10-12",
        "hours_per_week": 3,
    },
    {
        "activity_name": "University public-interest AI lab",
        "category": "Research",
        "notes": "Assisted with literature review and data cleaning for civic-tech research.",
        "years_involved": "11-12",
        "hours_per_week": 6,
    },
    {
        "activity_name": "Weekend food pantry volunteer",
        "category": "Community Service",
        "notes": "Helped organize distributions and translated for Spanish-speaking families.",
        "years_involved": "9-12",
        "hours_per_week": 4,
    },
]
final_activities = [
    {
        "activity_name": "Girls Who Code chapter",
        "role_position": "Founder & President",
        "organization": "Central High School",
        "description": "Founded a 25-member coding club, led weekly lessons, and organized a district hack night for middle school students.",
        "years_involved": "10-12",
        "hours_per_week": 3,
        "weeks_per_year": 30,
        "category": "Leadership",
    },
    {
        "activity_name": "Public-interest AI research",
        "role_position": "Student Research Assistant",
        "organization": "State University Lab",
        "description": "Supported an AI fairness project through data prep, paper review, and weekly research meetings.",
        "years_involved": "11-12",
        "hours_per_week": 6,
        "weeks_per_year": 24,
        "category": "Research",
    },
    {
        "activity_name": "Food pantry outreach",
        "role_position": "Lead Volunteer",
        "organization": "Neighborhood Food Pantry",
        "description": "Coordinated volunteer shifts, stocked supplies, and translated for visiting families during distributions.",
        "years_involved": "9-12",
        "hours_per_week": 4,
        "weeks_per_year": 40,
        "category": "Community Service",
    },
    {
        "activity_name": "Varsity soccer",
        "role_position": "Captain",
        "organization": "Central High School",
        "description": "Led team practices, mentored younger players, and balanced athletics with school responsibilities.",
        "years_involved": "9-12",
        "hours_per_week": 8,
        "weeks_per_year": 16,
        "category": "Athletics",
    },
]
activity_drag_state = {"final_index": None}
college_profiles = {
    "Harvard": {
        "application_type": "Regular Decision",
        "status": "In Progress",
        "major": "Computer Science",
        "notes": "Need stronger opening paragraph for personal statement.",
        "links": [
            ("Admissions Portal", "https://college.harvard.edu/admissions"),
            ("Supplemental Prompts", "https://college.harvard.edu/apply"),
        ],
        "essays": ["Personal Statement", "Harvard Short Answer"],
        "research": ["Compare CS concentration tracks", "Review undergraduate research labs"],
        "requirements": ["Transcript", "SAT/ACT (optional)", "School Report"],
        "fees": ["Application fee: Pending", "CSS Profile: Not started"],
        "recs": ["Teacher 1: Requested", "Teacher 2: Pending", "Counselor: Received"],
    },
    "Duke": {
        "application_type": "Early Decision II",
        "status": "Drafting Materials",
        "major": "Public Policy",
        "notes": "Finalize extracurricular impact examples.",
        "links": [
            ("Admissions Portal", "https://admissions.duke.edu"),
            ("Application Requirements", "https://admissions.duke.edu/apply"),
        ],
        "essays": ["Why Duke", "Community Essay"],
        "research": ["Explore Sanford School offerings", "Check first-year seminar options"],
        "requirements": ["Transcript", "School Report", "Midyear Report"],
        "fees": ["Application fee: Submitted"],
        "recs": ["Teacher 1: Received", "Teacher 2: Requested"],
    },
}
essay_data = {
    "Harvard": [
        {
            "title": "How will you explore your academic interests at Harvard?",
            "prompt_text": "How do your intellectual interests align with Harvard, and how will you pursue them on campus?",
            "prompt_type": "Why Major",
            "word_limit": 250,
            "due_date": "Mar 20, 2026",
            "comments": [
                {"version": "v1", "author": "Advisor", "text": "Add one concrete program example."},
                {"version": "v2", "author": "You", "text": "Researching one lab and one public-interest tech angle."},
            ],
            "drafts": [
                {
                    "name": "v1",
                    "label": "Academic fit baseline",
                    "status": "rough",
                    "external_doc_url": "https://docs.google.com/document/d/harvard-why-major-v1/edit",
                    "autosave_status": "Saved",
                    "last_saved": "9:42 PM",
                    "text": "I want to study computer science and policy. At Harvard, I can connect technical coursework with social impact through interdisciplinary projects.",
                },
                {
                    "name": "v2",
                    "label": "Specific programs pass",
                    "status": "revise",
                    "external_doc_url": "https://docs.google.com/document/d/harvard-why-major-v2/edit",
                    "autosave_status": "Saved",
                    "last_saved": "10:18 PM",
                    "text": "My interests in computer science and policy fit Harvard's interdisciplinary ecosystem. I want to combine CS problem-solving with policy analysis and contribute to research labs focused on public-interest technology.",
                },
            ],
        },
        {
            "title": "Tell us about a community you belong to.",
            "prompt_text": "Describe a community that has shaped you and explain your role within it.",
            "prompt_type": "Community",
            "word_limit": 200,
            "due_date": "Mar 24, 2026",
            "comments": [
                {"version": "v1", "author": "Counselor", "text": "Needs a clearer role and a stronger ending reflection."},
            ],
            "drafts": [
                {
                    "name": "v1",
                    "label": "Tutoring community start",
                    "status": "brainstorm",
                    "external_doc_url": "",
                    "autosave_status": "Saved",
                    "last_saved": "8:05 PM",
                    "text": "I learned leadership through organizing tutoring for younger students.",
                },
            ],
        },
    ],
    "Duke": [
        {
            "title": "Why Duke?",
            "prompt_text": "Why are you interested in Duke and how does it match your goals?",
            "prompt_type": "Why Us",
            "word_limit": 250,
            "due_date": "Mar 24, 2026",
            "comments": [
                {"version": "v1", "author": "Advisor", "text": "Mention one specific Duke resource."},
            ],
            "drafts": [
                {
                    "name": "v1",
                    "label": "Core fit draft",
                    "status": "rough",
                    "external_doc_url": "https://docs.google.com/document/d/duke-why-us-v1/edit",
                    "autosave_status": "Saved",
                    "last_saved": "7:54 PM",
                    "text": "Duke fits my goals in policy and data-driven problem solving. I am excited by hands-on learning and interdisciplinary opportunities.",
                }
            ],
        },
        {
            "title": "What idea keeps pulling you back?",
            "prompt_text": "Describe an intellectual question or topic you keep returning to and why it matters to you.",
            "prompt_type": "Intellectual Curiosity",
            "word_limit": 200,
            "due_date": "Mar 24, 2026",
            "comments": [
                {"version": "v1", "author": "You", "text": "Could connect algorithmic fairness to public policy interests."},
            ],
            "drafts": [
                {
                    "name": "v1",
                    "label": "Curiosity angle",
                    "status": "rough",
                    "external_doc_url": "",
                    "autosave_status": "Saved",
                    "last_saved": "6:33 PM",
                    "text": "I keep returning to how algorithmic systems shape real decisions, especially when the data behind them reflects unequal access and opportunity.",
                }
            ],
        },
    ],
}
ESSAY_STATUSES = ["not_started", "drafting", "revise", "final"]
ESSAY_STATUS_LABELS = {
    "not_started": "Not started",
    "drafting": "Drafting",
    "revise": "Revise",
    "final": "Final",
}
ESSAY_STATUS_ALIASES = {
    "brainstorm": "not_started",
    "rough": "drafting",
    "drafting": "drafting",
    "revise": "revise",
    "final": "final",
}
essay_state = {
    "college": "Harvard",
    "prompt_index": 0,
    "draft_index": 0,
    "compare_version": None,
    "group_mode": "school",
    "utility_tab": "versions",
    "expanded_groups": {"Harvard", "Duke"},
}
theme_presets = [
    {"name": "Rosewood", "color": "#B96B7A"},
    {"name": "Forest", "color": "#6E8B74"},
    {"name": "Navy", "color": "#506C8F"},
    {"name": "Terracotta", "color": "#C97A5A"},
    {"name": "Gold", "color": "#BA9158"},
]
settings_state = {
    "category": "Profile",
    "profile": {
        "student_name": "Sophie Carter",
        "graduation_year": "2027",
        "high_school": "Riverview High School",
        "intended_major": "Computer Science, Public Policy",
        "time_zone": "America/New_York",
    },
    "appearance": {
        "accent_theme": "Rosewood",
        "layout_density": "Compact",
        "dark_mode": False,
    },
}


def current_theme_values():
    accent_name = settings_state["appearance"].get("accent_theme", "Rosewood")
    accent = next((theme for theme in theme_presets if theme["name"] == accent_name), theme_presets[0])
    return theme_palette(accent["color"])


def apply_theme_settings():
    palette = current_theme_values()
    density = settings_state["appearance"].get("layout_density", "Compact").lower()
    ui.run_javascript(f"""
    (() => {{
      const root = document.documentElement;
      const body = document.body;
      const theme = {json.dumps(palette)};
      Object.entries(theme).forEach(([key, value]) => root.style.setProperty(`--${{key.replace(/_/g, '-')}}`, value));
      body.classList.remove('density-compact', 'density-cozy');
      body.classList.add('density-{density}');
    }})();
    """)
research_database = {
    "Harvard": {
        "location": "Cambridge, MA",
        "major_program": "Computer Science",
        "application_deadline": "Mar 28, 2026",
        "why_this_school": "Interdisciplinary CS + policy opportunities",
        "vibe": "Ambitious, research-focused",
        "academic_strengths": "CS, economics, public policy",
        "notes_status": "In progress",
        "interview": "Requested",
        "visit_status": "Planned",
        "priority_level": "High",
        "general_notes": "Strong alignment with public-interest technology goals.",
        "academic_programs": "CS concentration, policy electives, undergrad research grants.",
        "campus_culture": "Collaborative but high-performing environment.",
        "clubs_professors_labs": "Harvard College Consulting Group, Berkman Klein projects.",
        "why_us_material": "Tie interdisciplinary curriculum to long-term civic-tech goals.",
        "links_resources": "https://college.harvard.edu/admissions",
        "personal_reflections": "Feels like a strong mission fit if support is available.",
    },
    "Duke": {
        "location": "Durham, NC",
        "major_program": "Public Policy",
        "application_deadline": "Apr 05, 2026",
        "why_this_school": "Policy training with practical leadership pathways",
        "vibe": "Balanced academics + campus life",
        "academic_strengths": "Public policy, economics, global studies",
        "notes_status": "Started",
        "interview": "Not required",
        "visit_status": "Visited",
        "priority_level": "Medium",
        "general_notes": "Good fit for policy + data interests.",
        "academic_programs": "Sanford School pathways and policy labs.",
        "campus_culture": "School spirit and strong student communities.",
        "clubs_professors_labs": "Policy student groups and research institutes.",
        "why_us_material": "Emphasize interest in applied policy impact.",
        "links_resources": "https://admissions.duke.edu",
        "personal_reflections": "Feels practical and supportive for career goals.",
    },
}
research_state = {
    "college": None,
    "sort_by": "priority_level",
}
PRIORITY_RANK = {"High": 0, "Medium": 1, "Low": 2}
recommenders = [
    {
        "name": "Ms. Patel",
        "role": "Math Teacher",
        "subject": "Mathematics",
        "schools_assigned": ["Harvard", "Duke"],
        "request_sent": True,
        "confirmed": True,
        "submitted": False,
        "notes": "Will submit after spring break.",
    },
    {
        "name": "Mr. Johnson",
        "role": "Counselor",
        "subject": "College Counseling",
        "schools_assigned": ["Harvard", "Duke"],
        "request_sent": True,
        "confirmed": True,
        "submitted": True,
        "notes": "School report submitted.",
    },
    {
        "name": "Dr. Kim",
        "role": "Supplemental Recommender",
        "subject": "Research Mentorship",
        "schools_assigned": ["Harvard"],
        "request_sent": True,
        "confirmed": False,
        "submitted": False,
        "notes": "Follow up this week.",
    },
]
recommendation_matrix = {
    "Harvard": {"Ms. Patel": "Confirmed", "Mr. Johnson": "Submitted", "Dr. Kim": "Missing"},
    "Duke": {"Ms. Patel": "Requested", "Mr. Johnson": "Submitted", "Dr. Kim": "N/A"},
}

SIDEBAR_PAGES = [
    ("home", "🏠 Home"),
    ("colleges", "🎓 Colleges"),
    ("activities", "⭐ Activities"),
    ("essays", "📝 Essays"),
    ("research", "🔎 Research"),
    ("recs", "💌 Recommendations"),
    ("fees", "💳 Fees"),
    ("settings", "⚙️ Settings"),
]

current_page = {'id': 'home', 'college': None, 'college_tab': 'overview'}
sidebar_buttons = {}
content_col = None


def set_active_sidebar():
    active_page = 'colleges' if current_page['id'] == 'college' else current_page['id']
    for page_id, button in sidebar_buttons.items():
        if page_id == active_page:
            button.classes(add='active')
        else:
            button.classes(remove='active')


def open_page(page_id: str):
    current_page['id'] = page_id
    current_page['college'] = None
    current_page['college_tab'] = 'overview'
    research_state["college"] = None
    set_active_sidebar()
    render_page()


def open_college_page(college_name: str):
    current_page['id'] = 'college'
    current_page['college'] = college_name
    current_page['college_tab'] = 'overview'
    set_active_sidebar()
    render_page()


def set_college_tab(tab_name: str):
    current_page['college_tab'] = tab_name


def get_widget(college_name: str):
    return next((item for item in widgets if item['name'] == college_name), None)


def get_college_profile(college_name: str):
    record = ensure_college_record(college_name)
    profile = college_profiles.get(college_name, {})
    widget = get_widget(college_name) or {}
    return {
        "application_type": record.get("selected_application_type") or profile.get("application_type", "Not set"),
        "deadline": widget.get("deadline", get_college_deadline(college_name)),
        "status": record.get("status", profile.get("status", "Not started")),
        "major": record.get("major", profile.get("major", "Undeclared")),
        "progress": widget.get("progress", 0),
        "notes": record.get("quick_notes", profile.get("notes", "Add quick notes for this college.")),
        "links": record.get("important_links", profile.get("links", [])),
        "essays": record.get("essay_prompts", profile.get("essays", [])),
        "research": [record.get("basic_info", {}).get("summary", "")] if record.get("basic_info", {}).get("summary") else profile.get("research", []),
        "basic_info": record.get("basic_info", {}),
        "research_page_reference": record.get("research_page_reference", f"research://{college_name}"),
        "requirements": profile.get("requirements", []),
        "requirements_checklist": record.get("requirements_checklist", default_requirements_checklist()),
        "fees": profile.get("fees", []),
        "recs": profile.get("recs", []),
    }


def render_simple_list(items, empty_text: str):
    if items:
        for item in items:
            ui.label(f'• {item}').classes('text-sm mt-1')
    else:
        ui.label(empty_text).classes('text-sm mt-1')


def normalize_words(text: str):
    return set(re.findall(r"[a-zA-Z']+", text.lower()))


def count_words(text: str):
    return len(re.findall(r"\b\w+\b", text))


PROMPT_TYPE_ELEMENTS = {
    "Why Us": ["academic fit", "specific school resource", "campus/community fit", "future contribution"],
    "Why Major": ["intellectual motivation", "academic path", "specific school resource", "future direction"],
    "Community": ["community context", "your role", "impact on others", "reflection/growth"],
    "Identity": ["identity context", "specific lived detail", "reflection", "perspective contribution"],
    "Intellectual Curiosity": ["central question", "evidence of exploration", "why it matters", "next step on campus"],
}

PROMPT_TYPE_KEYWORDS = {
    "Why Us": {
        "academic fit": ["study", "major", "program", "class", "research"],
        "specific school resource": ["lab", "center", "professor", "institute", "course", "program"],
        "campus/community fit": ["community", "campus", "student", "collaborative", "team"],
        "future contribution": ["contribute", "build", "bring", "create", "lead"],
    },
    "Why Major": {
        "intellectual motivation": ["interested", "curious", "fascinated", "drawn", "want"],
        "academic path": ["study", "coursework", "research", "learn", "major"],
        "specific school resource": ["lab", "center", "professor", "program", "seminar"],
        "future direction": ["future", "career", "impact", "apply", "solve"],
    },
    "Community": {
        "community context": ["community", "group", "team", "students", "neighbors"],
        "your role": ["organized", "led", "helped", "supported", "taught"],
        "impact on others": ["others", "younger", "family", "students", "people"],
        "reflection/growth": ["learned", "realized", "grew", "changed", "understood"],
    },
    "Identity": {
        "identity context": ["identity", "background", "culture", "family", "language"],
        "specific lived detail": ["remember", "when", "because", "during", "through"],
        "reflection": ["realized", "understood", "learned", "questioned", "carried"],
        "perspective contribution": ["bring", "perspective", "voice", "contribute", "share"],
    },
    "Intellectual Curiosity": {
        "central question": ["question", "wonder", "why", "how", "idea"],
        "evidence of exploration": ["read", "built", "researched", "tested", "studied"],
        "why it matters": ["matters", "care", "impact", "important", "because"],
        "next step on campus": ["college", "campus", "research", "lab", "course"],
    },
}

PROMPT_TYPE_RELATIONSHIPS = {
    "Why Us": ["Why Major", "Intellectual Curiosity"],
    "Why Major": ["Why Us", "Intellectual Curiosity"],
    "Community": ["Identity"],
    "Identity": ["Community"],
    "Intellectual Curiosity": ["Why Major", "Why Us"],
}


def normalize_essay_status(status: str, draft_text: str = ""):
    normalized = ESSAY_STATUS_ALIASES.get((status or "").strip().lower(), "not_started")
    if not draft_text.strip():
        return "not_started"
    return normalized


def status_label(status: str):
    normalized = ESSAY_STATUS_ALIASES.get((status or "").strip().lower(), "not_started")
    return ESSAY_STATUS_LABELS.get(normalized, "Not started")


def status_class(status: str):
    normalized = ESSAY_STATUS_ALIASES.get((status or "").strip().lower(), "not_started")
    return normalized.replace("_", "-")


def ensure_essay_data_shape():
    for prompts in essay_data.values():
        for prompt in prompts:
            prompt.setdefault("prompt_type", "Essay")
            prompt.setdefault("comments", [])
            prompt.setdefault("drafts", [])
            for index, draft in enumerate(prompt["drafts"], start=1):
                draft.setdefault("name", f"v{index}")
                draft.setdefault("label", draft["name"])
                draft.setdefault("text", "")
                draft.setdefault("external_doc_url", "")
                draft.setdefault("autosave_status", "Saved")
                draft.setdefault("last_saved", "")
                draft["status"] = normalize_essay_status(draft.get("status", "not_started"), draft["text"])


def current_prompt_status(prompt: dict):
    if not prompt.get("drafts"):
        return "not_started"
    latest = prompt["drafts"][-1]
    return normalize_essay_status(latest.get("status", "not_started"), latest.get("text", ""))


def prompt_word_progress(prompt: dict):
    if not prompt.get("drafts"):
        return 0, 0, 0
    latest = prompt["drafts"][-1]
    words = count_words(latest.get("text", ""))
    limit = max(1, prompt.get("word_limit", 1))
    return words, limit, min(100, int((words / limit) * 100))


def prompt_last_edited(prompt: dict):
    if not prompt.get("drafts"):
        return "No edits"
    return prompt["drafts"][-1].get("last_saved") or "No edits"


def get_school_reference_terms(college_name: str):
    research = research_database.get(college_name, {})
    source = " ".join([
        college_name,
        research.get("major_program", ""),
        research.get("why_this_school", ""),
        research.get("academic_programs", ""),
        research.get("clubs_professors_labs", ""),
    ]).lower()
    return {word for word in re.findall(r"[a-zA-Z']+", source) if len(word) > 4}


def analyze_prompt_breakdown(college_name: str, prompt: dict, draft: dict):
    prompt_type = prompt.get("prompt_type", "Why Us")
    draft_text = draft.get("text", "")
    draft_words = normalize_words(draft_text)
    word_count = count_words(draft_text)
    elements = PROMPT_TYPE_ELEMENTS.get(prompt_type, [])
    keyword_map = PROMPT_TYPE_KEYWORDS.get(prompt_type, {})
    detected = []
    missing = []

    for element in elements:
        triggers = keyword_map.get(element, [])
        if any(keyword in draft_words for keyword in triggers):
            detected.append(element)
        else:
            missing.append(element)

    school_terms = get_school_reference_terms(college_name)
    school_specific = bool(draft_words & school_terms or college_name.lower() in draft_text.lower())
    too_generic = word_count >= 70 and not school_specific and prompt_type in {"Why Us", "Why Major", "Intellectual Curiosity"}
    school_specific_missing = prompt_type in {"Why Us", "Why Major", "Intellectual Curiosity"} and not school_specific
    return {
        "present": detected,
        "missing": missing,
        "too_generic": too_generic,
        "school_specific_missing": school_specific_missing,
        "school_specific_present": school_specific,
        "word_count": word_count,
    }


def find_reuse_matches(selected_college: str, selected_prompt_index: int, selected_draft_index: int):
    selected_prompt = essay_data[selected_college][selected_prompt_index]
    selected_text = selected_prompt["drafts"][selected_draft_index]["text"]
    selected_words = normalize_words(selected_text)
    selected_type = selected_prompt.get("prompt_type", "")
    matches = []
    if not selected_words:
        return matches
    for college, prompts in essay_data.items():
        for prompt_idx, prompt in enumerate(prompts):
            for draft_idx, draft in enumerate(prompt["drafts"]):
                if college == selected_college and prompt_idx == selected_prompt_index and draft_idx == selected_draft_index:
                    continue
                other_words = normalize_words(draft["text"])
                union = selected_words | other_words
                if not union:
                    continue
                lexical_similarity = len(selected_words & other_words) / len(union)
                prompt_type = prompt.get("prompt_type", "Essay")
                type_bonus = 0.12 if prompt_type == selected_type else (0.07 if prompt_type in PROMPT_TYPE_RELATIONSHIPS.get(selected_type, []) else 0.0)
                score = lexical_similarity + type_bonus
                if lexical_similarity >= 0.18 or score >= 0.26:
                    similarity = min(0.96, score)
                    matches.append({
                        "college": college,
                        "prompt_title": prompt["title"],
                        "prompt_type": prompt_type,
                        "version": draft["name"],
                        "draft_label": draft.get("label", draft["name"]),
                        "lexical_similarity": int(lexical_similarity * 100),
                        "similarity": int(similarity * 100),
                        "reason": "same prompt type" if prompt_type == selected_type else f"{prompt_type} can adapt from {selected_type}",
                    })
    return sorted(matches, key=lambda m: (m["similarity"], m["lexical_similarity"]), reverse=True)[:5]


def get_prompt_comment_count(prompt: dict):
    return len(prompt.get("comments", []))


def get_prompt_overlap_indicator(college_name: str, prompt_index: int):
    prompt = essay_data[college_name][prompt_index]
    if not prompt.get("drafts"):
        return None
    latest_index = max(0, len(prompt["drafts"]) - 1)
    matches = find_reuse_matches(college_name, prompt_index, latest_index)
    return matches[0]["similarity"] if matches else None


def find_adaptable_targets(selected_college: str, selected_prompt_index: int):
    selected_prompt = essay_data[selected_college][selected_prompt_index]
    selected_type = selected_prompt.get("prompt_type", "")
    compatible_types = {selected_type, *PROMPT_TYPE_RELATIONSHIPS.get(selected_type, [])}
    targets = []
    for college, prompts in essay_data.items():
        for idx, prompt in enumerate(prompts):
            if college == selected_college and idx == selected_prompt_index:
                continue
            prompt_type = prompt.get("prompt_type", "")
            if prompt_type not in compatible_types:
                continue
            relation = "same prompt type" if prompt_type == selected_type else f"adjacent to {selected_type}"
            targets.append({
                "college": college,
                "prompt_title": prompt["title"],
                "prompt_type": prompt_type,
                "reason": relation,
            })
    return targets[:4]


def reuse_confidence_label(score: int):
    if score >= 72:
        return "High"
    if score >= 52:
        return "Medium"
    return "Low"


def build_relationship_map(selected_college: str, selected_prompt_index: int, selected_draft_index: int):
    matches = find_reuse_matches(selected_college, selected_prompt_index, selected_draft_index)
    if matches:
        return [
            {
                "college": match["college"],
                "prompt_title": match["prompt_title"],
                "prompt_type": match["prompt_type"],
                "confidence": reuse_confidence_label(match["similarity"]),
                "similarity": match["similarity"],
                "reason": match["reason"],
            }
            for match in matches[:3]
        ]

    targets = find_adaptable_targets(selected_college, selected_prompt_index)
    return [
        {
            "college": target["college"],
            "prompt_title": target["prompt_title"],
            "prompt_type": target["prompt_type"],
            "confidence": "Medium",
            "similarity": 48,
            "reason": target["reason"],
        }
        for target in targets[:3]
    ]


def version_display_name(version_index: int):
    return f"Version {version_index + 1}"


def sync_essay_workspace_with_college_data():
    for college_name in college_data.keys():
        record = ensure_college_record(college_name)
        essay_data.setdefault(college_name, [])
        prompts = record.get('essay_prompts', [])
        if not isinstance(prompts, list):
            continue

        for prompt in prompts:
            if not isinstance(prompt, dict):
                continue
            prompt_text = str(prompt.get('prompt_text', '') or '').strip()
            if not prompt_text:
                continue

            existing = next(
                (
                    item for item in essay_data[college_name]
                    if item.get('prompt_text', '').strip() == prompt_text
                    or item.get('title', '').strip() == prompt_text
                ),
                None,
            )
            if existing:
                if prompt.get('word_limit'):
                    existing['word_limit'] = prompt.get('word_limit', existing.get('word_limit', 250))
                if prompt.get('prompt_type'):
                    existing['prompt_type'] = prompt.get('prompt_type', existing.get('prompt_type', 'Essay'))
                if not existing.get('due_date') or existing.get('due_date') == 'TBD':
                    existing['due_date'] = get_effective_deadline(college_name)
                continue

            essay_data[college_name].append({
                'title': prompt_text,
                'prompt_text': prompt_text,
                'prompt_type': prompt.get('prompt_type', 'Essay'),
                'word_limit': prompt.get('word_limit', 250),
                'due_date': get_effective_deadline(college_name),
                'comments': [],
                'drafts': [{
                    'name': 'v1',
                    'label': 'Version 1',
                    'status': 'not_started',
                    'external_doc_url': '',
                    'autosave_status': 'Saved',
                    'last_saved': '',
                    'text': '',
                }],
            })


def render_essays_page():
    ensure_essay_data_shape()
    sync_essay_workspace_with_college_data()
    ui.label('Essays').classes('text-3xl font-bold')
    ui.label('Simple workspace for organizing prompts, writing drafts, and tracking reuse.').classes('text-base')

    layout = ui.row().classes('essays-layout mt-5')
    with layout:
        left_col = ui.column().classes('essay-panel compact')
        center_col = ui.column().classes('essay-panel writer')
        right_col = ui.column().classes('essay-panel tools')

    def active_college_names():
        return [item['name'] for item in widgets if item.get('name') in essay_data]

    def active_essay_data():
        return {name: essay_data[name] for name in active_college_names() if name in essay_data}

    def active_colleges_with_prompts():
        return [name for name, prompts in active_essay_data().items() if prompts]

    def clamp_selection():
        colleges = active_colleges_with_prompts()
        if not colleges:
            essay_state["college"] = active_college_names()[0] if active_college_names() else None
            essay_state["prompt_index"] = 0
            essay_state["draft_index"] = 0
            essay_state["compare_version"] = None
            return
        if essay_state["college"] not in colleges:
            essay_state["college"] = colleges[0]
            essay_state["prompt_index"] = 0
            essay_state["draft_index"] = 0
        prompts = essay_data[essay_state["college"]]
        if prompts:
            essay_state["prompt_index"] = min(essay_state["prompt_index"], len(prompts) - 1)
            drafts = prompts[essay_state["prompt_index"]]["drafts"]
            essay_state["draft_index"] = min(essay_state["draft_index"], len(drafts) - 1)
            if essay_state["compare_version"] not in [draft["name"] for draft in drafts]:
                essay_state["compare_version"] = drafts[0]["name"] if len(drafts) > 1 else None

    def selected_prompt():
        college_name = essay_state.get("college")
        if not college_name or college_name not in essay_data:
            return None
        prompts = essay_data.get(college_name, [])
        if not prompts:
            return None
        prompt_index = min(essay_state["prompt_index"], len(prompts) - 1)
        return prompts[prompt_index]

    def selected_draft():
        prompt = selected_prompt()
        if not prompt or not prompt.get("drafts"):
            return None
        draft_index = min(essay_state["draft_index"], len(prompt["drafts"]) - 1)
        return prompt["drafts"][draft_index]

    def grouped_prompts_by_tag():
        groups = {}
        for college, prompts in active_essay_data().items():
            for idx, prompt in enumerate(prompts):
                tag = prompt.get("prompt_type", "Essay")
                groups.setdefault(tag, []).append((college, idx, prompt))
        return dict(sorted(groups.items(), key=lambda item: item[0]))

    def toggle_group(name: str):
        if name in essay_state["expanded_groups"]:
            essay_state["expanded_groups"].remove(name)
        else:
            essay_state["expanded_groups"].add(name)
        refresh_left()

    def refresh_left():
        left_col.clear()
        with left_col:
            with ui.row().classes('w-full essay-sidebar-top'):
                ui.label('Group:').classes('text-xs text-[var(--muted)]')
                ui.toggle(
                    {'school': 'School', 'tag': 'Tag'},
                    value=essay_state["group_mode"],
                    on_change=lambda e: set_group_mode(e.value),
                ).props('dense unelevated toggle-color=primary').classes('essay-sidebar-toggle')

            if essay_state["group_mode"] == "school":
                groups = [(college, [(college, idx, prompt) for idx, prompt in enumerate(prompts)]) for college, prompts in active_essay_data().items()]
            else:
                groups = list(grouped_prompts_by_tag().items())

            for group_name, items in groups:
                is_open = group_name in essay_state["expanded_groups"]
                with ui.column().classes('w-full essay-tree-block'):
                    with ui.row().classes('w-full essay-tree-header').on('click', lambda name=group_name: toggle_group(name)):
                        ui.label('▾' if is_open else '▸').classes('essay-tree-chevron')
                        ui.label(group_name).classes('essay-tree-title')
                    if is_open:
                        with ui.column().classes('w-full essay-tree-items'):
                            for college, idx, prompt in items:
                                active = college == essay_state["college"] and idx == essay_state["prompt_index"]
                                label = prompt["title"] if essay_state["group_mode"] == "school" else f"{college} - {prompt['title']}"
                                words, limit, _ = prompt_word_progress(prompt)
                                prompt_status = current_prompt_status(prompt)
                                with ui.row().classes(f"w-full essay-tree-item {'active' if active else ''}").on('click', lambda college_name=college, prompt_idx=idx: select_prompt(college_name, prompt_idx)):
                                    ui.label(label).classes('essay-tree-item-text')
                                    with ui.row().classes('essay-tree-item-meta'):
                                        ui.element('div').classes(f'essay-tree-dot {status_class(prompt_status)}')
                                        ui.label(f'{words}/{limit}')

    def refresh_center():
        center_col.clear()
        prompt = selected_prompt()
        draft = selected_draft()
        if not prompt or not draft:
            with center_col:
                ui.label('No essay prompt selected').classes('text-xl font-semibold')
                ui.label('Add essay prompts to this college and they will appear here automatically.').classes('text-sm text-[var(--muted)] mt-2')
            return
        current_word_count = count_words(draft["text"])
        with center_col:
            with ui.row().classes('w-full essay-header-row'):
                with ui.column().classes('gap-1'):
                    ui.label(prompt["title"]).classes('text-2xl font-semibold')
                    with ui.row().classes('essay-meta-row'):
                        ui.label(essay_state['college'])
                        ui.label('•').classes('essay-meta-separator')
                        ui.label(prompt.get("prompt_type", "Essay"))
                        ui.label('•').classes('essay-meta-separator')
                        word_count_label = ui.label(f"{current_word_count}/{prompt['word_limit']} words").classes('essay-mini-pill essay-word-count')
                        if current_word_count > prompt["word_limit"]:
                            word_count_label.classes(add='over')
                ui.label('Saved').classes('essay-autosave')

            def on_text_change(e):
                draft["text"] = e.value
                draft["status"] = normalize_essay_status(draft.get("status", "drafting"), draft["text"])
                draft["autosave_status"] = "Saved"
                draft["last_saved"] = datetime.now().strftime("%I:%M %p").lstrip("0")
                current_words = count_words(draft["text"])
                word_count_label.text = f"{current_words}/{prompt['word_limit']} words"
                if current_words > prompt["word_limit"]:
                    word_count_label.classes(add='over')
                else:
                    word_count_label.classes(remove='over')
                refresh_left()
                refresh_right()

            editor = ui.textarea(value=draft["text"]).props('autogrow outlined').classes('w-full mt-4 essay-editor')
            editor.on('update:model-value', on_text_change)

    def refresh_right():
        right_col.clear()
        prompt = selected_prompt()
        draft = selected_draft()
        if not prompt or not draft:
            with right_col:
                ui.label('No prompt yet').classes('text-sm font-semibold')
                ui.label('Versions, comments, and reuse will appear once this college has essay prompts.').classes('text-sm text-[var(--muted)] mt-2')
            return
        active_names = set(active_college_names())
        reuse_matches = [
            match for match in find_reuse_matches(essay_state["college"], essay_state["prompt_index"], essay_state["draft_index"])
            if match["college"] in active_names
        ]
        version_comments = [comment for comment in prompt.get("comments", []) if comment.get("version") in {draft["name"], None, ""}]

        with right_col:
            with ui.row().classes('w-full gap-1'):
                ui.label(prompt.get("prompt_type", "Essay")).classes('essay-tag')
                ui.label(status_label(draft["status"])).classes('essay-tag')
                if draft.get("external_doc_url"):
                    ui.link('Google Docs', draft["external_doc_url"], new_tab=True).classes('essay-tag')

            with ui.tabs().props('dense active-color=primary indicator-color=primary').classes('essay-utility-tabs mt-4') as tabs:
                versions_tab = ui.tab('Versions')
                comments_tab = ui.tab('Comments')
                reuse_tab = ui.tab('Reuse')
            tabs.bind_value(essay_state, 'utility_tab')
            with ui.tab_panels(tabs, value=essay_state["utility_tab"]).props('animated').classes('w-full mt-3'):
                with ui.tab_panel(versions_tab).classes('essay-tab-panel'):
                    with ui.column().classes('essay-list-stack'):
                        for idx, version in enumerate(prompt["drafts"]):
                            active = idx == essay_state["draft_index"]
                            version_label = version_display_name(idx)
                            button = ui.button(version_label, on_click=lambda version_idx=idx: select_version(version_idx)).props('flat no-caps').classes(f"essay-version-chip {'active' if active else ''}")
                            if active:
                                button.classes(add='font-semibold')

                    def add_version():
                        base = selected_draft()
                        new_version_number = len(prompt['drafts']) + 1
                        new_version_name = f"v{new_version_number}"
                        prompt["drafts"].append({
                            "name": new_version_name,
                            "label": version_display_name(new_version_number - 1),
                            "status": normalize_essay_status(base.get("status", "drafting"), base.get("text", "")),
                            "external_doc_url": base.get("external_doc_url", ""),
                            "autosave_status": "Saved",
                            "last_saved": datetime.now().strftime("%I:%M %p").lstrip("0"),
                            "text": base["text"],
                        })
                        essay_state["draft_index"] = len(prompt["drafts"]) - 1
                        refresh_center()
                        refresh_right()

                    ui.button('+ New version', on_click=add_version).props('outline dense no-caps').classes('w-full mt-2 essay-small-button')

                with ui.tab_panel(comments_tab).classes('essay-tab-panel'):
                    if version_comments:
                        with ui.column().classes('essay-list-stack'):
                            for comment in version_comments:
                                with ui.column().classes('essay-list-item'):
                                    ui.label(comment.get("text", "")).classes('text-sm')
                                    ui.label(comment.get("author", "Comment")).classes('essay-item-meta')
                    else:
                        ui.label('No comments yet.').classes('text-sm text-[var(--muted)]')

                    comment_input = ui.input(placeholder='Add comment').classes('w-full mt-3 essay-input-compact')

                    def add_comment():
                        if comment_input.value:
                            prompt["comments"].append({
                                "version": draft["name"],
                                "author": "You",
                                "text": comment_input.value.strip(),
                            })
                            comment_input.value = ''
                            refresh_right()

                    ui.button('Add Comment', on_click=add_comment).props('flat no-caps').classes('self-start mt-2')

                with ui.tab_panel(reuse_tab).classes('essay-tab-panel'):
                    if reuse_matches:
                        with ui.column().classes('essay-list-stack'):
                            for match in reuse_matches[:5]:
                                with ui.column().classes('essay-list-item'):
                                    ui.label(f"{match['college']} • {match['prompt_title']}").classes('text-sm')
                                    ui.label(f"{match['similarity']}% overlap").classes('essay-item-meta')
                    else:
                        ui.label('No reuse suggestions yet.').classes('text-sm text-[var(--muted)]')

    def select_prompt(college_name: str, prompt_idx: int):
        essay_state["college"] = college_name
        essay_state["prompt_index"] = prompt_idx
        essay_state["draft_index"] = 0
        refresh_left()
        refresh_center()
        refresh_right()

    def select_version(version_idx: int):
        essay_state["draft_index"] = version_idx
        refresh_center()
        refresh_right()

    def set_group_mode(mode: str):
        essay_state["group_mode"] = mode
        if mode == "school":
            essay_state["expanded_groups"] = set(active_college_names())
        else:
            essay_state["expanded_groups"] = set(grouped_prompts_by_tag().keys())
        refresh_left()

    clamp_selection()
    if essay_state["group_mode"] == "school" and not essay_state["expanded_groups"]:
        essay_state["expanded_groups"] = set(active_college_names())
    if essay_state["group_mode"] == "tag" and not essay_state["expanded_groups"]:
        essay_state["expanded_groups"] = set(grouped_prompts_by_tag().keys())
    refresh_left()
    refresh_center()
    refresh_right()


def render_settings_page():
    ui.label('Settings').classes('text-3xl font-bold')
    ui.label('Customize the workspace once and let the rest of the app follow it.').classes('text-base')

    categories = ['Profile', 'Appearance', 'Account']

    def selected_accent():
        theme_name = settings_state["appearance"].get("accent_theme", "Rosewood")
        return next((theme for theme in theme_presets if theme["name"] == theme_name), theme_presets[0])

    layout = ui.row().classes('settings-layout mt-4')
    with layout:
        left_col = ui.column().classes('settings-sidebar')
        right_col = ui.column().classes('settings-content')

    def refresh_sidebar():
        left_col.clear()
        with left_col:
            accent = selected_accent()
            ui.label('Preferences').classes('section-title')
            ui.label('Profile, appearance, and account settings stay separate so this page can grow cleanly.').classes('text-sm text-[var(--muted)]')
            with ui.column().classes('settings-preview-shell mt-4'):
                ui.label('Current workspace').classes('text-xs uppercase tracking-wide text-[var(--muted)]')
                ui.label(settings_state["profile"]["student_name"]).classes('text-lg font-semibold mt-1')
                ui.label(f"{settings_state['appearance']['layout_density']} density").classes('text-sm text-[var(--muted)]')
                ui.html(f'<span class="settings-preview-chip mt-2" style="background:{accent["color"]}">{accent["name"]}</span>')
            with ui.column().classes('w-full gap-2 mt-4'):
                for category in categories:
                    active = settings_state["category"] == category
                    button = ui.button(
                        category,
                        on_click=lambda selected=category: select_category(selected),
                    ).props('flat no-caps').classes(f'settings-nav-button {"active" if active else ""}')
                    if active:
                        button.classes(add='font-semibold')
            with ui.column().classes('settings-account-callout mt-4'):
                ui.label('Future-ready').classes('text-sm font-semibold')
                ui.label('Authentication and synced preferences can slot into this rail later without changing the page structure.').classes('text-sm text-[var(--muted)]')

    def render_profile_content():
        profile = settings_state["profile"]
        with right_col:
            with ui.column().classes('settings-hero'):
                ui.label('Profile').classes('text-2xl font-semibold')
                ui.label('Set the student details that should quietly shape defaults across planning, essays, and future reminders.').classes('text-sm text-[var(--muted)]')
                with ui.row().classes('w-full gap-2 mt-3'):
                    ui.label(profile["graduation_year"]).classes('chip')
                    ui.label(profile["time_zone"]).classes('chip')

            with ui.row().classes('settings-grid'):
                with ui.column().classes('settings-card'):
                    ui.label('Student details').classes('settings-card-title')
                    ui.label('Core identity fields used throughout the planner.').classes('settings-card-subtitle')

                    def set_name(e):
                        settings_state["profile"]["student_name"] = e.value
                        refresh_content()

                    def set_year(e):
                        settings_state["profile"]["graduation_year"] = e.value
                        refresh_content()

                    ui.input(label='Student name', value=profile["student_name"], on_change=set_name).classes('w-full mt-3')
                    ui.input(label='Graduation year', value=profile["graduation_year"], on_change=set_year).classes('w-full mt-2')

                with ui.column().classes('settings-card'):
                    ui.label('School context').classes('settings-card-title')
                    ui.label('Academic defaults that future autofill and suggestions can reuse.').classes('settings-card-subtitle')

                    def set_school(e):
                        settings_state["profile"]["high_school"] = e.value
                        refresh_content()

                    def set_major(e):
                        settings_state["profile"]["intended_major"] = e.value
                        refresh_content()

                    ui.input(label='High school', value=profile["high_school"], on_change=set_school).classes('w-full mt-3')
                    ui.input(label='Default intended major / interests', value=profile["intended_major"], on_change=set_major).classes('w-full mt-2')

                with ui.column().classes('settings-card full'):
                    ui.label('Planning defaults').classes('settings-card-title')
                    ui.label('Time zone and summary preview keep planning behavior understandable instead of hidden.').classes('settings-card-subtitle')

                    def set_timezone(e):
                        settings_state["profile"]["time_zone"] = e.value
                        refresh_content()

                    timezone_options = [
                        'America/New_York',
                        'America/Chicago',
                        'America/Denver',
                        'America/Los_Angeles',
                        'America/Phoenix',
                        'Pacific/Honolulu',
                    ]
                    ui.select(timezone_options, value=profile["time_zone"], on_change=set_timezone, label='Time zone').classes('w-full mt-3')
                    with ui.row().classes('w-full gap-3 mt-4'):
                        with ui.column().classes('settings-preview-shell grow'):
                            ui.label('Profile preview').classes('text-sm font-semibold')
                            ui.label(profile["student_name"]).classes('text-lg font-semibold mt-1')
                            ui.label(f"{profile['high_school']} • Class of {profile['graduation_year']}").classes('text-sm text-[var(--muted)]')
                            ui.label(profile["intended_major"]).classes('text-sm mt-2')
                        with ui.column().classes('settings-preview-shell grow'):
                            ui.label('Where this matters').classes('text-sm font-semibold')
                            ui.label('These values can prefill forms, tailor essay defaults, and anchor future scheduling features.').classes('text-sm text-[var(--muted)] mt-1')

    def render_appearance_content():
        appearance = settings_state["appearance"]
        accent = selected_accent()
        preview_padding = '12px' if appearance["layout_density"] == 'Compact' else '18px'
        with right_col:
            with ui.column().classes('settings-hero'):
                ui.label('Appearance').classes('text-2xl font-semibold')
                ui.label('Choose an accent and density, then let those choices apply across the workspace.').classes('text-sm text-[var(--muted)]')
                with ui.row().classes('w-full gap-2 mt-3'):
                    ui.html(f'<span class="settings-preview-chip" style="background:{accent["color"]}">{accent["name"]}</span>')
                    ui.label(appearance["layout_density"]).classes('chip')
                    ui.label('Global theme enabled').classes('chip')

            with ui.row().classes('settings-grid'):
                with ui.column().classes('settings-card'):
                    ui.label('Accent color').classes('settings-card-title')
                    ui.label('The accent color now updates navigation, cards, chips, and highlights across the app.').classes('settings-card-subtitle')
                    with ui.row().classes('settings-swatch-row mt-3'):
                        for theme in theme_presets:
                            active = theme["name"] == appearance["accent_theme"]
                            swatch = ui.element('button').classes(f'settings-swatch {"active" if active else ""}')
                            swatch.style(f'background:{theme["color"]}')
                            swatch.on('click', lambda _, theme_name=theme["name"]: set_accent(theme_name))
                    ui.label(f"Current theme: {accent['name']}").classes('text-sm mt-3')

                with ui.column().classes('settings-card'):
                    ui.label('Layout density').classes('settings-card-title')
                    ui.label('Density adjusts spacing and card rhythm on the rest of the pages too.').classes('settings-card-subtitle')
                    with ui.row().classes('w-full gap-3 mt-3'):
                        for density in ['Compact', 'Cozy']:
                            active = appearance["layout_density"] == density
                            with ui.card().classes(f'grow settings-density-option {"active" if active else ""}').on('click', lambda density_value=density: set_density(density_value)):
                                ui.label(density).classes('font-semibold')
                                ui.label('Higher information density' if density == 'Compact' else 'More relaxed spacing').classes('text-xs text-[var(--muted)]')

                with ui.column().classes('settings-card full'):
                    ui.label('Light / dark mode').classes('settings-card-title')
                    ui.label('The app is currently optimized for a light academic workspace. Dark mode remains a placeholder for a later pass.').classes('settings-card-subtitle')

                    def toggle_dark_mode(e):
                        settings_state["appearance"]["dark_mode"] = bool(e.value)
                        refresh_content()

                    ui.switch('Enable dark mode when available', value=appearance["dark_mode"], on_change=toggle_dark_mode).classes('mt-3')
                    ui.label('Placeholder only. This toggle is intentionally non-functional for now.').classes('text-xs text-[var(--muted)] mt-2')

                with ui.column().classes('settings-card full'):
                    ui.label('Workspace preview').classes('settings-card-title')
                    ui.label('This mirrors the updated app theme so the settings page and the rest of the product stay aligned.').classes('settings-card-subtitle')
                    with ui.column().classes('settings-preview mt-3'):
                        ui.html(f'''
                        <div class="settings-preview-shell" style="padding:{preview_padding}">
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
                            <div>
                              <div style="font-weight:700;color:#2F2A25;">Essay Strategy Workspace</div>
                              <div style="font-size:0.82rem;color:#746A60;">Preview of cards, chips, and density</div>
                            </div>
                            <span class="settings-preview-chip" style="background:{accent["color"]};">Active theme</span>
                          </div>
                          <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:12px;">
                            <div style="border:1px solid #e7dacd;border-radius:16px;padding:{preview_padding};background:#fffdfa;">
                              <div style="font-size:0.78rem;color:#746A60;margin-bottom:8px;">Prompt list</div>
                              <div style="display:flex;flex-direction:column;gap:{'8px' if appearance["layout_density"] == "Compact" else '14px'};">
                                <div style="border:1px solid #e3d3c4;border-radius:14px;padding:10px;background:#fff8fb;">
                                  <div style="font-weight:600;">Why Duke?</div>
                                  <div style="font-size:0.78rem;color:#746A60;">rough • 142/250 words</div>
                                </div>
                                <div style="border:1px solid #e3d3c4;border-radius:14px;padding:10px;background:#fffdfa;">
                                  <div style="font-weight:600;">Community essay</div>
                                  <div style="font-size:0.78rem;color:#746A60;">revise • 184/200 words</div>
                                </div>
                              </div>
                            </div>
                            <div style="border:1px solid #e7dacd;border-radius:16px;padding:{preview_padding};background:#fffdfa;">
                              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div style="font-weight:600;">Draft editor</div>
                                <span style="font-size:0.78rem;color:#746A60;">Autosaved</span>
                              </div>
                              <div style="height:120px;border-radius:14px;background:linear-gradient(180deg, #fffdf9 0%, #f8f1e7 100%);border:1px solid #ecdece;padding:12px;font-size:0.84rem;color:#564d46;line-height:1.6;">
                                I want a workspace that feels purposeful, calm, and clear while I draft.
                              </div>
                            </div>
                          </div>
                        </div>
                        ''').classes('w-full')

    def render_account_content():
        with right_col:
            with ui.column().classes('settings-hero'):
                ui.label('Account').classes('text-2xl font-semibold')
                ui.label('This section reserves space for authentication and cloud-backed preferences.').classes('text-sm text-[var(--muted)]')

            with ui.row().classes('settings-grid'):
                with ui.column().classes('settings-card full'):
                    ui.label('Authentication').classes('settings-card-title')
                    ui.label('Authentication and cloud sync coming soon').classes('text-base mt-2')
                    with ui.column().classes('settings-account-callout mt-4'):
                        ui.label('Planned').classes('text-sm font-semibold')
                        ui.label('Sign-in, synced settings, saved colleges across devices, and account recovery can live here later without changing the overall layout.').classes('text-sm text-[var(--muted)]')
                        ui.button('Join waitlist').props('outline no-caps').classes('self-start mt-3')

                with ui.column().classes('settings-card'):
                    ui.label('Local mode').classes('settings-card-title')
                    ui.label('Settings are currently stored in local app state for this prototype.').classes('settings-card-subtitle mt-1')

                with ui.column().classes('settings-card'):
                    ui.label('Cloud sync status').classes('settings-card-title')
                    ui.label('Not connected').classes('text-sm mt-2')
                    ui.label('Will appear here once authentication exists.').classes('settings-card-subtitle')

    def refresh_content():
        right_col.clear()
        category = settings_state["category"]
        if category == 'Profile':
            render_profile_content()
        elif category == 'Appearance':
            render_appearance_content()
        else:
            render_account_content()

    def select_category(category: str):
        settings_state["category"] = category
        refresh_sidebar()
        refresh_content()

    def set_accent(theme_name: str):
        settings_state["appearance"]["accent_theme"] = theme_name
        apply_theme_settings()
        refresh_content()
        refresh_sidebar()

    def set_density(density: str):
        settings_state["appearance"]["layout_density"] = density
        apply_theme_settings()
        refresh_content()
        refresh_sidebar()

    apply_theme_settings()
    refresh_sidebar()
    refresh_content()


def default_research_entry(college_name: str, deadline: str = 'TBD'):
    return {
        "location": "TBD",
        "major_program": "Undeclared",
        "application_deadline": deadline,
        "reach_level": "--",
        "why_this_school": "",
        "vibe": "",
        "academic_strengths": "",
        "notes_status": "Not started",
        "interview": "Unknown",
        "visit_status": "No Visit",
        "priority_level": "--",
        "general_notes": "",
        "academic_programs": "",
        "campus_culture": "",
        "clubs_professors_labs": "",
        "why_us_material": "",
        "links_resources": "",
        "personal_reflections": "",
    }


def default_college_profile():
    return {
        "application_type": "Not set",
        "status": "Not started",
        "major": "Undeclared",
        "notes": "Add quick notes for this college.",
        "links": [],
        "essays": [],
        "research": [],
        "requirements": [],
        "fees": [],
        "recs": [],
    }


def default_requirements_checklist():
    defaults = {}
    for section in REQUIREMENT_SECTIONS:
        for item in section['items']:
            defaults[item['key']] = False if item['type'] == 'checkbox' else TESTING_POLICY_OPTIONS[0]
    return defaults


def normalize_requirements_checklist(raw_value):
    normalized = default_requirements_checklist()
    if isinstance(raw_value, dict):
        for section in REQUIREMENT_SECTIONS:
            for item in section['items']:
                key = item['key']
                value = raw_value.get(key)
                if item['type'] == 'checkbox':
                    normalized[key] = bool(value)
                elif value in TESTING_POLICY_OPTIONS:
                    normalized[key] = value
    return normalized


def default_college_record(college_name: str):
    return {
        'name': college_name,
        'application_options': [],
        'selected_application_type': '',
        'status': 'In Progress',
        'major': 'Undeclared',
        'quick_notes': '',
        'important_links': [],
        'basic_info': {},
        'essay_prompts': [],
        'research_page_reference': f'research://{college_name}',
        'required_recommendations': [
            {'label': 'Required Recommender 1', 'assigned_recommender': ''},
            {'label': 'Required Recommender 2', 'assigned_recommender': ''},
        ],
        'optional_recommendations': [
            {'label': 'Optional Recommender', 'assigned_recommender': ''},
        ],
        'requirements_checklist': default_requirements_checklist(),
    }


def get_college_record(college_name: str):
    return college_data.get(college_name)


def ensure_college_record(college_name: str):
    if college_name not in college_data:
        college_data[college_name] = default_college_record(college_name)
    record = college_data[college_name]
    changed = False
    def normalize_slots(raw_value, default_count: int, prefix: str):
        if isinstance(raw_value, int):
            target_count = max(1, min(raw_value, 3))
            slots = []
        elif isinstance(raw_value, list):
            target_count = max(1, min(len(raw_value), 3)) if len(raw_value) else default_count
            slots = raw_value
        else:
            target_count = default_count
            slots = []

        normalized = []
        for i in range(target_count):
            slot = slots[i] if i < len(slots) and isinstance(slots[i], dict) else {}
            normalized.append({
                'label': slot.get('label') or f'{prefix} {i + 1}',
                'assigned_recommender': slot.get('assigned_recommender') or '',
            })
        return normalized

    normalized_required = normalize_slots(record.get('required_recommendations'), 2, 'Required Recommender')
    if normalized_required != record.get('required_recommendations'):
        record['required_recommendations'] = normalized_required
        changed = True

    normalized_optional = normalize_slots(record.get('optional_recommendations'), 1, 'Optional Recommender')
    if normalized_optional != record.get('optional_recommendations'):
        record['optional_recommendations'] = normalized_optional
        changed = True

    normalized_requirements = normalize_requirements_checklist(record.get('requirements_checklist'))
    if normalized_requirements != record.get('requirements_checklist'):
        record['requirements_checklist'] = normalized_requirements
        changed = True

    if changed:
        save_college_catalog()
    return record


def normalize_college_records():
    changed = False
    for college_name in list(college_data.keys()):
        before = json.dumps(college_data.get(college_name, {}), sort_keys=True)
        ensure_college_record(college_name)
        after = json.dumps(college_data.get(college_name, {}), sort_keys=True)
        if before != after:
            changed = True
    if changed:
        save_college_catalog()


def set_requirement_value(college_name: str, requirement_key: str, value):
    record = ensure_college_record(college_name)
    checklist = record.get('requirements_checklist', default_requirements_checklist())
    if requirement_key not in checklist:
        return
    checklist[requirement_key] = value
    record['requirements_checklist'] = checklist
    save_college_catalog()


def get_college_deadline(college_name: str):
    record = get_college_record(college_name)
    if not record:
        return 'TBD'
    selected_type = record.get('selected_application_type')
    for option in record.get('application_options', []):
        if option.get('type') == selected_type:
            return option.get('deadline', 'TBD')
    if record.get('application_options'):
        return record['application_options'][0].get('deadline', 'TBD')
    return 'TBD'


def get_effective_deadline(college_name: str):
    catalog_deadline = get_college_deadline(college_name)
    if catalog_deadline != 'TBD':
        return catalog_deadline
    widget = get_widget(college_name)
    return widget.get('deadline', 'TBD') if widget else 'TBD'


def sync_widget_deadlines_from_college_data():
    for item in widgets:
        synced_deadline = get_college_deadline(item['name'])
        if synced_deadline != 'TBD':
            item['deadline'] = synced_deadline


def get_valid_application_plans(college_name: str):
    record = get_college_record(college_name)
    if not record:
        return []
    return [option.get('type') for option in record.get('application_options', []) if option.get('type')]


def get_deadline_for_college_plan(college_name: str, application_plan: str):
    record = get_college_record(college_name)
    if not record:
        return 'TBD'
    for option in record.get('application_options', []):
        if option.get('type') == application_plan:
            return option.get('deadline', 'TBD')
    return 'TBD'


def add_or_update_college(college_name: str, application_plan: str, deadline: str):
    record = ensure_college_record(college_name)
    if not record.get('application_options'):
        record['application_options'] = [{'type': application_plan, 'deadline': deadline}]
    else:
        matched = False
        for option in record['application_options']:
            if option.get('type') == application_plan:
                option['deadline'] = deadline
                matched = True
                break
        if not matched:
            record['application_options'].append({'type': application_plan, 'deadline': deadline})
    record['selected_application_type'] = application_plan

    existing_widget = get_widget(college_name)
    if existing_widget:
        existing_widget["deadline"] = deadline
    else:
        widgets.append({"name": college_name, "progress": 0, "deadline": deadline})

    if college_name not in college_profiles:
        college_profiles[college_name] = default_college_profile()
    college_profiles[college_name]["application_type"] = application_plan

    research_database[college_name] = research_database.get(college_name, default_research_entry(college_name, deadline))
    research_database[college_name]["application_deadline"] = deadline
    essay_data.setdefault(college_name, [])
    ensure_recommendation_row(college_name)
    ensure_fee_row(college_name)
    save_college_catalog()


def render_research_page():
    ui.label('Research').classes('text-3xl font-bold')
    ui.label('Lightweight research overview for quick scanning. Open a college for full notes and depth.').classes('text-base')

    if research_state["college"]:
        college_name = research_state["college"]
        entry = research_database[college_name]
        profile = get_college_profile(college_name)

        with ui.row().classes('w-full justify-between items-center'):
            ui.label(f'{college_name} Research Workspace').classes('section-title')
            ui.button('← Back to Research Database', on_click=lambda: back_to_database()).props('flat no-caps')

        with ui.row().classes('four-col'):
            with ui.card().classes('card p-4'):
                ui.label('Location').classes('text-base font-medium')
                ui.input(value=entry["location"], on_change=lambda e: set_research_value(college_name, "location", e.value)).classes('w-full')
            with ui.card().classes('card p-4'):
                ui.label('Priority').classes('text-base font-medium')
                ui.select(["--", "High", "Medium", "Low"], value=entry["priority_level"], on_change=lambda e: set_research_value(college_name, "priority_level", e.value)).classes('w-full')
            with ui.card().classes('card p-4'):
                ui.label('Reach Level').classes('text-base font-medium')
                ui.select(["--", "High Reach", "Reach", "Target", "Safety"], value=entry.get("reach_level", "--"), on_change=lambda e: set_research_value(college_name, "reach_level", e.value)).classes('w-full')
            with ui.card().classes('card p-4'):
                ui.label('Visit Status').classes('text-base font-medium')
                ui.select(["Visited", "Planned", "No Visit"], value=entry.get("visit_status", "No Visit"), on_change=lambda e: set_research_value(college_name, "visit_status", e.value)).classes('w-full')

        with ui.row().classes('w-full gap-4'):
            with ui.card().classes('card p-4 grow'):
                ui.label('Intended Major / Program').classes('text-base font-medium')
                ui.label(profile.get("major", "Undeclared")).classes('text-lg mt-2')
                ui.label('Synced from college page').classes('text-xs')
            with ui.card().classes('card p-4 grow'):
                ui.label('Application Deadline').classes('text-base font-medium')
                ui.label(profile.get("deadline", "TBD")).classes('text-lg mt-2')
                ui.label('Synced from college page').classes('text-xs')

        section_specs = [
            ("Vibe", "vibe"),
            ("Academic Strengths", "academic_strengths"),
            ("Long Notes", "general_notes"),
            ("Academic Programs", "academic_programs"),
            ("Campus Culture", "campus_culture"),
            ("Clubs / Professors / Labs", "clubs_professors_labs"),
            ("Why Us Material", "why_us_material"),
            ("Links / Resources", "links_resources"),
            ("Personal Reflections", "personal_reflections"),
        ]
        for label, key in section_specs:
            with ui.card().classes('card w-full p-4'):
                ui.label(label).classes('section-title')
                ui.textarea(
                    value=entry[key],
                    on_change=lambda e, field=key: set_research_value(college_name, field, e.value),
                ).props('autogrow outlined').classes('w-full mt-2')
        return

    with ui.card().classes('card w-full p-5'):
        with ui.row().classes('w-full justify-between items-center'):
            ui.label('Research Database View').classes('section-title')
            ui.select(
                [
                    "priority_level",
                    "application_deadline",
                    "college",
                    "reach_level",
                ],
                value=research_state["sort_by"],
                on_change=lambda e: update_research_sort(e.value),
                label='Sort by',
            ).classes('w-56')
        ui.label('College Name • Location • Reach/Priority • Deadline • Visit').classes('text-sm mt-2')
        with ui.element('div').classes('research-cards-grid'):
            for row in sorted_research_rows():
                with ui.card().classes('research-list-card research-college-card'):
                    with ui.row().classes('w-full justify-between items-start'):
                        with ui.column().classes('gap-1'):
                            ui.label(row["college"]).classes('text-lg font-bold')
                            ui.label(f"{row['location']} • {row['major_program']}").classes('text-sm')

                            reach_class = {
                                "High Reach": "pill-reach-high",
                                "Reach": "pill-reach",
                                "Target": "pill-target",
                                "Safety": "pill-safety",
                                "--": "pill-priority-medium",
                            }.get(row["reach_level"], "pill-priority-medium")
                            priority_class = {
                                "High": "pill-priority-high",
                                "Medium": "pill-priority-medium",
                                "Low": "pill-priority-low",
                            }.get(row["priority_level"], "pill-priority-medium")

                            reach_text = {
                                "High Reach": "🔴 High Reach",
                                "Reach": "🟠 Reach",
                                "Target": "🔵 Target",
                                "Safety": "🟢 Safety",
                                "--": "Reach Level: --",
                            }.get(row["reach_level"], "--")
                            priority_text = {
                                "High": "★ High Priority",
                                "Medium": "○ Medium Priority",
                                "Low": "○ Low Priority",
                                "--": "Priority Level: --",
                            }.get(row["priority_level"], "--")
                            visit_text = {
                                "Visited": "✓ Visited",
                                "Planned": "✈ Planned",
                                "No Visit": "— No Visit",
                            }.get(row["visit_status"], row["visit_status"])

                            with ui.row().classes('items-center gap-2 mt-1'):
                                ui.label(reach_text).classes(f'status-pill {reach_class}')
                                ui.label(priority_text).classes(f'status-pill {priority_class}')
                                ui.label(visit_text).classes('status-pill pill-visit')

                            ui.label(f"Deadline: {row['application_deadline']}").classes('text-sm mt-1')

                        ui.button(
                            'Open Research →',
                            on_click=lambda college_name=row["college"]: open_research_college(college_name),
                        ).props('outline no-caps').classes('self-start')


def sorted_research_rows():
    rows = []
    for college, entry in research_database.items():
        profile = get_college_profile(college)
        rows.append({
            "college": college,
            "location": entry["location"],
            "major_program": profile.get("major", "Undeclared"),
            "application_deadline": profile.get("deadline", "TBD"),
            "reach_level": entry.get("reach_level", "--"),
            "visit_status": entry["visit_status"],
            "priority_level": entry.get("priority_level", "--"),
        })

    sort_by = research_state["sort_by"]
    if sort_by == "priority_level":
        priority_rank = {"High": 0, "Medium": 1, "Low": 2, "--": 99}
        rows.sort(key=lambda row: priority_rank.get(row["priority_level"], 99))
    elif sort_by == "application_deadline":
        rows.sort(key=lambda row: days_until(row["application_deadline"]) if days_until(row["application_deadline"]) is not None else 10**6)
    elif sort_by == "reach_level":
        reach_rank = {"High Reach": 0, "Reach": 1, "Target": 2, "Safety": 3, "--": 99}
        rows.sort(key=lambda row: reach_rank.get(row["reach_level"], 99))
    else:
        rows.sort(key=lambda row: row["college"])
    return rows


def open_research_college(college_name: str):
    research_state["college"] = college_name
    render_page()


def back_to_database():
    research_state["college"] = None
    render_page()


def update_research_sort(sort_by: str):
    research_state["sort_by"] = sort_by
    render_page()


def set_research_value(college_name: str, key: str, value: str):
    research_database[college_name][key] = value


def ensure_recommendation_row(college_name: str):
    if college_name not in recommendation_matrix:
        recommendation_matrix[college_name] = {}
    for rec in recommenders:
        recommendation_matrix[college_name].setdefault(rec["name"], "Missing")


def default_fee_entry():
    return {
        "college_name": "",
        "application_fee": 0,
        "fee_waiver_status": "Not requested",
        "payment_status": "Not paid",
        "notes": "",
        "css_profile_required": False,
        "css_profile_cost": 0,
        "fafsa_required": False,
        "fafsa_cost": 0,
        "sat_score_send_required": False,
        "sat_score_send_cost": 0,
        "ap_score_send_required": False,
        "ap_score_send_cost": 0,
    }


FEE_WAIVER_OPTIONS = ["Not requested", "Requested", "Approved", "Denied"]
PAYMENT_STATUS_OPTIONS = ["Not paid", "Paid"]
OPTIONAL_FEE_FIELDS = [
    ("css_profile_required", "CSS Profile", "css_profile_cost"),
    ("fafsa_required", "FAFSA", "fafsa_cost"),
    ("sat_score_send_required", "SAT score send", "sat_score_send_cost"),
    ("ap_score_send_required", "AP score send", "ap_score_send_cost"),
]


def normalize_fee_tracker():
    for college_name, row in fee_tracker.items():
        normalized = default_fee_entry()
        normalized.update(row)
        normalized["college_name"] = normalized["college_name"] or college_name

        if "submitted_payment" in row and "payment_status" not in row:
            normalized["payment_status"] = "Paid" if row.get("submitted_payment") else "Not paid"

        if "score_report_fees" in row:
            if not normalized["sat_score_send_required"] and row.get("score_report_fees", 0):
                normalized["sat_score_send_required"] = True
            if not normalized["sat_score_send_cost"]:
                normalized["sat_score_send_cost"] = row.get("score_report_fees", 0)

        if "css_fafsa_costs" in row:
            legacy_cost = row.get("css_fafsa_costs", 0)
            if not normalized["css_profile_required"] and legacy_cost:
                normalized["css_profile_required"] = True
            if not normalized["css_profile_cost"]:
                normalized["css_profile_cost"] = legacy_cost

        legacy_status = row.get("fee_waiver_status", normalized["fee_waiver_status"])
        if legacy_status == "Not approved":
            normalized["fee_waiver_status"] = "Denied"

        fee_tracker[college_name] = normalized


def application_fee_due(row: dict):
    return 0 if row["fee_waiver_status"] == "Approved" else row["application_fee"]


def optional_fee_total(row: dict):
    total = 0
    for toggle_key, _, cost_key in OPTIONAL_FEE_FIELDS:
        if row.get(toggle_key):
            total += row.get(cost_key, 0) or 0
    return total


def fee_expected_total(row: dict):
    return application_fee_due(row) + optional_fee_total(row)


def waiver_savings(row: dict):
    return row["application_fee"] if row["fee_waiver_status"] == "Approved" else 0


def ensure_fee_row(college_name: str):
    if college_name not in fee_tracker:
        fee_tracker[college_name] = default_fee_entry()
    fee_tracker[college_name]["college_name"] = fee_tracker[college_name].get("college_name") or college_name


def set_fee_value(college_name: str, key: str, value):
    ensure_fee_row(college_name)
    fee_tracker[college_name][key] = value


def set_fee_number(college_name: str, key: str, value):
    try:
        numeric_value = int(float(value or 0))
    except (TypeError, ValueError):
        numeric_value = 0
    set_fee_value(college_name, key, max(0, numeric_value))


def default_brainstorm_activity():
    return {
        "activity_name": "",
        "category": "Other",
        "notes": "",
        "years_involved": "",
        "hours_per_week": 0,
    }


def default_final_activity():
    return {
        "activity_name": "",
        "role_position": "",
        "organization": "",
        "description": "",
        "years_involved": "",
        "hours_per_week": 0,
        "weeks_per_year": 0,
        "category": "Other",
    }


def set_activity_value(collection: str, index: int, key: str, value):
    target = brainstorm_activities if collection == 'brainstorm' else final_activities
    if 0 <= index < len(target):
        target[index][key] = value


def set_activity_number(collection: str, index: int, key: str, value):
    try:
        numeric_value = int(float(value or 0))
    except (TypeError, ValueError):
        numeric_value = 0
    set_activity_value(collection, index, key, max(0, numeric_value))


def add_brainstorm_activity():
    brainstorm_activities.append(default_brainstorm_activity())
    render_page()


def remove_brainstorm_activity(index: int):
    if 0 <= index < len(brainstorm_activities):
        del brainstorm_activities[index]
        render_page()


def confirm_remove_brainstorm_activity(index: int):
    if not (0 <= index < len(brainstorm_activities)):
        return

    activity_name = brainstorm_activities[index].get('activity_name') or f'Idea {index + 1}'
    dialog = ui.dialog()
    with dialog, ui.card().classes('card w-[420px] p-5'):
        ui.label('Remove Brainstorm Activity?').classes('text-xl font-bold')
        ui.label(f'Are you sure you want to remove "{activity_name}" from the brainstorm board?').classes('text-sm')

        with ui.row().classes('w-full justify-end gap-2 mt-3'):
            ui.button('Cancel', on_click=dialog.close).props('flat')

            def do_remove():
                dialog.close()
                remove_brainstorm_activity(index)

            ui.button('Remove', on_click=do_remove).props('color=negative no-caps')

    dialog.open()


def add_final_activity():
    if len(final_activities) >= 10:
        ui.notify('The final activities list is limited to 10 entries.', color='warning')
        return
    final_activities.append(default_final_activity())
    render_page()


def remove_final_activity(index: int):
    if 0 <= index < len(final_activities):
        del final_activities[index]
        render_page()


def confirm_remove_final_activity(index: int):
    if not (0 <= index < len(final_activities)):
        return

    activity_name = final_activities[index].get('activity_name') or f'Ranked Activity {index + 1}'
    dialog = ui.dialog()
    with dialog, ui.card().classes('card w-[420px] p-5'):
        ui.label('Remove Final Activity?').classes('text-xl font-bold')
        ui.label(f'Are you sure you want to remove "{activity_name}" from the final activities list?').classes('text-sm')

        with ui.row().classes('w-full justify-end gap-2 mt-3'):
            ui.button('Cancel', on_click=dialog.close).props('flat')

            def do_remove():
                dialog.close()
                remove_final_activity(index)

            ui.button('Remove', on_click=do_remove).props('color=negative no-caps')

    dialog.open()


def move_final_activity(index: int, direction: int):
    new_index = index + direction
    if 0 <= index < len(final_activities) and 0 <= new_index < len(final_activities):
        final_activities[index], final_activities[new_index] = final_activities[new_index], final_activities[index]
        render_page()


def start_final_activity_drag(index: int):
    activity_drag_state["final_index"] = index


def drop_final_activity(index: int):
    from_index = activity_drag_state.get("final_index")
    activity_drag_state["final_index"] = None
    if from_index is None or from_index == index:
        return
    if not (0 <= from_index < len(final_activities) and 0 <= index < len(final_activities)):
        return
    item = final_activities.pop(from_index)
    final_activities.insert(index, item)
    render_page()


def activity_insights():
    leadership_keywords = {"president", "captain", "founder", "lead", "leader", "chair", "director", "editor"}
    leadership_count = 0
    research_count = 0
    community_service_hours = 0
    categories = []
    category_counts = {}

    for item in brainstorm_activities + final_activities:
        category = item.get("category", "Other") or "Other"
        categories.append(category)
        category_counts[category] = category_counts.get(category, 0) + 1

    for item in final_activities:
        category = item.get("category", "")
        role_text = (item.get("role_position", "") or "").lower()
        if category == "Leadership" or any(keyword in role_text for keyword in leadership_keywords):
            leadership_count += 1
        if category == "Research":
            research_count += 1
        if category == "Community Service":
            community_service_hours += (item.get("hours_per_week", 0) or 0) * (item.get("weeks_per_year", 0) or 0)

    represented_categories = sorted(set(categories))
    max_count = max(category_counts.values(), default=1)
    bars = [
        {
            "category": category,
            "count": count,
            "percent": int((count / max_count) * 100) if max_count else 0,
        }
        for category, count in sorted(category_counts.items(), key=lambda entry: (-entry[1], entry[0]))
    ]

    return {
        "leadership_count": leadership_count,
        "research_count": research_count,
        "community_service_hours": community_service_hours,
        "represented_categories": represented_categories,
        "category_bars": bars,
    }


def render_fee_editor(college_name: str, show_college_name: bool = True):
    ensure_fee_row(college_name)
    row = fee_tracker[college_name]
    college_title = row.get("college_name") or college_name

    with ui.column().classes('w-full gap-3'):
        with ui.element('div').classes('fee-card-top'):
            with ui.column().classes('grow gap-2'):
                with ui.element('div').classes('fee-core-grid'):
                    if show_college_name:
                        ui.input(
                            label='College name',
                            value=college_title,
                            on_change=lambda e, c=college_name: (set_fee_value(c, 'college_name', (e.value or '').strip()), render_page()),
                        ).props('dense outlined').classes('w-full')

                    ui.number(
                        label='Application fee',
                        value=row["application_fee"],
                        min=0,
                        step=1,
                        on_change=lambda e, c=college_name: (set_fee_number(c, 'application_fee', e.value), render_page()),
                    ).props('dense outlined').classes('w-full')

                    ui.select(
                        FEE_WAIVER_OPTIONS,
                        value=row["fee_waiver_status"],
                        label='Fee waiver',
                        on_change=lambda e, c=college_name: (set_fee_value(c, 'fee_waiver_status', e.value), render_page()),
                    ).props('dense outlined').classes('w-full')

                    ui.select(
                        PAYMENT_STATUS_OPTIONS,
                        value=row["payment_status"],
                        label='Payment status',
                        on_change=lambda e, c=college_name: (set_fee_value(c, 'payment_status', e.value), render_page()),
                    ).props('dense outlined').classes('w-full')

                with ui.row().classes('fee-inline-meta'):
                    ui.label(f'Expected total: ${fee_expected_total(row)}').classes('chip')
                    if row["fee_waiver_status"] == "Approved":
                        ui.label(f'Waiver saved ${waiver_savings(row)}').classes('chip')
                    ui.label('Paid' if row["payment_status"] == "Paid" else 'Still to pay').classes('chip')

            with ui.element('div').classes('fee-total-pill'):
                with ui.column().classes('gap-0'):
                    ui.label('College total').classes('text-xs uppercase tracking-wide')
                    ui.html(f'<strong>${fee_expected_total(row)}</strong>')

        with ui.element('div').classes('fee-optional-grid'):
            for toggle_key, label, cost_key in OPTIONAL_FEE_FIELDS:
                with ui.element('div').classes('fee-optional-item'):
                    with ui.element('div').classes('fee-toggle-row'):
                        ui.label(label).classes('text-sm font-medium')
                        ui.switch(
                            value=row.get(toggle_key, False),
                            on_change=lambda e, c=college_name, t=toggle_key: (set_fee_value(c, t, bool(e.value)), render_page()),
                        ).props('dense size=sm color=primary')

                    cost_input = ui.number(
                        label='Cost',
                        value=row.get(cost_key, 0),
                        min=0,
                        step=1,
                        on_change=lambda e, c=college_name, ck=cost_key: (set_fee_number(c, ck, e.value), render_page()),
                    ).props('dense outlined').classes('w-full')
                    if not row.get(toggle_key):
                        cost_input.props('disable')


def matrix_status_symbol(status: str):
    symbols = {
        "Submitted": "✅ Submitted",
        "Confirmed": "🟡 Confirmed",
        "Requested": "🟠 Requested",
        "Missing": "❌ Missing",
        "N/A": "—",
    }
    return symbols.get(status, status)


def get_college_assigned_recommenders(college_name: str):
    record = ensure_college_record(college_name)
    assigned = set()
    for slot in record.get('required_recommendations', []):
        value = (slot.get('assigned_recommender') or '').strip()
        if value:
            assigned.add(value)
    for slot in record.get('optional_recommendations', []):
        value = (slot.get('assigned_recommender') or '').strip()
        if value:
            assigned.add(value)
    return assigned


def get_recommender_assigned_colleges(recommender_name: str):
    assigned_colleges = []
    for college_name in [item["name"] for item in widgets]:
        if recommender_name in get_college_assigned_recommenders(college_name):
            assigned_colleges.append(college_name)
    return assigned_colleges


def sync_recommendation_matrix():
    college_names = [item["name"] for item in widgets]
    recommender_names = [rec["name"] for rec in recommenders]

    for college in college_names:
        if college not in recommendation_matrix:
            recommendation_matrix[college] = {}

        row = recommendation_matrix[college]

        for old_name in list(row.keys()):
            if old_name not in recommender_names:
                del row[old_name]

        assigned_for_college = get_college_assigned_recommenders(college)
        for rec in recommenders:
            is_assigned = rec["name"] in assigned_for_college
            if rec["name"] not in row:
                row[rec["name"]] = "Missing" if is_assigned else "N/A"
            else:
                if not is_assigned:
                    row[rec["name"]] = "N/A"
                elif row[rec["name"]] == "N/A":
                    row[rec["name"]] = "Missing"


def render_recommendations_page():
    sync_recommendation_matrix()

    ui.label('Recommendations').classes('text-3xl font-bold')
    ui.label('Manage recommenders as global profiles and assign them to colleges.').classes('text-base')

    role_options = ["Teacher", "Counselor", "Mentor", "Supplemental", "Other"]
    def find_recommender_index_by_name(name: str):
        for i, rec in enumerate(recommenders):
            if rec.get("name") == name:
                return i
        return None

    def open_recommender_form(edit_name=None):
        edit_index = find_recommender_index_by_name(edit_name) if edit_name else None
        is_edit = edit_index is not None
        existing = recommenders[edit_index] if is_edit else {}
        existing_role = existing.get('role', 'Teacher')
        selected_role_value = existing_role if existing_role in role_options else 'Other'

        dialog = ui.dialog()
        with dialog, ui.card().classes('card w-[560px] p-5'):
            ui.label('Edit Recommender' if is_edit else 'Add Recommender').classes('text-xl font-bold')

            name_input = ui.input(label='Name', value=existing.get('name', '')).classes('w-full')
            role_select = ui.select(role_options, value=selected_role_value, label='Role').classes('w-full')
            other_role_input = ui.input(label='Custom role (if Other)', value='' if existing_role in role_options else existing_role).classes('w-full')
            subject_input = ui.input(label='Subject', value=existing.get('subject', '')).classes('w-full')

            def save_recommender():
                new_name = (name_input.value or '').strip()
                if not new_name:
                    ui.notify('Name is required.', color='negative')
                    return
                for i, rec in enumerate(recommenders):
                    if rec.get("name") == new_name and (not is_edit or i != edit_index):
                        ui.notify('A recommender with this name already exists.', color='negative')
                        return

                selected_role = role_select.value
                final_role = (other_role_input.value or '').strip() if selected_role == 'Other' else selected_role
                if selected_role == 'Other' and not final_role:
                    ui.notify('Enter a custom role for "Other".', color='negative')
                    return

                updated = {
                    "name": new_name,
                    "role": final_role,
                    "subject": (subject_input.value or '').strip(),
                    "request_sent": existing.get("request_sent", False),
                    "confirmed": existing.get("confirmed", False),
                    "submitted": existing.get("submitted", False),
                    "notes": existing.get("notes", ""),
                }

                if is_edit:
                    old_name = recommenders[edit_index]["name"]
                    recommenders[edit_index] = updated
                    if old_name != new_name:
                        for record in college_data.values():
                            for slot in record.get('required_recommendations', []):
                                if slot.get('assigned_recommender') == old_name:
                                    slot['assigned_recommender'] = new_name
                            for slot in record.get('optional_recommendations', []):
                                if slot.get('assigned_recommender') == old_name:
                                    slot['assigned_recommender'] = new_name
                        for college_name, row in recommendation_matrix.items():
                            old_status = row.pop(old_name, "N/A")
                            row[new_name] = old_status
                else:
                    recommenders.append(updated)

                sync_recommendation_matrix()
                save_college_catalog()
                dialog.close()
                render_page()

            with ui.row().classes('w-full justify-end gap-2 mt-3'):
                ui.button('Cancel', on_click=dialog.close).props('flat')
                ui.button('Save', on_click=save_recommender).classes('add-btn')

        dialog.open()

    def confirm_remove_recommender(name: str):
        confirm_dialog = ui.dialog()
        with confirm_dialog, ui.card().classes('card w-[420px] p-5'):
            ui.label('Remove Recommender?').classes('text-xl font-bold')
            ui.label(f'Are you sure you want to remove {name}? This cannot be undone.').classes('text-sm')

            def do_remove():
                index = find_recommender_index_by_name(name)
                if index is None:
                    confirm_dialog.close()
                    return
                removed_name = recommenders[index]["name"]
                del recommenders[index]
                for record in college_data.values():
                    for slot in record.get('required_recommendations', []):
                        if slot.get('assigned_recommender') == removed_name:
                            slot['assigned_recommender'] = ''
                    for slot in record.get('optional_recommendations', []):
                        if slot.get('assigned_recommender') == removed_name:
                            slot['assigned_recommender'] = ''
                for _, row in recommendation_matrix.items():
                    row.pop(removed_name, None)
                sync_recommendation_matrix()
                save_college_catalog()
                confirm_dialog.close()
                render_page()

            with ui.row().classes('w-full justify-end gap-2 mt-3'):
                ui.button('Cancel', on_click=confirm_dialog.close).props('flat')
                ui.button('Remove', on_click=do_remove).props('color=negative no-caps')

        confirm_dialog.open()

    with ui.row().classes('w-full justify-between items-center'):
        ui.label(f'{len(recommenders)} Recommenders').classes('section-title')
        ui.button('+ Add Recommender', on_click=lambda: open_recommender_form()).classes('add-btn')

    with ui.column().classes('w-full gap-3'):
        if not recommenders:
            with ui.card().classes('card w-full p-5'):
                ui.label('No recommenders yet. Add one to get started.').classes('text-sm')
        for rec in recommenders:
            assigned = get_recommender_assigned_colleges(rec.get("name", ""))
            with ui.card().classes('card w-full p-4'):
                with ui.row().classes('w-full justify-between items-start'):
                    with ui.column().classes('gap-1'):
                        ui.label(rec.get("name", "Unnamed")).classes('text-lg font-bold')
                        ui.label(f"{rec.get('role', 'Role not set')} • {rec.get('subject', 'Subject not set')}").classes('text-sm')
                        ui.label(
                            f"Assigned: {', '.join(assigned) if assigned else 'No colleges assigned'}"
                        ).classes('text-sm')
                    with ui.row().classes('gap-2'):
                        ui.button('Edit', on_click=lambda n=rec.get("name", ""): open_recommender_form(n)).props('outline no-caps')
                        ui.button('Remove', on_click=lambda n=rec.get("name", ""): confirm_remove_recommender(n)).props('outline color=negative no-caps')


def render_fees_page():
    for item in widgets:
        ensure_fee_row(item["name"])

    expected_total = 0
    total_paid = 0
    total_waiver_saved = 0
    for item in widgets:
        college = item["name"]
        row = fee_tracker[college]
        college_total = fee_expected_total(row)
        expected_total += college_total
        if row["payment_status"] == "Paid":
            total_paid += college_total
        total_waiver_saved += waiver_savings(row)

    ui.label('Fees').classes('text-3xl font-bold')
    ui.label('Everything stays visible on the card so you can update fees quickly without opening extra panels.').classes('text-base')

    with ui.row().classes('w-full gap-4'):
        with ui.card().classes('card p-4 grow'):
            ui.label('Total expected').classes('section-title')
            ui.label(f'${expected_total}').classes('stat-num')
        with ui.card().classes('card p-4 grow'):
            ui.label('Total paid').classes('section-title')
            ui.label(f'${total_paid}').classes('stat-num')
        with ui.card().classes('card p-4 grow'):
            ui.label('Fee waivers saved').classes('section-title')
            ui.label(f'${total_waiver_saved}').classes('stat-num')

    with ui.column().classes('fees-grid'):
        for item in widgets:
            college = item["name"]

            with ui.card().classes('fee-card w-full'):
                render_fee_editor(college, show_college_name=True)


def render_college_page(college_name: str):
    record = ensure_college_record(college_name)
    profile = get_college_profile(college_name)

    ui.label(college_name).classes('text-3xl font-bold')
    ui.label('College command center').classes('text-base')

    def open_linked_research():
        current_page['id'] = 'research'
        current_page['college'] = None
        research_state["college"] = college_name
        set_active_sidebar()
        render_page()

    with ui.tabs().classes('w-full') as tabs:
        overview_tab = ui.tab('Overview')
        overview_tab.on('click', lambda: set_college_tab('overview'))
        essays_tab = ui.tab('Essays')
        essays_tab.on('click', lambda: set_college_tab('essays'))
        research_tab = ui.tab('Research')
        research_tab.on('click', lambda: set_college_tab('research'))
        requirements_tab = ui.tab('Requirements')
        requirements_tab.on('click', lambda: set_college_tab('requirements'))
        fees_tab = ui.tab('Fees')
        fees_tab.on('click', lambda: set_college_tab('fees'))
        recs_tab = ui.tab('Recommendations')
        recs_tab.on('click', lambda: set_college_tab('recs'))

    active_tab = {
        'overview': overview_tab,
        'essays': essays_tab,
        'research': research_tab,
        'requirements': requirements_tab,
        'fees': fees_tab,
        'recs': recs_tab,
    }.get(current_page.get('college_tab', 'overview'), overview_tab)

    with ui.tab_panels(tabs, value=active_tab).classes('w-full'):
        with ui.tab_panel(overview_tab):
            with ui.row().classes('four-col'):
                with ui.card().classes('card p-5 grow'):
                    ui.label('Application type').classes('section-title')
                    application_types = get_valid_application_plans(college_name)

                    def update_application_type(e):
                        record['selected_application_type'] = e.value
                        deadline_value = get_deadline_for_college_plan(college_name, e.value)
                        add_or_update_college(college_name, e.value, deadline_value)
                        render_page()

                    ui.select(application_types, value=record.get('selected_application_type'), on_change=update_application_type).classes('w-full mt-2')

                with ui.card().classes('card p-5 grow'):
                    ui.label('Deadline').classes('section-title')
                    selected_plan = record.get('selected_application_type')
                    current_deadline = get_deadline_for_college_plan(college_name, selected_plan) if selected_plan else 'TBD'
                    ui.input(value=current_deadline).props('outlined readonly').classes('w-full mt-2')
                    ui.label(f'Countdown: {deadline_countdown(current_deadline)}').classes('text-sm mt-2')

                with ui.card().classes('card p-5 grow'):
                    ui.label('Status').classes('section-title')

                    def update_status(e):
                        record['status'] = e.value
                        save_college_catalog()

                    ui.select(APPLICATION_STATUS_OPTIONS, value=record.get('status', 'In Progress'), on_change=update_status).classes('w-full mt-2')

                with ui.card().classes('card p-5 grow'):
                    ui.label('Intended major').classes('section-title')

                    def update_major(e):
                        record['major'] = e.value
                        save_college_catalog()

                    ui.input(value=record.get('major', profile['major']), on_change=update_major).classes('w-full mt-2')

            with ui.row().classes('three-col mt-2'):
                with ui.card().classes('card p-5'):
                    ui.label('Checklist progress').classes('section-title')
                    ui.html(progress_ring(profile['progress'])).classes('mt-3')

                with ui.card().classes('card p-5'):
                    ui.label('Quick notes').classes('section-title')

                    def update_notes(e):
                        record['quick_notes'] = e.value
                        save_college_catalog()

                    ui.textarea(value=record.get('quick_notes', ''), on_change=update_notes).props('autogrow outlined').classes('w-full mt-2')

                with ui.card().classes('card p-5'):
                    ui.label('Important links').classes('section-title')
                    links = record.get('important_links', [])
                    if links:
                        for link in links:
                            if isinstance(link, dict):
                                ui.link(link.get('label', link.get('url', 'Link')), link.get('url', '#'), new_tab=True).classes('block text-sm mt-1')
                            elif isinstance(link, (list, tuple)) and len(link) == 2:
                                ui.link(link[0], link[1], new_tab=True).classes('block text-sm mt-1')
                    else:
                        ui.label('No links yet').classes('text-sm mt-1')

            with ui.card().classes('card w-full p-5 mt-2'):
                ui.label('Basic info').classes('section-title')
                basic_info = record.get('basic_info', {})
                if basic_info:
                    for key, value in basic_info.items():
                        ui.label(f"{key.replace('_', ' ').title()}: {value}").classes('text-sm mt-1')
                else:
                    ui.label('No basic info yet.').classes('text-sm mt-1')

        with ui.tab_panel(essays_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Essay prompts checklist').classes('section-title')
                prompts = record.get('essay_prompts', [])
                if prompts:
                    for idx, prompt in enumerate(prompts):
                        text = prompt.get('prompt_text', f'Prompt {idx + 1}')
                        word_limit = prompt.get('word_limit', 'N/A')

                        def toggle_prompt(e, prompt_index=idx):
                            record['essay_prompts'][prompt_index]['completed'] = bool(e.value)
                            save_college_catalog()

                        with ui.row().classes('w-full justify-between items-center mt-2'):
                            ui.checkbox(
                                f'{text} ({word_limit} words)',
                                value=bool(prompt.get('completed', False)),
                                on_change=toggle_prompt,
                            )
                            status = 'Complete' if prompt.get('completed') else 'Pending'
                            ui.label(status).classes('chip')
                else:
                    ui.label('No essay prompts tracked yet.').classes('text-sm mt-1')

        with ui.tab_panel(research_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Research preview').classes('section-title')
                research_entry = research_database.get(college_name, {})
                preview_fields = ['general_notes', 'academic_programs', 'campus_culture']
                preview_rendered = False
                for key in preview_fields:
                    value = research_entry.get(key, '')
                    if value:
                        preview_rendered = True
                        ui.label(f"{key.replace('_', ' ').title()}: {value}").classes('text-sm mt-1')
                if not preview_rendered:
                    ui.label('No research notes preview available yet.').classes('text-sm mt-1')
                ui.label(f"Reference: {record.get('research_page_reference', f'research://{college_name}')}").classes('text-xs mt-2')
                ui.button('Open full research page', on_click=open_linked_research).props('outline no-caps').classes('mt-2')

        with ui.tab_panel(requirements_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Requirements').classes('section-title')
                ui.label('Track what this school needs and what you have already submitted.').classes('text-sm mt-1')
                requirements_state = profile.get('requirements_checklist', default_requirements_checklist())
                with ui.element('div').classes('requirements-grid mt-4'):
                    for section in REQUIREMENT_SECTIONS:
                        with ui.element('div').classes('requirements-card'):
                            ui.label(section['title']).classes('requirements-card-title')
                            with ui.element('div').classes('requirements-list mt-3'):
                                for item in section['items']:
                                    current_value = requirements_state.get(
                                        item['key'],
                                        False if item['type'] == 'checkbox' else TESTING_POLICY_OPTIONS[0],
                                    )
                                    if item['type'] == 'checkbox':
                                        with ui.element('div').classes('requirement-row checkbox-only'):
                                            ui.checkbox(
                                                item['label'],
                                                value=bool(current_value),
                                                on_change=lambda e, key=item['key']: set_requirement_value(college_name, key, bool(e.value)),
                                            ).classes('text-sm')
                                    else:
                                        with ui.element('div').classes('requirement-row'):
                                            with ui.element('div'):
                                                ui.label(item['label']).classes('requirement-label')
                                                ui.label('School policy').classes('requirement-hint')
                                            ui.select(
                                                TESTING_POLICY_OPTIONS,
                                                value=current_value if current_value in TESTING_POLICY_OPTIONS else TESTING_POLICY_OPTIONS[0],
                                                on_change=lambda e, key=item['key']: set_requirement_value(college_name, key, e.value or TESTING_POLICY_OPTIONS[0]),
                                            ).classes('w-full')

        with ui.tab_panel(fees_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Fees').classes('section-title')
                ui.label('This uses the same fee tracker data shown on the main Fees page.').classes('text-sm mt-1')
                with ui.card().classes('fee-card w-full mt-3'):
                    render_fee_editor(college_name, show_college_name=False)

        with ui.tab_panel(recs_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Recommendations').classes('section-title')
                record = ensure_college_record(college_name)
                valid_recommender_names = {rec.get('name', '') for rec in recommenders if rec.get('name')}
                unassigned_label = '-- Unassigned --'
                recommender_options = [unassigned_label] + sorted(valid_recommender_names)

                for slot in record.get('required_recommendations', []):
                    current_value = slot.get('assigned_recommender', '')
                    if current_value and current_value not in valid_recommender_names:
                        slot['assigned_recommender'] = ''
                for slot in record.get('optional_recommendations', []):
                    current_value = slot.get('assigned_recommender', '')
                    if current_value and current_value not in valid_recommender_names:
                        slot['assigned_recommender'] = ''
                required_slots = record.get('required_recommendations', [])[:3]
                optional_slots = record.get('optional_recommendations', [])[:3]
                save_college_catalog()

                ui.label('Required recommenders').classes('text-sm mt-2 font-medium')
                for idx, slot in enumerate(required_slots):
                    selected_value = slot.get('assigned_recommender', '')
                    selected_value = selected_value if selected_value in valid_recommender_names else unassigned_label

                    def set_required(e, slot_index=idx):
                        next_value = '' if e.value == unassigned_label else (e.value or '')
                        record['required_recommendations'][slot_index]['assigned_recommender'] = next_value
                        save_college_catalog()
                        sync_recommendation_matrix()

                    ui.label(f'Recommender {idx + 1}').classes('text-sm mt-2')
                    ui.select(
                        recommender_options,
                        value=selected_value,
                        on_change=set_required,
                    ).props('use-input input-debounce=0').classes('w-full')

                ui.label('Optional recommenders').classes('text-sm mt-4 font-medium')
                for idx, slot in enumerate(optional_slots):
                    selected_value = slot.get('assigned_recommender', '')
                    selected_value = selected_value if selected_value in valid_recommender_names else unassigned_label

                    def set_optional(e, slot_index=idx):
                        next_value = '' if e.value == unassigned_label else (e.value or '')
                        record['optional_recommendations'][slot_index]['assigned_recommender'] = next_value
                        save_college_catalog()
                        sync_recommendation_matrix()

                    ui.label(f'Recommender {idx + 1}').classes('text-sm mt-2')
                    ui.select(
                        recommender_options,
                        value=selected_value,
                        on_change=set_optional,
                    ).props('use-input input-debounce=0').classes('w-full')

                if not recommenders:
                    ui.label('No global recommenders available yet.').classes('text-sm mt-4')
                    ui.button(
                        'Go to Recommendations Directory',
                        on_click=lambda: open_page('recs'),
                    ).props('outline no-caps').classes('mt-2')

    ui.button('← Back to Home', on_click=lambda: open_page('home')).props('flat').classes('mt-2')


def parse_deadline(date_text: str):
    try:
        return datetime.strptime(date_text, '%b %d, %Y').date()
    except ValueError:
        return None


def days_until(date_text: str):
    deadline_date = parse_deadline(date_text)
    if not deadline_date:
        return None
    return (deadline_date - datetime.now().date()).days


def deadline_countdown(date_text: str):
    remaining = days_until(date_text)
    if remaining is None:
        return 'No date'
    if remaining < 0:
        return f'{abs(remaining)}d overdue'
    if remaining == 0:
        return 'Due today'
    return f'{remaining}d left'


home_task_view = {'value': 'Incomplete'}


def next_home_task_id():
    return max((int(task.get('id', 0)) for task in home_tasks), default=0) + 1


def format_task_due_date(date_text: str):
    due_date = parse_iso_date(date_text)
    if not due_date:
        return ''
    return due_date.strftime('%b %d')


def home_task_due_label(task: dict):
    due_date = task.get('due_date', '')
    if not due_date:
        return ''
    due_display = format_task_due_date(due_date)
    remaining = (parse_iso_date(due_date) - datetime.now().date()).days if parse_iso_date(due_date) else None
    if remaining is None:
        return due_display
    if remaining < 0:
        return f'{due_display} • {abs(remaining)}d overdue'
    if remaining == 0:
        return f'{due_display} • Due today'
    return f'{due_display} • {remaining}d left'


def home_task_sort_key(task: dict):
    due_date = parse_iso_date(task.get('due_date', ''))
    priority_rank = {'High': 0, 'Medium': 1, 'Low': 2, '': 3}
    return (
        task.get('completed', False),
        due_date is None,
        due_date or datetime.max.date(),
        priority_rank.get(task.get('priority', ''), 3),
        (task.get('title') or '').lower(),
    )


def filtered_home_tasks():
    tasks = list(home_tasks)
    view = home_task_view['value']
    if view == 'Incomplete':
        tasks = [task for task in tasks if not task.get('completed')]
    elif view == 'Completed':
        tasks = [task for task in tasks if task.get('completed')]
    else:
        tasks = [task for task in tasks if not task.get('completed')]
    return sorted(tasks, key=home_task_sort_key)


def save_and_refresh_home_tasks():
    save_college_catalog()
    render_page()


def add_home_task(title: str, due_date: str = '', priority: str = ''):
    clean_title = (title or '').strip()
    if not clean_title:
        ui.notify('Enter a task title first.', color='warning')
        return
    home_tasks.append({
        'id': next_home_task_id(),
        'title': clean_title,
        'completed': False,
        'due_date': due_date if parse_iso_date(due_date) else '',
        'priority': priority if priority in TASK_PRIORITY_OPTIONS else '',
    })
    save_and_refresh_home_tasks()


def update_home_task(task_id: int, **changes):
    for task in home_tasks:
        if task.get('id') != task_id:
            continue
        if 'title' in changes:
            clean_title = (changes.get('title') or '').strip()
            if not clean_title:
                ui.notify('Task title cannot be empty.', color='warning')
                return
            task['title'] = clean_title
        if 'completed' in changes:
            task['completed'] = bool(changes['completed'])
        if 'due_date' in changes:
            task['due_date'] = changes['due_date'] if parse_iso_date(changes['due_date']) else ''
        if 'priority' in changes:
            task['priority'] = changes['priority'] if changes['priority'] in TASK_PRIORITY_OPTIONS else ''
        save_and_refresh_home_tasks()
        return


def delete_home_task(task_id: int):
    global home_tasks
    home_tasks = [task for task in home_tasks if task.get('id') != task_id]
    save_and_refresh_home_tasks()


def open_edit_home_task_dialog(task_id: int):
    task = next((item for item in home_tasks if item.get('id') == task_id), None)
    if not task:
        return

    dialog = ui.dialog()
    with dialog, ui.card().classes('card w-[460px] max-w-full p-5'):
        ui.label('Edit task').classes('text-xl font-bold')
        title_input = ui.input('Task title', value=task.get('title', '')).props('outlined').classes('w-full mt-3')
        due_input = ui.input('Due date', value=task.get('due_date', '')).props('outlined type=date').classes('w-full mt-3')
        priority_select = ui.select(
            options={'': 'No priority', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low'},
            value=task.get('priority', ''),
            label='Priority',
        ).props('outlined').classes('w-full mt-3')

        with ui.row().classes('w-full justify-between items-center mt-4'):
            ui.button(
                'Delete',
                on_click=lambda: (dialog.close(), delete_home_task(task_id)),
            ).props('flat color=negative no-caps')
            with ui.row().classes('gap-2'):
                ui.button('Cancel', on_click=dialog.close).props('flat no-caps')
                ui.button(
                    'Save',
                    on_click=lambda: (dialog.close(), update_home_task(
                        task_id,
                        title=title_input.value,
                        due_date=due_input.value or '',
                        priority=priority_select.value or '',
                    )),
                ).classes('add-btn').props('no-caps')
    dialog.open()


def render_home_task_widget():
    tasks = filtered_home_tasks()
    completed_count = sum(1 for task in home_tasks if task.get('completed'))
    active_count = sum(1 for task in home_tasks if not task.get('completed'))

    with ui.card().classes('card todo-card w-full p-4'):
        with ui.element('div').classes('todo-header'):
            with ui.column().classes('gap-0'):
                ui.label('To-Do List').classes('section-title')
            with ui.element('div').classes('todo-stats'):
                ui.label(f'{active_count} active').classes('chip')
                ui.label(f'{completed_count} done').classes('chip')
                ui.select(
                    TASK_VIEW_OPTIONS,
                    value=home_task_view['value'],
                    on_change=lambda e: (home_task_view.__setitem__('value', e.value), render_page()),
                    label='View',
                ).props('dense outlined').classes('w-36 max-w-full')

        with ui.element('div').classes('todo-quick-add mt-3'):
            quick_title = ui.input('Quick add').props('dense outlined').classes('w-full')
            quick_due = ui.input('Due').props('dense outlined type=date').classes('w-full')
            quick_priority = ui.select(
                options={'': 'Priority', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low'},
                value='',
                label='Priority',
            ).props('dense outlined').classes('w-full')
            ui.button(
                '+ Add',
                on_click=lambda: add_home_task(quick_title.value, quick_due.value or '', quick_priority.value or ''),
            ).classes('add-btn').props('dense no-caps')

        with ui.element('div').classes('todo-list mt-3'):
            if tasks:
                for task in tasks:
                    due_label = home_task_due_label(task)
                    priority = task.get('priority', '')
                    title_classes = 'todo-item-title completed' if task.get('completed') else 'todo-item-title'
                    item_classes = 'todo-item completed' if task.get('completed') else 'todo-item'
                    with ui.element('div').classes(item_classes):
                        ui.checkbox(
                            value=bool(task.get('completed')),
                            on_change=lambda e, task_id=task['id']: update_home_task(task_id, completed=bool(e.value)),
                        )
                        with ui.element('div').classes('todo-item-main'):
                            ui.label(task.get('title', '')).classes(title_classes)
                            with ui.element('div').classes('todo-meta'):
                                if due_label:
                                    ui.label(due_label).classes('chip')
                                if priority:
                                    ui.label(priority).classes(f'chip todo-priority-{priority.lower()}')
                        with ui.element('div').classes('todo-actions'):
                            ui.button(
                                'Edit',
                                on_click=lambda task_id=task['id']: open_edit_home_task_dialog(task_id),
                            ).props('flat dense no-caps size=sm')
                            ui.button(
                                'Delete',
                                on_click=lambda task_id=task['id']: delete_home_task(task_id),
                            ).props('flat dense color=negative no-caps size=sm')
            else:
                empty_copy = {
                    'Due Soon': 'No upcoming tasks with due dates yet. Add one above to build your week.',
                    'Incomplete': 'No incomplete tasks right now. Add a next step to keep momentum going.',
                    'Completed': 'No completed tasks yet. Finished items will collect here.',
                }
                ui.label(empty_copy.get(home_task_view['value'], 'No tasks yet.')).classes('todo-empty')


def progress_ring(progress: int):
    safe_progress = max(0, min(progress, 100))
    palette = current_theme_values()
    return (
        "<div class='progress-ring' style=\""
        f"background: conic-gradient({palette['primary']} {safe_progress * 3.6}deg, {palette['primary_soft']} 0deg);\">"
        f"<div style='width:48px;height:48px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center'>{safe_progress}%</div>"
        "</div>"
    )


def render_add_college_control(square: bool = False):
    add_college_dialog = ui.dialog()
    with add_college_dialog, ui.card().classes('card w-[540px] p-5'):
        ui.label('Add College Application').classes('text-xl font-bold')
        ui.label('Choose a college, pick a valid application plan, and confirm the deadline.').classes('text-sm')

        college_options = list(college_data.keys())
        college_select = ui.select(
            options=college_options,
            value=None,
            label='College',
        ).props('use-input input-debounce=0 options-dense').classes('w-full')
        application_type_select = ui.select(options=[], label='Application Type').classes('w-full')
        deadline_input = ui.input(label='Deadline (editable)').classes('w-full')

        def sync_college_plan_fields():
            selected_college = college_select.value
            valid_plans = get_valid_application_plans(selected_college)
            application_type_select.options = valid_plans
            if valid_plans:
                if application_type_select.value not in valid_plans:
                    application_type_select.value = valid_plans[0]
                deadline_input.value = get_deadline_for_college_plan(selected_college, application_type_select.value)
            else:
                application_type_select.value = None
                deadline_input.value = 'TBD'
            application_type_select.update()
            deadline_input.update()

        def on_college_change(_):
            sync_college_plan_fields()

        def on_application_type_change(_):
            if college_select.value and application_type_select.value:
                deadline_input.value = get_deadline_for_college_plan(college_select.value, application_type_select.value)
                deadline_input.update()

        college_select.on('update:model-value', on_college_change)
        application_type_select.on('update:model-value', on_application_type_change)
        sync_college_plan_fields()

        def submit_college_selection():
            if not college_select.value or not application_type_select.value:
                ui.notify('Please select a college and application type.', color='negative')
                return
            selected_deadline = deadline_input.value.strip() if deadline_input.value else 'TBD'
            add_or_update_college(
                college_select.value,
                application_type_select.value,
                selected_deadline,
            )
            add_college_dialog.close()
            render_page()

        with ui.row().classes('w-full justify-end gap-2 mt-2'):
            ui.button('Cancel', on_click=add_college_dialog.close).props('flat')
            ui.button('Save college', on_click=submit_college_selection).classes('add-btn')

    if square:
        ui.button('+', on_click=add_college_dialog.open).classes('plus-square')
    else:
        ui.button('＋ Add college', on_click=add_college_dialog.open).classes('add-btn')


def render_activities_page():
    insights = activity_insights()

    ui.label('Activities').classes('text-3xl font-bold')
    ui.label('Brainstorm broadly, refine the strongest entries, and rank the final list the way colleges will see it.').classes('text-base')

    with ui.column().classes('activities-layout'):
        with ui.card().classes('card w-full p-5'):
            with ui.row().classes('w-full justify-between items-center'):
                with ui.column().classes('gap-0'):
                    ui.label('Brainstorm Board').classes('section-title')
                    ui.label('Capture possible extracurriculars quickly before deciding what makes the final application list.').classes('text-sm')
                ui.button('＋ Add brainstorm card', on_click=add_brainstorm_activity).classes('add-btn')

            with ui.element('div').classes('activities-board mt-3'):
                for index, activity in enumerate(brainstorm_activities):
                    with ui.card().classes('activity-card brainstorm-card'):
                        with ui.element('div').classes('activity-card-top'):
                            with ui.column().classes('gap-0 pl-2'):
                                ui.label(activity.get('activity_name') or f'Idea {index + 1}').classes('text-lg font-bold')
                                ui.label('Quick idea card').classes('text-xs uppercase tracking-wide')
                            ui.button('Remove', on_click=lambda i=index: confirm_remove_brainstorm_activity(i)).props('flat color=negative no-caps')

                        with ui.element('div').classes('activity-fields-grid'):
                            ui.input(
                                label='Activity name',
                                value=activity.get('activity_name', ''),
                                on_change=lambda e, i=index: set_activity_value('brainstorm', i, 'activity_name', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.select(
                                ACTIVITY_CATEGORIES,
                                value=activity.get('category', 'Other'),
                                label='Category',
                                on_change=lambda e, i=index: set_activity_value('brainstorm', i, 'category', e.value or 'Other'),
                            ).props('dense outlined').classes('w-full')
                            ui.input(
                                label='Years involved',
                                value=activity.get('years_involved', ''),
                                on_change=lambda e, i=index: set_activity_value('brainstorm', i, 'years_involved', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.number(
                                label='Hours/week',
                                value=activity.get('hours_per_week', 0),
                                min=0,
                                step=1,
                                on_change=lambda e, i=index: set_activity_number('brainstorm', i, 'hours_per_week', e.value),
                            ).props('dense outlined').classes('w-full')
                        ui.textarea(
                            label='Notes',
                            value=activity.get('notes', ''),
                            on_change=lambda e, i=index: set_activity_value('brainstorm', i, 'notes', e.value or ''),
                        ).props('autogrow outlined').classes('w-full mt-2 activity-notes pl-2')

        with ui.card().classes('card w-full p-5'):
            with ui.row().classes('w-full justify-between items-center'):
                with ui.column().classes('gap-0'):
                    ui.label('Final Activities List').classes('section-title')
                    ui.label('Limit this list to 10 entries and rank the strongest items first. Drag cards to reorder or use the arrow controls.').classes('text-sm')
                ui.button(
                    f'＋ Add final activity ({len(final_activities)}/10)',
                    on_click=add_final_activity,
                ).classes('add-btn')

            with ui.column().classes('activity-final-list mt-3'):
                for index, activity in enumerate(final_activities):
                    card = ui.card().classes('activity-card final-card drag-card w-full').props('draggable=true ondragover="event.preventDefault()"')
                    card.on('dragstart', lambda _, i=index: start_final_activity_drag(i))
                    card.on('drop', lambda _, i=index: drop_final_activity(i))
                    with card:
                        with ui.element('div').classes('activity-card-top'):
                            with ui.row().classes('items-center gap-3'):
                                with ui.element('div').classes('activity-rank-pill'):
                                    ui.label(str(index + 1))
                                with ui.column().classes('gap-0'):
                                    ui.label(activity.get('activity_name') or f'Ranked Activity {index + 1}').classes('text-lg font-bold')
                                    ui.label(activity.get('organization') or 'Add organization').classes('text-sm')
                            with ui.element('div').classes('activity-actions'):
                                ui.button(icon='drag_indicator').props('flat round dense')
                                ui.button(icon='keyboard_arrow_up', on_click=lambda i=index: move_final_activity(i, -1)).props('flat round dense')
                                ui.button(icon='keyboard_arrow_down', on_click=lambda i=index: move_final_activity(i, 1)).props('flat round dense')
                                ui.button('Remove', on_click=lambda i=index: confirm_remove_final_activity(i)).props('flat color=negative no-caps')

                        with ui.element('div').classes('activity-fields-grid final'):
                            ui.input(
                                label='Activity name',
                                value=activity.get('activity_name', ''),
                                on_change=lambda e, i=index: set_activity_value('final', i, 'activity_name', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.input(
                                label='Role / position',
                                value=activity.get('role_position', ''),
                                on_change=lambda e, i=index: set_activity_value('final', i, 'role_position', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.input(
                                label='Organization',
                                value=activity.get('organization', ''),
                                on_change=lambda e, i=index: set_activity_value('final', i, 'organization', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.input(
                                label='Years involved',
                                value=activity.get('years_involved', ''),
                                on_change=lambda e, i=index: set_activity_value('final', i, 'years_involved', e.value or ''),
                            ).props('dense outlined').classes('w-full')
                            ui.number(
                                label='Hours/week',
                                value=activity.get('hours_per_week', 0),
                                min=0,
                                step=1,
                                on_change=lambda e, i=index: set_activity_number('final', i, 'hours_per_week', e.value),
                            ).props('dense outlined').classes('w-full')
                            ui.number(
                                label='Weeks/year',
                                value=activity.get('weeks_per_year', 0),
                                min=0,
                                step=1,
                                on_change=lambda e, i=index: set_activity_number('final', i, 'weeks_per_year', e.value),
                            ).props('dense outlined').classes('w-full')
                        with ui.row().classes('w-full gap-3 mt-2'):
                            ui.select(
                                ACTIVITY_CATEGORIES,
                                value=activity.get('category', 'Other'),
                                label='Category',
                                on_change=lambda e, i=index: set_activity_value('final', i, 'category', e.value or 'Other'),
                            ).props('dense outlined').classes('w-56 max-w-full')
                        ui.textarea(
                            label='Description',
                            value=activity.get('description', ''),
                            on_change=lambda e, i=index: set_activity_value('final', i, 'description', e.value or ''),
                        ).props('autogrow outlined').classes('w-full mt-2 activity-description compact')

        with ui.card().classes('card w-full p-5'):
            ui.label('Activity Insights').classes('section-title')
            ui.label('Use these quick signals to spot gaps before you finalize the top 10.').classes('text-sm mt-1')

            with ui.element('div').classes('activity-insights-grid mt-3'):
                for label, value in [
                    ('Leadership activities', insights['leadership_count']),
                    ('Research activities', insights['research_count']),
                    ('Community service hours', insights['community_service_hours']),
                    ('Categories represented', len(insights['represented_categories'])),
                ]:
                    with ui.element('div').classes('insight-card'):
                        ui.label(label).classes('insight-label')
                        ui.label(str(value)).classes('insight-value')

            with ui.row().classes('w-full gap-4 mt-4 items-start'):
                with ui.card().classes('card p-4 grow'):
                    ui.label('Category coverage').classes('section-title')
                    with ui.element('div').classes('category-chip-wrap mt-3'):
                        if insights['represented_categories']:
                            for category in insights['represented_categories']:
                                ui.label(category).classes('chip')
                        else:
                            ui.label('No categories yet.').classes('text-sm')

                with ui.card().classes('card p-4 grow'):
                    ui.label('Distribution').classes('section-title')
                    with ui.element('div').classes('activity-bar-list mt-3'):
                        if insights['category_bars']:
                            for bar in insights['category_bars']:
                                with ui.element('div').classes('activity-bar-row'):
                                    ui.label(bar['category']).classes('text-sm')
                                    with ui.element('div').classes('activity-bar-track'):
                                        ui.element('div').classes('activity-bar-fill').style(f'width: {max(10, bar["percent"])}%')
                                    ui.label(str(bar['count'])).classes('text-sm text-right')
                        else:
                            ui.label('Add activities to see the distribution.').classes('text-sm')


def render_home_page():
    progress_average = int(sum(item['progress'] for item in widgets) / len(widgets)) if widgets else 0
    deadline_view = [
        {'name': item['name'], 'deadline': get_effective_deadline(item['name'])}
        for item in widgets
    ]
    dated_widgets = [item for item in deadline_view if days_until(item['deadline']) is not None]
    upcoming = sorted(dated_widgets, key=lambda item: days_until(item['deadline']))

    ui.label('Welcome back, Sophie').classes('text-3xl font-bold')
    ui.label('Your applications are moving. Focus on the next high-impact tasks today.').classes('text-base')

    with ui.row().classes('w-full gap-4'):
        with ui.card().classes('card p-5 grow'):
            ui.label('Progress summary').classes('section-title')
            ui.label(f'{progress_average}%').classes('stat-num')
            ui.label(f'{len(widgets)} colleges in progress').classes('text-sm')
        with ui.card().classes('card p-5 grow'):
            ui.label('Upcoming deadlines').classes('section-title')
            if upcoming:
                next_deadline = upcoming[0]
                ui.label(f"{next_deadline['name']}").classes('stat-num')
                ui.label(f"{next_deadline['deadline']} ({deadline_countdown(next_deadline['deadline'])})").classes('text-sm')
            else:
                ui.label('None').classes('stat-num')

    render_home_task_widget()

    with ui.row().classes('split-layout'):
        with ui.column().classes('split-main'):
            with ui.card().classes('card w-full p-5'):
                with ui.row().classes('w-full justify-between items-center'):
                    ui.label('Colleges in progress').classes('section-title')
                    ui.label(f'{len(widgets)} total').classes('chip')
                for item in widgets:
                    with ui.card().classes('card w-full p-4 mt-3'):
                        with ui.row().classes('w-full justify-between items-center'):
                            with ui.row().classes('items-center gap-3'):
                                ui.html(progress_ring(item['progress']))
                                with ui.column().classes('gap-0'):
                                    ui.button(
                                        item['name'],
                                        on_click=lambda college_name=item['name']: open_college_page(college_name),
                                    ).props('flat dense no-caps').classes('text-lg font-bold')
                                    ui.label(
                                        f"Deadline: {get_effective_deadline(item['name'])} • "
                                        f"{deadline_countdown(get_effective_deadline(item['name']))}"
                                    ).classes('text-sm')
                            ui.button('Resume where you left off', on_click=lambda college_name=item['name']: open_college_page(college_name)).props('outline no-caps').classes('text-xs')

            with ui.card().classes('card w-full p-5'):
                ui.label('Quick add').classes('section-title')
                with ui.row().classes('w-full gap-2 mt-2'):
                    render_add_college_control(square=False)
                    ui.button('＋ Add essay').props('flat outline')
                    ui.button('＋ Add recommender').props('flat outline')

        with ui.column().classes('split-side'):
            with ui.card().classes('card w-full p-5'):
                ui.label('Essays due soon').classes('section-title')
                for essay in essays_due:
                    ui.label(f"{essay['title']} • {deadline_countdown(essay['due'])}").classes('text-sm mt-1')
            with ui.card().classes('card w-full p-5'):
                ui.label('Missing recommendation letters').classes('section-title')
                if missing_recommendations:
                    for rec in missing_recommendations:
                        ui.label(f"{rec['college']} • {rec['recommender']}").classes('text-sm mt-1')
                else:
                    ui.label('None pending').classes('text-sm mt-1')
            with ui.card().classes('card w-full p-5'):
                ui.label('Pending fees / submitted applications').classes('section-title')
                for item in fees_status:
                    ui.label(f"{item['college']} • {item['status']}").classes('text-sm mt-1')


def render_colleges_page():
    ui.label('Colleges').classes('text-3xl font-bold')
    ui.label('Open any college to continue where you left off.').classes('text-base')

    with ui.column().classes('w-full gap-4'):
        for item in widgets:
            with ui.card().classes('card w-full p-5'):
                with ui.row().classes('w-full justify-between items-center'):
                    with ui.row().classes('items-center gap-3'):
                        ui.html(progress_ring(item['progress']))
                        with ui.column().classes('gap-0'):
                            ui.button(
                                item['name'],
                                on_click=lambda college_name=item['name']: open_college_page(college_name),
                            ).props('flat dense no-caps').classes('text-xl font-bold')
                            ui.label(
                                f"Deadline: {get_effective_deadline(item['name'])} • "
                                f"{deadline_countdown(get_effective_deadline(item['name']))}"
                            ).classes('text-sm')
                    ui.button(
                        'Open college page',
                        on_click=lambda college_name=item['name']: open_college_page(college_name),
                    ).props('outline no-caps')
    with ui.row().classes('w-full justify-center mt-1'):
        render_add_college_control(square=True)


def render_placeholder_page(title: str, subtitle: str):
    ui.label(title).classes('text-3xl font-bold')
    with ui.card().classes('card w-full p-6'):
        ui.label(subtitle).classes('text-base')


def render_page():
    apply_theme_settings()
    content_col.clear()
    with content_col:
        if current_page['id'] == 'home':
            render_home_page()
        elif current_page['id'] == 'colleges':
            render_colleges_page()
        elif current_page['id'] == 'activities':
            render_activities_page()
        elif current_page['id'] == 'research':
            render_research_page()
        elif current_page['id'] == 'essays':
            render_essays_page()
        elif current_page['id'] == 'recs':
            render_recommendations_page()
        elif current_page['id'] == 'fees':
            render_fees_page()
        elif current_page['id'] == 'settings':
            render_settings_page()
        elif current_page['id'] == 'college':
            render_college_page(current_page['college'] or 'College')


with ui.row().classes('shell w-full no-wrap'):
    with ui.column().classes('sidebar p-4 gap-2'):
        ui.label('CollegeAtlas ✨').classes('text-xl font-bold mb-2')
        for page_id, label in SIDEBAR_PAGES:
            sidebar_buttons[page_id] = ui.button(
                label,
                on_click=lambda page_id=page_id: open_page(page_id),
            ).classes('nav-item').props('flat')

    with ui.column().classes('p-8 gap-4 w-full max-w-5xl') as content_col:
        pass

normalize_college_records()
normalize_fee_tracker()
sync_widget_deadlines_from_college_data()
set_active_sidebar()
render_page()

ui.run(title='CollegeApplicationAtlas', reload=False)
