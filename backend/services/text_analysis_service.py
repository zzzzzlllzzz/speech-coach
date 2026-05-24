import re


FILLER_WORDS = ["嗯", "啊", "呃", "然后", "就是", "那个", "这个", "其实", "怎么说"]
ENGLISH_FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically"]
LOGIC_WORDS = ["首先", "其次", "第一", "第二", "第三", "然后", "接着", "因此", "所以", "最后", "总之"]
ENGLISH_LOGIC_WORDS = ["first", "second", "third", "then", "next", "therefore", "so", "finally", "in conclusion"]
OPENING_WORDS = ["大家好", "各位老师", "各位同学", "今天我", "hello", "good morning", "good afternoon", "today"]
ENDING_WORDS = ["谢谢大家", "我的演讲结束", "最后", "总之", "thank you", "finally", "in conclusion"]
TOPIC_WORDS = ["主题", "我想讲", "今天我演讲", "topic", "talk about", "speech is about"]


def normalize_transcript_text(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""

    replacements = {
        "，。": "。",
        "。。": "。",
        "，，": "，",
        "！。": "！",
        "？。": "？",
        ".": "。",
        ",": "，",
        "?": "？",
        "!": "！",
        ";": "；",
        ":": "：",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    text = re.sub(r"[。！？；]{2,}", "。", text)
    text = re.sub(r"[，、]{2,}", "，", text)
    text = re.sub(r"^(嗯|啊|呃|额|那个|这个|就是|其实)[，、。\s]+", "", text)

    for connector in ["首先", "其次", "然后", "接着", "因此", "所以", "最后", "总之"]:
        text = re.sub(rf"(?<![，。！？；])({connector})(?![，。！？；])", r"\1，", text)

    return text.strip(" ，、。")


def _sentence_end(sentence: str) -> str:
    sentence = sentence.strip(" ，、。")
    if not sentence:
        return ""
    if sentence.endswith(("。", "！", "？")):
        return sentence
    if any(word in sentence for word in ["吗", "是不是", "能不能", "为什么", "怎么"]):
        return f"{sentence}？"
    return f"{sentence}。"


def polish_transcript_text(text: str) -> str:
    """Create a readable transcript without inventing content."""
    text = normalize_transcript_text(text)
    if not text:
        return ""

    if count_chinese_chars(text) >= count_english_words(text):
        parts = [part.strip() for part in re.split(r"([。！？；])", text) if part.strip()]
        sentences: list[str] = []
        buffer = ""

        for part in parts:
            if part in "。！？；":
                if buffer:
                    sentences.append(_sentence_end(buffer))
                    buffer = ""
                continue

            clean = re.sub(r"^(嗯|啊|呃|额|那个|这个|就是|其实)[，、\s]*", "", part).strip()
            if not clean:
                continue

            chinese_len = count_chinese_chars(clean)
            if chinese_len <= 5 and sentences:
                sentences[-1] = _sentence_end(sentences[-1].rstrip("。！？") + "，" + clean)
                continue
            if chinese_len <= 5:
                buffer = f"{buffer}，{clean}".strip("，") if buffer else clean
                continue

            if buffer:
                clean = f"{buffer}，{clean}"
                buffer = ""
            sentences.append(_sentence_end(clean))

        if buffer:
            sentences.append(_sentence_end(buffer))

        polished = "".join(sentences)
        polished = re.sub(r"([。！？])([^。！？\n])", r"\1\2", polished)
        return polished.strip()

    english = text.replace("。", ". ").replace("？", "? ").replace("！", "! ")
    english = re.sub(r"\s+", " ", english).strip()
    if english and english[-1] not in ".!?":
        english += "."
    return english


def count_chinese_chars(text: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", text))


def count_english_words(text: str) -> int:
    return len(re.findall(r"\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b", text))


def count_words(text: str, words: list[str]) -> dict[str, int]:
    return {word: text.count(word) for word in words if text.count(word) > 0}


def count_english_terms(text: str, words: list[str]) -> dict[str, int]:
    lower_text = text.lower()
    counts = {}
    for word in words:
        pattern = r"\b" + re.escape(word.lower()) + r"\b"
        count = len(re.findall(pattern, lower_text))
        if count > 0:
            counts[word] = count
    return counts


def analyze_text(text: str, duration: float | int | None, mock_mode: bool = False) -> dict:
    raw_text = text or ""
    polished_text = polish_transcript_text(raw_text)
    safe_duration = round(float(duration), 2) if duration else 120
    analysis_text = polished_text or raw_text
    chinese_count = count_chinese_chars(analysis_text)
    english_count = count_english_words(analysis_text)
    word_count = chinese_count or english_count
    rate_duration = 120 if mock_mode and safe_duration < 60 else safe_duration
    speech_rate = round(word_count / rate_duration * 60) if rate_duration > 0 else 0
    lower_text = analysis_text.lower()
    raw_lower_text = raw_text.lower()
    filler_words = count_words(raw_text, FILLER_WORDS)
    filler_words.update(count_english_terms(raw_text, ENGLISH_FILLER_WORDS))

    return {
        "text": analysis_text,
        "raw_text": raw_text,
        "word_count": word_count,
        "duration": safe_duration,
        "speech_rate": speech_rate,
        "speech_rate_reliable": not mock_mode,
        "filler_words": filler_words,
        "logic_words_count": sum(analysis_text.count(word) for word in LOGIC_WORDS)
        + sum(len(re.findall(r"\b" + re.escape(word) + r"\b", lower_text)) for word in ENGLISH_LOGIC_WORDS),
        "has_opening": any(word in analysis_text for word in OPENING_WORDS)
        or any(word in lower_text for word in OPENING_WORDS),
        "has_ending": any(word in analysis_text for word in ENDING_WORDS)
        or any(word in lower_text for word in ENDING_WORDS),
        "has_topic": any(word in analysis_text for word in TOPIC_WORDS)
        or any(word in lower_text for word in TOPIC_WORDS)
        or any(word in raw_lower_text for word in TOPIC_WORDS),
        "mock_mode": mock_mode,
    }
