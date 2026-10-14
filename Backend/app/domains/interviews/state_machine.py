from app.models.entities import InterviewStatus


class InvalidTransition(ValueError):
    pass


ALLOWED_TRANSITIONS: dict[InterviewStatus, frozenset[InterviewStatus]] = {
    InterviewStatus.CREATED: frozenset({InterviewStatus.ACTIVE, InterviewStatus.ABANDONED}),
    InterviewStatus.ACTIVE: frozenset(
        {InterviewStatus.EVALUATING, InterviewStatus.ABANDONED, InterviewStatus.FAILED}
    ),
    InterviewStatus.EVALUATING: frozenset({InterviewStatus.COMPLETED, InterviewStatus.FAILED}),
    InterviewStatus.COMPLETED: frozenset(),
    InterviewStatus.ABANDONED: frozenset(),
    InterviewStatus.FAILED: frozenset(),
}


def transition(current: InterviewStatus, target: InterviewStatus) -> InterviewStatus:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise InvalidTransition(f"cannot transition from {current.value} to {target.value}")
    return target
