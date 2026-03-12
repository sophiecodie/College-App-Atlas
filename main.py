from nicegui import ui
from datetime import datetime
from pathlib import Path
import difflib
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
@media (max-width: 1100px) {{
  .four-col {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  .three-col {{ grid-template-columns: 1fr; }}
  .split-layout {{ flex-direction: column; }}
  .research-grid {{ grid-template-columns: 1fr; }}
  .research-cards-grid {{ grid-template-columns: 1fr; }}
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

widgets = [
    {"name": "Harvard", "progress": 72, "deadline": "Mar 28, 2026"},
    {"name": "Duke", "progress": 38, "deadline": "Apr 05, 2026"},
]


COLLEGE_DATA_PATH = Path(__file__).with_name('college_plans.json')
APPLICATION_STATUS_OPTIONS = ['In Progress', 'Ready to Submit', 'Submitted']


def load_college_catalog():
    try:
        with COLLEGE_DATA_PATH.open('r', encoding='utf-8') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        print(f'Could not load college catalog from {COLLEGE_DATA_PATH}: {error}')
        return {}

    # Backward compatibility: old format was {college_name: {plans: {...}}}
    if isinstance(data, dict) and 'colleges' not in data:
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
    by_name = {}
    for college in colleges:
        if isinstance(college, dict) and college.get('name'):
            by_name[college['name']] = college
    return by_name


def save_college_catalog():
    payload = {'colleges': list(college_data.values())}
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
        "application_fee": 85,
        "fee_waiver_status": "Not approved",
        "submitted_payment": False,
        "amount_paid": 0,
        "score_report_fees": 14,
        "css_fafsa_costs": 25,
        "notes": "Waiting to decide whether to request fee waiver.",
    },
    "Duke": {
        "application_fee": 75,
        "fee_waiver_status": "Approved",
        "submitted_payment": True,
        "amount_paid": 75,
        "score_report_fees": 14,
        "css_fafsa_costs": 16,
        "notes": "Application fee waived; paid score report costs.",
    },
}
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
            "word_limit": 250,
            "comments": ["Add one concrete program example."],
            "drafts": [
                {
                    "name": "v1",
                    "status": "rough",
                    "text": "I want to study computer science and policy. At Harvard, I can connect technical coursework with social impact through interdisciplinary projects.",
                },
                {
                    "name": "v2",
                    "status": "revise",
                    "text": "My interests in computer science and policy fit Harvard's interdisciplinary ecosystem. I want to combine CS problem-solving with policy analysis and contribute to research labs focused on public-interest technology.",
                },
            ],
        },
        {
            "title": "Tell us about a community you belong to.",
            "prompt_text": "Describe a community that has shaped you and explain your role within it.",
            "word_limit": 200,
            "comments": [],
            "drafts": [
                {"name": "v1", "status": "brainstorm", "text": "I learned leadership through organizing tutoring for younger students."},
            ],
        },
    ],
    "Duke": [
        {
            "title": "Why Duke?",
            "prompt_text": "Why are you interested in Duke and how does it match your goals?",
            "word_limit": 250,
            "comments": ["Mention one specific Duke resource."],
            "drafts": [
                {
                    "name": "v1",
                    "status": "rough",
                    "text": "Duke fits my goals in policy and data-driven problem solving. I am excited by hands-on learning and interdisciplinary opportunities.",
                }
            ],
        }
    ],
}
ESSAY_STATUSES = ["brainstorm", "rough", "revise", "final"]
essay_state = {
    "college": "Harvard",
    "prompt_index": 0,
    "draft_index": 0,
}
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
    ("essays", "📝 Essays"),
    ("research", "🔎 Research"),
    ("recs", "💌 Recommendations"),
    ("fees", "💳 Fees"),
    ("settings", "⚙️ Settings"),
]

current_page = {'id': 'home', 'college': None}
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
    research_state["college"] = None
    set_active_sidebar()
    render_page()


def open_college_page(college_name: str):
    current_page['id'] = 'college'
    current_page['college'] = college_name
    set_active_sidebar()
    render_page()


def get_widget(college_name: str):
    return next((item for item in widgets if item['name'] == college_name), None)


def get_college_profile(college_name: str):
    record = get_college_record(college_name) or {}
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


def prompt_coverage(prompt_text: str, draft_text: str):
    stopwords = {
        "the", "and", "for", "that", "with", "this", "your", "you", "how", "are",
        "from", "into", "have", "will", "about", "what", "where", "when", "why",
    }
    prompt_words = [w for w in re.findall(r"[a-zA-Z']+", prompt_text.lower()) if len(w) > 3 and w not in stopwords]
    draft_words = normalize_words(draft_text)
    if not prompt_words:
        return 100, []
    matched = [w for w in sorted(set(prompt_words)) if w in draft_words]
    score = int((len(matched) / len(set(prompt_words))) * 100)
    return score, matched


