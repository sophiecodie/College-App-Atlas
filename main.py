from nicegui import ui
from datetime import datetime
import difflib
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
        "schools_assigned": ["Harvard", "Duke"],
        "request_sent": True,
        "confirmed": True,
        "submitted": False,
        "notes": "Will submit after spring break.",
    },
    {
        "name": "Mr. Johnson",
        "role": "Counselor",
        "schools_assigned": ["Harvard", "Duke"],
        "request_sent": True,
        "confirmed": True,
        "submitted": True,
        "notes": "School report submitted.",
    },
    {
        "name": "Dr. Kim",
        "role": "Supplemental Recommender",
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
    profile = college_profiles.get(college_name, {})
    widget = get_widget(college_name) or {}
    return {
        "application_type": profile.get("application_type", "Not set"),
        "deadline": widget.get("deadline", "TBD"),
        "status": profile.get("status", "Not started"),
        "major": profile.get("major", "Undeclared"),
        "progress": widget.get("progress", 0),
        "notes": profile.get("notes", "Add quick notes for this college."),
        "links": profile.get("links", []),
        "essays": profile.get("essays", []),
        "research": profile.get("research", []),
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
        "why_this_school": "",
        "vibe": "",
        "academic_strengths": "",
        "notes_status": "Not started",
        "interview": "Unknown",
        "visit_status": "Not planned",
        "priority_level": "Medium",
        "general_notes": "",
        "academic_programs": "",
        "campus_culture": "",
        "clubs_professors_labs": "",
        "why_us_material": "",
        "links_resources": "",
        "personal_reflections": "",
    }


def render_research_page():
    ui.label('Research').classes('text-3xl font-bold')
    ui.label('Move fast in the database view, then go deep in each college research workspace.').classes('text-base')

    if research_state["college"]:
        college_name = research_state["college"]
        entry = research_database[college_name]

        with ui.row().classes('w-full justify-between items-center'):
            ui.label(f'{college_name} Research Workspace').classes('section-title')
            ui.button('← Back to Research Database', on_click=lambda: back_to_database()).props('flat no-caps')

        with ui.row().classes('w-full gap-4'):
            with ui.card().classes('card p-4 grow'):
                ui.label('Location').classes('text-sm')
                ui.input(value=entry["location"], on_change=lambda e: set_research_value(college_name, "location", e.value)).classes('w-full')
            with ui.card().classes('card p-4 grow'):
                ui.label('Major / Program').classes('text-sm')
                ui.input(value=entry["major_program"], on_change=lambda e: set_research_value(college_name, "major_program", e.value)).classes('w-full')
            with ui.card().classes('card p-4 grow'):
                ui.label('Priority').classes('text-sm')
                ui.select(["High", "Medium", "Low"], value=entry["priority_level"], on_change=lambda e: set_research_value(college_name, "priority_level", e.value)).classes('w-full')

        section_specs = [
            ("General Notes", "general_notes"),
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

    with ui.card().classes('card w-full p-4'):
        with ui.row().classes('w-full justify-between items-center'):
            ui.label('Research Database View').classes('section-title')
            ui.select(
                [
                    "priority_level",
                    "application_deadline",
                    "college",
                    "notes_status",
                ],
                value=research_state["sort_by"],
                on_change=lambda e: update_research_sort(e.value),
                label='Sort by',
            ).classes('w-56')

        header_cols = [
            'College', 'Location', 'Major/Program', 'App Deadline', 'Why This School?', 'Vibe',
            'Academic Strengths', 'Notes Status', 'Interview?', 'Visit Status', 'Priority', 'Open'
        ]
        with ui.row().classes('w-full no-wrap text-sm font-bold mt-3'):
            for col in header_cols:
                ui.label(col).classes('w-40')

        for row in sorted_research_rows():
            with ui.row().classes('w-full no-wrap items-center text-sm py-2 cursor-pointer').on(
                'click', lambda _, college_name=row["college"]: open_research_college(college_name)
            ):
                ui.label(row["college"]).classes('w-40 font-semibold')
                ui.label(row["location"]).classes('w-40')
                ui.label(row["major_program"]).classes('w-40')
                ui.label(row["application_deadline"]).classes('w-40')
                ui.label(row["why_this_school"]).classes('w-40')
                ui.label(row["vibe"]).classes('w-40')
                ui.label(row["academic_strengths"]).classes('w-40')
                ui.label(row["notes_status"]).classes('w-40')
                ui.label(row["interview"]).classes('w-40')
                ui.label(row["visit_status"]).classes('w-40')
                ui.label(row["priority_level"]).classes('w-40')
                ui.button(
                    'Open',
                    on_click=lambda college_name=row["college"]: open_research_college(college_name),
                ).props('outline dense no-caps').classes('w-24')


def sorted_research_rows():
    rows = []
    for college, entry in research_database.items():
        rows.append({
            "college": college,
            "location": entry["location"],
            "major_program": entry["major_program"],
            "application_deadline": entry["application_deadline"],
            "why_this_school": entry["why_this_school"] or '-',
            "vibe": entry["vibe"] or '-',
            "academic_strengths": entry["academic_strengths"] or '-',
            "notes_status": entry["notes_status"],
            "interview": entry["interview"],
            "visit_status": entry["visit_status"],
            "priority_level": entry["priority_level"],
        })

    sort_by = research_state["sort_by"]
    if sort_by == "priority_level":
        rows.sort(key=lambda row: PRIORITY_RANK.get(row["priority_level"], 99))
    elif sort_by == "application_deadline":
        rows.sort(key=lambda row: days_until(row["application_deadline"]) if days_until(row["application_deadline"]) is not None else 10**6)
    elif sort_by == "notes_status":
        rows.sort(key=lambda row: row["notes_status"])
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


def render_recommendations_page():
    for college in [item["name"] for item in widgets]:
        ensure_recommendation_row(college)

    ui.label('Recommendations').classes('text-3xl font-bold')
    ui.label('Track recommenders with low-stress clarity and quickly spot missing submissions.').classes('text-base')

    missing_total = 0
    for college, recs in recommendation_matrix.items():
        for status in recs.values():
            if status == "Missing":
                missing_total += 1

    with ui.row().classes('w-full gap-4'):
        with ui.card().classes('card p-4 grow'):
            ui.label('Total recommenders').classes('section-title')
            ui.label(str(len(recommenders))).classes('stat-num')
        with ui.card().classes('card p-4 grow'):
            ui.label('Missing items').classes('section-title')
            ui.label(str(missing_total)).classes('stat-num')

    with ui.card().classes('card w-full p-4'):
        ui.label('Recommender Tracker').classes('section-title')
        with ui.row().classes('w-full no-wrap text-sm font-bold mt-3'):
            for header in ["Name", "Subject/Role", "Schools Assigned", "Request Sent", "Confirmed", "Submitted", "Notes", "Deadline Reminders"]:
                ui.label(header).classes('w-40')

        for rec in recommenders:
            reminder_items = []
            for school in rec["schools_assigned"]:
                school_widget = get_widget(school)
                if not school_widget:
                    continue
                row_status = recommendation_matrix.get(school, {}).get(rec["name"], "Missing")
                if row_status != "Submitted":
                    reminder_items.append(f"{school}: {school_widget['deadline']}")
            reminders = ", ".join(reminder_items) if reminder_items else "None"

            with ui.row().classes('w-full no-wrap items-center text-sm py-2'):
                ui.label(rec["name"]).classes('w-40 font-semibold')
                ui.label(rec["role"]).classes('w-40')
                ui.label(", ".join(rec["schools_assigned"])).classes('w-40')
                ui.label("Yes" if rec["request_sent"] else "No").classes('w-40')
                ui.label("Yes" if rec["confirmed"] else "No").classes('w-40')
                ui.label("Yes" if rec["submitted"] else "No").classes('w-40')
                ui.label(rec["notes"]).classes('w-40')
                ui.label(reminders).classes('w-40')

    with ui.card().classes('card w-full p-4'):
        ui.label('Recommendation Matrix').classes('section-title')
        ui.label('Rows = colleges, columns = recommenders/counselor/supplemental recs').classes('text-sm mt-1')

        with ui.row().classes('w-full no-wrap text-sm font-bold mt-3'):
            ui.label('College').classes('w-40')
            for rec in recommenders:
                ui.label(rec["name"]).classes('w-40')

        for item in widgets:
            college = item["name"]
            with ui.row().classes('w-full no-wrap items-center text-sm py-2'):
                ui.label(college).classes('w-40 font-semibold')
                for rec in recommenders:
                    status = recommendation_matrix[college].get(rec["name"], "Missing")
                    ui.label(matrix_status_symbol(status)).classes('w-40')


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
    profile = get_college_profile(college_name)

    ui.label(college_name).classes('text-3xl font-bold')
    ui.label('College command center').classes('text-base')

    with ui.tabs().classes('w-full') as tabs:
        overview_tab = ui.tab('Overview')
        essays_tab = ui.tab('Essays')
        research_tab = ui.tab('Research')
        requirements_tab = ui.tab('Requirements')
        fees_tab = ui.tab('Fees')
        recs_tab = ui.tab('Recs')

    with ui.tab_panels(tabs, value=overview_tab).classes('w-full'):
        with ui.tab_panel(overview_tab):
            with ui.row().classes('w-full gap-4'):
                with ui.card().classes('card p-5 grow'):
                    ui.label('Application type').classes('section-title')
                    ui.label(profile['application_type']).classes('text-base mt-1')
                with ui.card().classes('card p-5 grow'):
                    ui.label('Deadline').classes('section-title')
                    ui.label(f"{profile['deadline']} ({deadline_countdown(profile['deadline'])})").classes('text-base mt-1')
                with ui.card().classes('card p-5 grow'):
                    ui.label('Status').classes('section-title')
                    ui.label(profile['status']).classes('text-base mt-1')
                with ui.card().classes('card p-5 grow'):
                    ui.label('Major').classes('section-title')
                    ui.label(profile['major']).classes('text-base mt-1')

            with ui.row().classes('w-full gap-4 mt-2 items-start'):
                with ui.card().classes('card p-5 w-1/3'):
                    ui.label('Checklist progress').classes('section-title')
                    ui.html(progress_ring(profile['progress'])).classes('mt-3')
                with ui.card().classes('card p-5 w-1/3'):
                    ui.label('Quick notes').classes('section-title')
                    ui.label(profile['notes']).classes('text-sm mt-2')
                with ui.card().classes('card p-5 w-1/3'):
                    ui.label('Important links').classes('section-title')
                    if profile['links']:
                        for label, url in profile['links']:
                            ui.link(label, url, new_tab=True).classes('block text-sm mt-1')
                    else:
                        ui.label('No links yet').classes('text-sm mt-1')

        with ui.tab_panel(essays_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Essays').classes('section-title')
                render_simple_list(profile['essays'], 'No essays tracked yet.')

        with ui.tab_panel(research_tab):
            with ui.card().classes('card w-full p-5'):
                ui.label('Research').classes('section-title')
                render_simple_list(profile['research'], 'No research notes yet.')

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
                render_simple_list(profile['recs'], 'No recommendations tracked yet.')

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


def render_home_page():
    progress_average = int(sum(item['progress'] for item in widgets) / len(widgets)) if widgets else 0
    dated_widgets = [item for item in widgets if days_until(item['deadline']) is not None]
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

    with ui.row().classes('w-full gap-4 items-start'):
        with ui.column().classes('w-2/3 gap-4'):
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
                                    ui.label(f"Deadline: {item['deadline']} • {deadline_countdown(item['deadline'])}").classes('text-sm')
                            ui.button('Resume where you left off', on_click=lambda college_name=item['name']: open_college_page(college_name)).props('outline no-caps').classes('text-xs')

            with ui.card().classes('card w-full p-5'):
                ui.label('Quick add').classes('section-title')
                with ui.row().classes('w-full gap-2 mt-2'):
                    def add_college():
                        college_name = f'New College {len(widgets)+1}'
                        widgets.append({'name': college_name, 'progress': 0, 'deadline': 'TBD'})
                        college_profiles[college_name] = {
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
                        research_database[college_name] = default_research_entry(college_name)
                        ensure_recommendation_row(college_name)
                        ensure_fee_row(college_name)
                        render_page()

                    ui.button('＋ Add college', on_click=add_college).classes('add-btn')
                    ui.button('＋ Add essay').props('flat outline')
                    ui.button('＋ Add recommender').props('flat outline')

        with ui.column().classes('w-1/3 gap-4'):
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
                            ui.label(f"Deadline: {item['deadline']} • {deadline_countdown(item['deadline'])}").classes('text-sm')
                    ui.button(
                        'Open college page',
                        on_click=lambda college_name=item['name']: open_college_page(college_name),
                    ).props('outline no-caps')


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

set_active_sidebar()
render_page()

ui.run(title='CollegeApplicationAtlas', reload=False)
