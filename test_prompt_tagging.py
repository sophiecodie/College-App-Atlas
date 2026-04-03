import unittest

from clawyapp1.prompt_tagging import get_prompt_tag_labels, infer_prompt_tags


class PromptTaggingTests(unittest.TestCase):
    def test_community_prompt(self):
        result = infer_prompt_tags(
            "Tell us about a community you belong to and why it matters to you.",
            "supplemental_essay",
            250,
            True,
        )
        self.assertEqual(result["primary_tag"], "Community")

    def test_adversity_prompt(self):
        result = infer_prompt_tags(
            "Describe a challenge you faced and what you learned from it.",
            "supplemental_essay",
            250,
            True,
        )
        self.assertEqual(result["primary_tag"], "Adversity")
        self.assertIn("Challenge", result["secondary_tags"])
        self.assertIn("Resilience", result["secondary_tags"])

    def test_why_major_prompt(self):
        result = infer_prompt_tags(
            "How will you explore your academic interests here, and how do the programs offered suit your goals?",
            "supplemental_essay",
            250,
            True,
        )
        self.assertEqual(result["primary_tag"], "Why Major")

    def test_short_essay_prompt(self):
        result = infer_prompt_tags(
            "What brings you joy?",
            "short_answer",
            50,
            True,
        )
        self.assertEqual(result["primary_tag"], "Short Essays")

    def test_school_fit_prompt(self):
        result = infer_prompt_tags(
            "How do you hope to use your Harvard education in the future?",
            "supplemental_short_answer",
            150,
            True,
        )
        self.assertEqual(result["primary_tag"], "Why Us")

    def test_values_prompt_with_ethics_language(self):
        result = infer_prompt_tags(
            "Tell us about a situation when you would or would not choose to use AI. What shapes your thinking?",
            "supplemental_essay",
            250,
            False,
        )
        self.assertEqual(result["primary_tag"], "Open-Ended")
        self.assertEqual(result["secondary_tags"], [])

    def test_dialogue_prompt_uses_non_open_ended_primary_when_secondary_exists(self):
        result = infer_prompt_tags(
            "Describe a time when you strongly disagreed with someone about an idea or issue. How did you communicate? What did you learn?",
            "supplemental_short_answer",
            150,
            True,
        )
        self.assertEqual(result["primary_tag"], "Other")
        self.assertIn("Debate", result["secondary_tags"])

    def test_additional_information_prompt(self):
        result = infer_prompt_tags(
            "What is something about you that is not included anywhere else in your application?",
            "short_take_200_char",
            None,
            True,
        )
        self.assertEqual(result["primary_tag"], "Additional Information")

    def test_roommate_prompt(self):
        result = infer_prompt_tags(
            "Top 3 things your roommates might like to know about you.",
            "supplemental_short_answer",
            150,
            True,
        )
        self.assertEqual(result["primary_tag"], "Roommate")

    def test_legacy_tags_still_infer(self):
        labels = get_prompt_tag_labels({
            "prompt_text": "Stanford supplement details need manual capture.",
            "prompt_type": "supplemental_unknown",
            "tags": ["short-answer", "personal"],
        })
        self.assertEqual(labels[0], "Short Answer")


if __name__ == "__main__":
    unittest.main()
