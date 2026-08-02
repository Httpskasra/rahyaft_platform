import os
from typing import Any

import aiohttp

from llm.json_parser import extract_json_object


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = os.getenv(
            "OLLAMA_BASE_URL",
            "http://localhost:11434",
        ).rstrip("/")
        self.model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str = "You are a JSON-only assistant. Return only valid JSON.",
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/chat"

        payload = {
            "model": self.model,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
            },
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        }

        timeout = aiohttp.ClientTimeout(total=self.timeout)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as response:
                text = await response.text()

                if response.status >= 400:
                    raise RuntimeError(f"Ollama error {response.status}: {text}")

                data = await response.json()
                content = data.get("message", {}).get("content")

                if not content:
                    raise RuntimeError("Ollama returned empty content")

                return extract_json_object(content)