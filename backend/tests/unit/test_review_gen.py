import random
from dataclasses import dataclass

from app.services.review import build_fill, build_quiz


@dataclass
class FakeCard:
    word: str = ""
    meaning: str = ""
    example: str = ""


def test_build_quiz_includes_correct_and_up_to_four_options():
    card = FakeCard(word="resilient", meaning="kiên cường")
    pool = [FakeCard(meaning="mong manh"), FakeCard(meaning="cứng nhắc"),
            FakeCard(meaning="hào phóng"), FakeCard(meaning="vội vàng")]
    q = build_quiz(card, pool, rng=random.Random(0))
    assert len(q["options"]) == 4
    correct = next(o for o in q["options"] if o["key"] == q["correct_key"])
    assert correct["text"] == "kiên cường"


def test_build_quiz_dedupes_and_handles_small_pool():
    card = FakeCard(word="x", meaning="đúng")
    pool = [FakeCard(meaning="đúng"), FakeCard(meaning="khác")]  # dup of correct + 1
    q = build_quiz(card, pool, rng=random.Random(1))
    texts = [o["text"] for o in q["options"]]
    assert texts.count("đúng") == 1  # correct only once, dup filtered
    assert "khác" in texts


def test_build_fill_splits_example_and_makes_hint():
    card = FakeCard(word="resilient", example="She is so resilient today.")
    f = build_fill(card)
    assert f["before"] == "She is so "
    assert f["after"] == " today."
    assert f["answer"] == "resilient"
    assert f["hint"] == "r________"


def test_build_fill_per_word_hint_for_phrase():
    card = FakeCard(word="put off", example="Don't put off your work.")
    f = build_fill(card)
    assert f["hint"] == "p__ o__"


def test_build_fill_fallback_when_word_absent():
    card = FakeCard(word="serendipity", meaning="duyên may", example="No match here.")
    f = build_fill(card)
    assert f["before"] == "" and f["after"] == ""
    assert f["answer"] == "serendipity"
    assert f["hint"] == "duyên may"
