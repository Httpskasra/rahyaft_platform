import sys
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from llm.avalai_json import generate_customer_json


def completion(content, finish="stop"):
    return NS(id="test", choices=[NS(
        message=NS(content=content, refusal=None), finish_reason=finish,
    )])


class AvalaiJsonTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.create = AsyncMock()
        self.client = NS(chat=NS(completions=NS(create=self.create)),
                         responses=NS(create=self.create))

    async def generate(self, style="chat_completions"):
        return await generate_customer_json(
            self.client, model="test-model", api_style=style,
            prompt="Customer JSON", max_tokens=8192,
        )

    async def test_requests_json_and_explicit_budget(self):
        self.create.return_value = completion('{"summary":"ok"}')
        self.assertEqual(await self.generate(), {"summary": "ok"})
        args = self.create.call_args.kwargs
        self.assertEqual(args["response_format"], {"type": "json_object"})
        self.assertEqual(args["max_tokens"], 8192)
        self.assertEqual(self.create.await_count, 1)

    async def test_empty_content_retries_once(self):
        self.create.side_effect = [completion(None), completion('{"summary":"ok"}')]
        self.assertEqual(await self.generate(), {"summary": "ok"})
        self.assertEqual(self.create.await_count, 2)

    async def test_reasoning_only_is_not_saved(self):
        self.create.return_value = completion("analysis: We need to produce JSON")
        with self.assertRaisesRegex(ValueError, "after 2 attempts"):
            await self.generate()
        self.assertEqual(self.create.await_count, 2)

    async def test_length_is_rejected_even_with_parseable_json(self):
        self.create.return_value = completion('{"summary":"partial"}', "length")
        with self.assertRaisesRegex(ValueError, "finish=length"):
            await self.generate()

    async def test_empty_object_is_not_a_success(self):
        self.create.return_value = completion('{}')
        with self.assertRaisesRegex(ValueError, "missing summary"):
            await self.generate()

    async def test_missing_choices_is_actionable(self):
        self.create.return_value = NS(id="test", choices=[])
        with self.assertRaisesRegex(ValueError, "no_choices"):
            await self.generate()

    async def test_responses_format_and_incomplete_detection(self):
        self.create.side_effect = [
            NS(id="test", output_text='', status="incomplete",
               incomplete_details=NS(reason="max_output_tokens")),
            NS(id="test2", output_text='{"summary":"ok"}', status="completed"),
        ]
        self.assertEqual(await self.generate("responses"), {"summary": "ok"})
        args = self.create.call_args.kwargs
        self.assertEqual(args["max_output_tokens"], 8192)
        self.assertEqual(args["text"], {"format": {"type": "json_object"}})

    async def test_transport_error_is_not_retried_by_json_validation(self):
        self.create.side_effect = RuntimeError("unauthorized")
        with self.assertRaisesRegex(RuntimeError, "unauthorized"):
            await self.generate()
        self.assertEqual(self.create.await_count, 1)


if __name__ == "__main__":
    unittest.main()
