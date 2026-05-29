import json
import os
import re
import urllib.request


def deepseek_enabled() -> bool:
    return bool(os.getenv("DEEPSEEK_API_KEY"))


def extract_json_object(content: str) -> dict:
    match = re.search(r"\{[\s\S]*\}", content.strip())
    if not match:
        raise ValueError("DeepSeek 未返回 JSON")
    return json.loads(match.group(0))


def call_deepseek_json(
    prompt: str,
    max_tokens: int = 1200,
    model: str | None = None,
    temperature: float = 0.1,
) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("未配置 DEEPSEEK_API_KEY")

    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    timeout = int(os.getenv("DEEPSEEK_TIMEOUT", "20"))
    body = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": "你只输出合法 JSON，不输出解释。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))

    content = payload["choices"][0]["message"]["content"]
    return extract_json_object(content)