def find_reuse_matches(selected_college: str, selected_prompt_index: int, selected_draft_index: int):
    selected_prompt = essay_data[selected_college][selected_prompt_index]
    selected_text = selected_prompt["drafts"][selected_draft_index]["text"]
    selected_words = normalize_words(selected_text)
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
                similarity = len(selected_words & other_words) / len(union)
                if similarity >= 0.22:
                    matches.append({
                        "college": college,
                        "prompt_title": prompt["title"],
                        "version": draft["name"],
                        "similarity": int(similarity * 100),
                    })
    return sorted(matches, key=lambda m: m["similarity"], reverse=True)[:3]


def render_essays_page():
    ui.label('Essays').classes('text-3xl font-bold')
    ui.label('Write with full application context: college, prompt, versions, and readiness status.').classes('text-base')

    layout = ui.row().classes('w-full no-wrap gap-4 items-start')
    with layout:
        left_col = ui.column().classes('w-1/4 card p-3')
        center_col = ui.column().classes('w-2/4 card p-4')
        right_col = ui.column().classes('w-1/4 card p-4')

    def clamp_selection():
        colleges = list(essay_data.keys())
        if not colleges:
            return
        if essay_state["college"] not in essay_data:
            essay_state["college"] = colleges[0]
            essay_state["prompt_index"] = 0
            essay_state["draft_index"] = 0
        prompts = essay_data[essay_state["college"]]
        if prompts:
            essay_state["prompt_index"] = min(essay_state["prompt_index"], len(prompts) - 1)
            drafts = prompts[essay_state["prompt_index"]]["drafts"]
            essay_state["draft_index"] = min(essay_state["draft_index"], len(drafts) - 1)

    def selected_prompt():
        return essay_data[essay_state["college"]][essay_state["prompt_index"]]

    def selected_draft():
        return selected_prompt()["drafts"][essay_state["draft_index"]]

    def refresh_left():
        left_col.clear()
        with left_col:
            ui.label('Colleges & Prompts').classes('section-title')
            for college, prompts in essay_data.items():
                with ui.expansion(college, value=(college == essay_state["college"])).classes('w-full'):
                    for idx, prompt in enumerate(prompts):
                        active = college == essay_state["college"] and idx == essay_state["prompt_index"]
                        btn = ui.button(
                            prompt["title"],
                            on_click=lambda college_name=college, prompt_idx=idx: select_prompt(college_name, prompt_idx),
                        ).props('flat no-caps').classes('w-full text-left')
                        if active:
                            btn.classes(add='nav-item active')
                        else:
                            btn.classes(add='nav-item')

    def refresh_center():
        center_col.clear()
        prompt = selected_prompt()
        draft = selected_draft()
        with center_col:
            with ui.row().classes('w-full justify-between items-center'):
                ui.label(prompt["title"]).classes('section-title')
                ui.label(f"{essay_state['college']}").classes('chip')
            ui.label('Selected Draft Editor').classes('text-sm mt-1')

            def on_text_change(e):
                draft["text"] = e.value
                refresh_right()

            ui.textarea(label='Essay Draft', value=draft["text"], on_change=on_text_change).props('autogrow outlined').classes('w-full min-h-[420px] mt-2')

    def refresh_right():
        right_col.clear()
        prompt = selected_prompt()
        draft = selected_draft()
        word_count = len(re.findall(r"\b\w+\b", draft["text"]))
        coverage_score, matched_words = prompt_coverage(prompt["prompt_text"], draft["text"])
        reuse_matches = find_reuse_matches(essay_state["college"], essay_state["prompt_index"], essay_state["draft_index"])

        with right_col:
            ui.label('Metadata & Tools').classes('section-title')
            ui.label(f'Word count: {word_count}/{prompt["word_limit"]}').classes('text-sm mt-2')
            if word_count > prompt["word_limit"]:
                ui.label('Over word limit').classes('text-sm text-red-600')
            ui.label(f"Status: {draft['status']}").classes('text-sm mt-1')
            ui.label('Prompt').classes('section-title mt-3')
            ui.label(prompt["prompt_text"]).classes('text-sm mt-1')

            with ui.row().classes('w-full mt-3 items-center'):
                ui.label('Draft status').classes('text-sm')

                def on_status_change(e):
                    draft["status"] = e.value
                    refresh_right()

                ui.select(ESSAY_STATUSES, value=draft["status"], on_change=on_status_change).classes('w-full')

            ui.label('Draft versions').classes('section-title mt-3')
            version_names = [d["name"] for d in prompt["drafts"]]

            def on_version_change(e):
                essay_state["draft_index"] = version_names.index(e.value)
                refresh_center()
                refresh_right()

            ui.select(version_names, value=draft["name"], on_change=on_version_change).classes('w-full')

            def add_version():
                base = selected_draft()
                new_version_name = f"v{len(prompt['drafts']) + 1}"
                prompt["drafts"].append({
                    "name": new_version_name,
                    "status": "rough",
                    "text": base["text"],
                })
                essay_state["draft_index"] = len(prompt["drafts"]) - 1
                refresh_center()
                refresh_right()

            ui.button('＋ New version from current draft', on_click=add_version).props('outline no-caps').classes('w-full mt-2')

            ui.label('Comments').classes('section-title mt-3')
            if prompt["comments"]:
                for comment in prompt["comments"]:
                    ui.label(f'• {comment}').classes('text-sm mt-1')
            else:
                ui.label('No comments yet.').classes('text-sm mt-1')

            comment_input = ui.input(placeholder='Add comment').classes('w-full mt-2')

            def add_comment():
                if comment_input.value:
                    prompt["comments"].append(comment_input.value.strip())
                    comment_input.value = ''
                    refresh_right()

            ui.button('Add comment', on_click=add_comment).props('flat').classes('self-start')

            ui.label('Did I answer the prompt?').classes('section-title mt-3')
            ui.label(f'Coverage score: {coverage_score}%').classes('text-sm')
            if matched_words:
                ui.label(f"Matched keywords: {', '.join(matched_words[:8])}").classes('text-xs')
            else:
                ui.label('Matched keywords: none yet').classes('text-xs')

            ui.label('Compare versions').classes('section-title mt-3')
            compare_options = [name for name in version_names if name != draft["name"]]
            compare_select = ui.select(compare_options, value=compare_options[0] if compare_options else None).classes('w-full')
            compare_result = ui.markdown('').classes('w-full mt-1')

            def compare_versions():
                if not compare_select.value:
                    compare_result.set_content('No other version to compare.')
                    return
                other = next(d for d in prompt["drafts"] if d["name"] == compare_select.value)
                diff_lines = list(difflib.unified_diff(
                    other["text"].splitlines(),
                    draft["text"].splitlines(),
                    fromfile=other["name"],
                    tofile=draft["name"],
                    lineterm='',
                ))
                preview = '\n'.join(diff_lines[:30]) if diff_lines else 'No differences.'
                compare_result.set_content(f"```diff\n{preview}\n```")

            ui.button('Compare now', on_click=compare_versions).props('outline no-caps').classes('w-full mt-1')

            ui.label('Cross-college reuse tracking').classes('section-title mt-3')
            if reuse_matches:
                for match in reuse_matches:
                    ui.label(
                        f"Overlap {match['similarity']}% with {match['prompt_title']} ({match['college']} - {match['version']})"
                    ).classes('text-xs mt-1')
            else:
                ui.label('No strong overlaps detected.').classes('text-xs mt-1')

    def select_prompt(college_name: str, prompt_idx: int):
        essay_state["college"] = college_name
        essay_state["prompt_index"] = prompt_idx
        essay_state["draft_index"] = 0
        refresh_left()
        refresh_center()
        refresh_right()

    clamp_selection()
    refresh_left()
    refresh_center()
    refresh_right()


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
        "application_fee": 0,
        "fee_waiver_status": "Not requested",
        "submitted_payment": False,
        "amount_paid": 0,
        "score_report_fees": 0,
        "css_fafsa_costs": 0,
        "notes": "",
    }


