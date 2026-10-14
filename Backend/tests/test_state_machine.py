import pytest

from app.domains.interviews.state_machine import ALLOWED_TRANSITIONS, InvalidTransition, transition
from app.models.entities import InterviewStatus


def test_happy_path_transitions() -> None:
    assert transition(InterviewStatus.CREATED, InterviewStatus.ACTIVE) == InterviewStatus.ACTIVE
    assert (
        transition(InterviewStatus.ACTIVE, InterviewStatus.EVALUATING) == InterviewStatus.EVALUATING
    )
    assert (
        transition(InterviewStatus.EVALUATING, InterviewStatus.COMPLETED)
        == InterviewStatus.COMPLETED
    )


@pytest.mark.parametrize(
    "terminal", [InterviewStatus.COMPLETED, InterviewStatus.ABANDONED, InterviewStatus.FAILED]
)
def test_terminal_states_cannot_transition(terminal: InterviewStatus) -> None:
    assert ALLOWED_TRANSITIONS[terminal] == frozenset()
    with pytest.raises(InvalidTransition):
        transition(terminal, InterviewStatus.ACTIVE)


def test_skipping_a_state_is_rejected() -> None:
    with pytest.raises(InvalidTransition, match="created"):
        transition(InterviewStatus.CREATED, InterviewStatus.COMPLETED)
