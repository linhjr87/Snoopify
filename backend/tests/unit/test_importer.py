import pytest

from app.services.importer import INVALID_MSG, parse_import


def test_parse_valid_uses_deck_key_and_filters_cards_without_word():
    data = {"deck": "Biz", "topic": "chủ đề",
            "cards": [{"word": "a", "meaning": "m"}, {"meaning": "no word"}]}
    parsed = parse_import(data)
    assert parsed.name == "Biz"
    assert parsed.topic == "chủ đề"
    assert len(parsed.cards) == 1
    assert parsed.cards[0].word == "a"


def test_parse_accepts_name_key_as_fallback():
    parsed = parse_import({"name": "X", "cards": [{"word": "a"}]})
    assert parsed.name == "X"


def test_parse_missing_name_raises():
    with pytest.raises(ValueError) as e:
        parse_import({"cards": [{"word": "a"}]})
    assert str(e.value) == INVALID_MSG


def test_parse_empty_cards_raises():
    with pytest.raises(ValueError):
        parse_import({"deck": "X", "cards": []})


def test_parse_all_cards_missing_word_raises():
    with pytest.raises(ValueError):
        parse_import({"deck": "X", "cards": [{"meaning": "m"}]})
