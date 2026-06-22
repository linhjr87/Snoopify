from dataclasses import dataclass

from app.enums import Rating

# Grade -> SM-2 quality (0..5). forgot is a lapse (q < 3).
QUALITY: dict[Rating, int] = {Rating.forgot: 2, Rating.vague: 3, Rating.remember: 5}

LEARNING_INTERVAL_CEILING = 21  # days; >= this means "proficient"


@dataclass
class Schedule:
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int


def review(sched: Schedule, rating: Rating) -> Schedule:
    q = QUALITY[rating]
    ease = sched.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease = max(1.3, ease)

    if q < 3:
        return Schedule(ease_factor=ease, interval_days=1, repetitions=0, lapses=sched.lapses + 1)

    if sched.repetitions == 0:
        interval = 1
    elif sched.repetitions == 1:
        interval = 6
    else:
        interval = round(sched.interval_days * ease)

    return Schedule(
        ease_factor=ease,
        interval_days=interval,
        repetitions=sched.repetitions + 1,
        lapses=sched.lapses,
    )


def mastery(repetitions: int, interval_days: int) -> str:
    if repetitions == 0:
        return "new"
    if interval_days < LEARNING_INTERVAL_CEILING:
        return "learning"
    return "proficient"
