import re


FILLER_WORDS = ["嗯", "啊", "呃", "然后", "就是", "那个", "这个", "其实", "怎么说"]
LOGIC_WORDS = ["首先", "其次", "第一", "第二", "第三", "然后", "接着", "因此", "所以", "最后", "总之"]
OPENING_WORDS = ["大家好", "各位老师", "各位同学", "今天我"]
ENDING_WORDS = ["谢谢大家", "我的演讲结束", "最后", "总之"]
TOPIC_WORDS = ["主题", "我想讲", "今天我演讲"]


def count_chinese_chars(text: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", text))


def count_words(text: str, words: list[str]) -> dict[str, int]:
    return {word: text.count(word) for word in words if text.count(word) > 0}


def analyze_text(text: str, duration: float | int | None, mock_mode: bool = False) -> dict:
    safe_duration = round(float(duration), 2) if duration else 120
    word_count = count_chinese_chars(text)
    rate_duration = 120 if mock_mode and safe_duration < 60 else safe_duration
    speech_rate = round(word_count / rate_duration * 60) if rate_duration > 0 else 0

    return {
        "text": text,
        "word_count": word_count,
        "duration": safe_duration,
        "speech_rate": speech_rate,
        "speech_rate_reliable": not mock_mode,
        "filler_words": count_words(text, FILLER_WORDS),
        "logic_words_count": sum(text.count(word) for word in LOGIC_WORDS),
        "has_opening": any(word in text for word in OPENING_WORDS),
        "has_ending": any(word in text for word in ENDING_WORDS),
        "has_topic": any(word in text for word in TOPIC_WORDS),
        "mock_mode": mock_mode,
    }