def waiver_savings(row: dict):
    return row["application_fee"] if row["fee_waiver_status"] == "Approved" else 0


def ensure_fee_row(college_name: str):
    if college_name not in fee_tracker:
        fee_tracker[college_name] = default_fee_entry()


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
        expected_total += row["application_fee"] + row["score_report_fees"] + row["css_fafsa_costs"]
        total_paid += row["amount_paid"]
        total_waiver_saved += waiver_savings(row)

    ui.label('Fees').classes('text-3xl font-bold')
    ui.label('Track costs, waivers, and payments in one place.').classes('text-base')

    with ui.row().classes('w-full gap-4'):
        with ui.card().classes('card p-4 grow'):
            ui.label('Total expected cost').classes('section-title')
            ui.label(f'${expected_total}').classes('stat-num')
        with ui.card().classes('card p-4 grow'):
            ui.label('Total paid').classes('section-title')
            ui.label(f'${total_paid}').classes('stat-num')
        with ui.card().classes('card p-4 grow'):
            ui.label('Fee waivers saved').classes('section-title')
            ui.label(f'${total_waiver_saved}').classes('stat-num')

    with ui.card().classes('card w-full p-4'):
        with ui.row().classes('w-full no-wrap text-sm font-bold mt-1'):
            for header in [
                "College", "Application Fee", "Fee Waiver Status", "Submitted Payment?",
                "Amount Paid", "Score Report Fees", "CSS/FAFSA Costs", "Notes"
            ]:
                ui.label(header).classes('w-40')

        for item in widgets:
            college = item["name"]
            row = fee_tracker[college]
            with ui.row().classes('w-full no-wrap items-center text-sm py-2'):
                ui.label(college).classes('w-40 font-semibold')
                ui.label(f"${row['application_fee']}").classes('w-40')
                ui.label(row["fee_waiver_status"]).classes('w-40')
                ui.label("Yes" if row["submitted_payment"] else "No").classes('w-40')
                ui.label(f"${row['amount_paid']}").classes('w-40')
                ui.label(f"${row['score_report_fees']}").classes('w-40')
                ui.label(f"${row['css_fafsa_costs']}").classes('w-40')
                ui.label(row["notes"] or "-").classes('w-40')


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
        essays_tab = ui.tab('Essays')
        research_tab = ui.tab('Research')
        requirements_tab = ui.tab('Requirements')
        fees_tab = ui.tab('Fees')
        recs_tab = ui.tab('Recommendations')

    with ui.tab_panels(tabs, value=overview_tab).classes('w-full'):
        with ui.tab_panel(overview_tab):
            with ui.row().classes('four-col'):
                with ui.card().classes('card p-5 grow'):
                    ui.label('Application type').classes('section-title')
                    application_types = get_valid_application_plans(college_name)

                    def update_application_type(e):
                        record['selected_application_type'] = e.value
                        deadline_value = get_deadline_for_college_plan(college_name, e.value)
                        add_or_update_college(college_name, e.value, deadline_value)

                    ui.select(application_types, value=record.get('selected_application_type'), on_change=update_application_type).classes('w-full mt-2')

                with ui.card().classes('card p-5 grow'):
                    ui.label('Deadline').classes('section-title')
                    selected_plan = record.get('selected_application_type')
                    current_deadline = get_deadline_for_college_plan(college_name, selected_plan) if selected_plan else 'TBD'

                    def update_deadline(e):
                        deadline_text = e.value.strip() if e.value else 'TBD'
                        selected_type = record.get('selected_application_type')
                        if selected_type:
                            add_or_update_college(college_name, selected_type, deadline_text)
                        else:
                            existing_widget = get_widget(college_name)
                            if existing_widget:
                                existing_widget['deadline'] = deadline_text

                    ui.input(value=current_deadline, on_change=update_deadline).classes('w-full mt-2')
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
                render_simple_list(profile['requirements'], 'No requirements listed yet.')

        with ui.tab_panel(fees_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Fees').classes('section-title')
                render_simple_list(profile['fees'], 'No fee data yet.')

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


def progress_ring(progress: int):
    safe_progress = max(0, min(progress, 100))
    return (
        "<div class='progress-ring' style=\""
        f"background: conic-gradient({THEME['primary']} {safe_progress * 3.6}deg, #F4E8EF 0deg);\">"
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
        with ui.card().classes('card p-5 grow'):
            ui.label("Today's priorities").classes('section-title')
            priorities = [
                'Submit Harvard supplemental draft',
                'Remind Ms. Patel for recommendation',
                'Pay pending application fee',
            ]
            for task in priorities:
                ui.label(f'• {task}').classes('text-sm')

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
    content_col.clear()
    with content_col:
        if current_page['id'] == 'home':
            render_home_page()
        elif current_page['id'] == 'colleges':
            render_colleges_page()
        elif current_page['id'] == 'research':
            render_research_page()
        elif current_page['id'] == 'essays':
            render_essays_page()
        elif current_page['id'] == 'recs':
            render_recommendations_page()
        elif current_page['id'] == 'fees':
            render_fees_page()
        elif current_page['id'] == 'settings':
            render_placeholder_page('Settings', 'Adjust app preferences, reminders, and account details.')
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
sync_widget_deadlines_from_college_data()
set_active_sidebar()
render_page()

ui.run(title='CollegeApplicationAtlas', reload=False)
