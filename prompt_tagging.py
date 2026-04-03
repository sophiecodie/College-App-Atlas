import re

PRIMARY_TAGS = (
    "Why Us",
    "Community",
    "Debate",
    "Adversity",
    "Identity",
    "Why Major",
    "Intellectual Curiosity",
    "Extracurricular",
    "Leadership",
    "Diversity",
    "Roommate",
    "Short Essays",
    "Activity",
    "Service",
    "Other",
)

SHORT_PROMPT_TYPES = {
    "short_answer",
    "supplemental_short_answer",
    "short_take_200_char",
    "selection_response",
}

LEGACY_PRIMARY_TAG_MAP = {
    "why-school": "Why Us",
    "academic-interest": "Intellectual Curiosity",
    "academic-areas-selection": "Why Major",
    "ab-undecided": "Why Major",
    "bse": "Why Major",
    "community": "Community",
    "service": "Service",
    "identity": "Identity",
    "adversity": "Adversity",
    "short-answer": "Short Essays",
    "long-essay-option": "Other",
    "optional_response": "Other",
    "personal": "Other",
    "dialogue": "Other",
    "ai-ethics": "Other",
    "debate": "Debate",
}


def _normalize_text(text: str) -> str:
    lowered = str(text or "").lower()
    lowered = lowered.replace("’", "'")
    lowered = re.sub(r"[^a-z0-9'&+/ -]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _has_any(text: str, phrases: tuple[str, ...] | list[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _map_legacy_tags(legacy_tags) -> str | None:
    primary = None
    if not isinstance(legacy_tags, list):
        return primary
    for raw_tag in legacy_tags:
        normalized = _normalize_text(raw_tag)
        if not normalized:
            continue
        if primary is None and normalized in LEGACY_PRIMARY_TAG_MAP:
            primary = LEGACY_PRIMARY_TAG_MAP[normalized]
    return primary


def infer_prompt_tags(
    prompt_text: str,
    prompt_type: str = "",
    word_limit: int | None = None,
    character_limit: int | None = None,
    required: bool | None = None,
    legacy_tags=None,
) -> dict:
    text = _normalize_text(prompt_text)
    prompt_type_normalized = _normalize_text(prompt_type)
    is_short = prompt_type_normalized in SHORT_PROMPT_TYPES
    is_short_essay = (
        (isinstance(character_limit, int) and character_limit > 0)
        or (isinstance(word_limit, int) and word_limit > 0 and word_limit <= 50)
        or is_short
    )
    legacy_primary = _map_legacy_tags(legacy_tags)

    community_focus = _has_any(text, [
        "community you belong to",
        "membership in a community",
        "community meaningful",
        "living and learning community",
        "community to which you feel connected",
        "community",
        "classmates learn from you",
        "contribute to",
        "contributions to",
    ])
    diversity_focus = _has_any(text, [
        "diversity of perspectives",
        "diversity of viewpoints",
        "wide range of viewpoints",
        "experiences is essential",
        "vibrant living and learning community",
        "different perspectives",
    ])
    adversity_focus = _has_any(text, [
        "challenge you faced",
        "adversity",
        "obstacle",
        "hardship",
        "setback",
        "overcome",
        "difficult time",
        "difficult experience",
        "resilience",
    ])
    identity_focus = _has_any(text, [
        "shaped who you are",
        "lived experience",
        "personal experience",
        "who you are today",
        "something about you",
        "shaped you",
        "your own story",
        "life experiences",
        "family responsibilities",
        "culture",
        "identity",
    ])
    service_focus = _has_any(text, [
        "service",
        "civic engagement",
        "responsibility to society",
        "public",
        "serve others",
    ])
    leadership_focus = _has_any(text, [
        "lead",
        "leader",
        "leadership",
        "captain",
        "organized",
        "guided",
    ])
    extracurricular_focus = _has_any(text, [
        "extracurricular",
        "activity",
        "activities",
        "employment experience",
        "work experience",
        "travel",
    ])
    dialogue_focus = _has_any(text, [
        "difference of opinion",
        "opposing view",
        "strongly disagreed",
        "respectful disagreement",
        "meaningful dialogue",
    ])
    ethical_reflection_focus = _has_any(text, [
        "what shapes your thinking",
        "would or would not choose",
        "ethical",
        "issue important to you",
    ])
    intellectual_curiosity_focus = _has_any(text, [
        "topic or idea that excites you",
        "what inspires you",
        "intellectual",
        "curiosity",
        "academic areas most pique your curiosity",
        "why are you drawn to it",
        "what academic areas",
    ])
    why_major_focus = _has_any(text, [
        "why you are interested in studying",
        "study engineering",
        "academic areas most pique your curiosity",
        "academic interests",
        "major",
        "programs offered",
        "academic offerings",
    ])
    explicit_why_major_focus = _has_any(text, [
        "why you are interested in studying",
        "study engineering",
        "academic areas most pique your curiosity",
        "what academic areas",
        "major",
        "programs offered",
    ])
    why_us_focus = _has_any(text, [
        "good match for your goals",
        "drawn you to yale",
        "impression of",
        "good match for your",
        "why do you believe",
        "how will you explore your academic interests here",
        "fit your interests",
        "suit your particular interests",
        "attracts you to our",
        "education in the future",
        "use your harvard education",
    ])
    roommate_focus = _has_any(text, [
        "roommates might like to know",
        "roommate",
    ])
    open_ended_fun_focus = _has_any(text, [
        "what brings you joy",
        "what song represents",
        "create an original piece of art",
        "write a book",
        "teach any college course",
        "last thing that you've been really excited about",
        "last thing that you have been really excited about",
    ])
    additional_information_focus = _has_any(text, [
        "not included anywhere else",
        "additional information",
        "anything else",
    ])
    open_ended_focus = _has_any(text, [
        "what inspires you",
        "what is a new skill",
        "what is something about you",
        "what's the last thing",
        "what is the last thing",
    ])
    primary_tag = legacy_primary
    open_ended_candidate = (
        (dialogue_focus and _has_any(text, ["what did you learn", "meaningful", "communicate", "engage"]))
        or ethical_reflection_focus
        or open_ended_fun_focus
        or open_ended_focus
        or required is False
    )

    if roommate_focus:
        primary_tag = "Roommate"
    elif dialogue_focus:
        primary_tag = "Debate"
    elif is_short_essay:
        primary_tag = "Short Essays"
    elif explicit_why_major_focus:
        primary_tag = "Why Major"
    elif why_us_focus:
        primary_tag = "Why Us"
    elif why_major_focus and _has_any(text, ["study", "major", "engineering", "academic areas", "programs offered", "academic offerings"]):
        primary_tag = "Why Major"
    elif intellectual_curiosity_focus and not why_us_focus:
        primary_tag = "Intellectual Curiosity"
    elif service_focus:
        primary_tag = "Service"
    elif diversity_focus:
        primary_tag = "Diversity"
    elif community_focus:
        primary_tag = "Community"
    elif adversity_focus:
        primary_tag = "Adversity"
    elif leadership_focus:
        primary_tag = "Leadership"
    elif extracurricular_focus and _has_any(text, ["responsibilities", "employment", "travel", "activities"]):
        primary_tag = "Activity"
    elif _has_any(text, ["extracurricular", "club", "team"]) and not community_focus:
        primary_tag = "Extracurricular"
    elif identity_focus:
        primary_tag = "Identity"
    elif additional_information_focus:
        primary_tag = "Other"
    elif open_ended_candidate:
        primary_tag = "Other"
    else:
        primary_tag = primary_tag or "Other"

    return {
        "primary_tag": primary_tag if primary_tag in PRIMARY_TAGS else "Other",
    }


def get_prompt_tag_labels(prompt: dict) -> list[str]:
    primary_tag = str(prompt.get("primary_tag", "") or "").strip()
    if primary_tag in PRIMARY_TAGS:
        return [primary_tag]

    inferred = infer_prompt_tags(
        prompt.get("prompt_text", "") or prompt.get("title", ""),
        prompt.get("prompt_type", ""),
        prompt.get("word_limit"),
        prompt.get("character_limit"),
        prompt.get("required"),
        prompt.get("tags", []),
    )
    return [inferred["primary_tag"]]
