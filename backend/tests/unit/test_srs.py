from app.enums import Rating
from app.services.srs import Schedule, mastery, review

NEW = Schedule(ease_factor=2.5, interval_days=0, repetitions=0, lapses=0)


def test_first_remember_sets_interval_1_and_reps_1():
    out = review(NEW, Rating.remember)
    assert out.interval_days == 1
    assert out.repetitions == 1
    assert round(out.ease_factor, 2) == 2.6  # +0.1 for q=5


def test_second_remember_sets_interval_6():
    after_first = review(NEW, Rating.remember)
    out = review(after_first, Rating.remember)
    assert out.interval_days == 6
    assert out.repetitions == 2


def test_third_remember_multiplies_by_ease():
    s = Schedule(ease_factor=2.5, interval_days=6, repetitions=2, lapses=0)
    out = review(s, Rating.remember)
    assert out.interval_days == round(6 * out.ease_factor)
    assert out.repetitions == 3


def test_forgot_resets_reps_interval_and_increments_lapses():
    s = Schedule(ease_factor=2.5, interval_days=30, repetitions=5, lapses=1)
    out = review(s, Rating.forgot)
    assert out.repetitions == 0
    assert out.interval_days == 1
    assert out.lapses == 2
    assert out.ease_factor < 2.5  # q=2 lowers ease


def test_ease_never_below_1_3():
    s = Schedule(ease_factor=1.3, interval_days=1, repetitions=0, lapses=0)
    out = review(s, Rating.forgot)
    assert out.ease_factor >= 1.3


def test_vague_grows_reps_but_lowers_ease():
    out = review(NEW, Rating.vague)
    assert out.repetitions == 1
    assert out.interval_days == 1
    assert out.ease_factor < 2.5  # q=3 -> -0.14


def test_mastery_buckets():
    assert mastery(0, 0) == "new"
    assert mastery(1, 6) == "learning"
    assert mastery(3, 20) == "learning"
    assert mastery(3, 21) == "proficient"
