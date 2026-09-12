"""The set of languages students may submit in.

A curated "popular contest languages" set (5), not the full 60+ language
catalog Judge0 CE exposes - keeps the editor dropdown, per-language
starter templates, and testing surface manageable for a college coding
contest. `judge0_id` values are Judge0 CE's stable, long-standing IDs -
matching the public `ce.judge0.com` demo instance this app defaults to.

JudgeService/SyncJudgeService (app/services/judge_service.py) already
accept an optional `language_id` constructor argument - this registry is
just the lookup table every call site uses to pick the right one, instead
of always falling back to settings.judge0_c_language_id (C).
"""

from enum import Enum

from pydantic import BaseModel


class SupportedLanguage(str, Enum):
    C = "c"
    CPP = "cpp"
    JAVA = "java"
    PYTHON3 = "python3"
    JAVASCRIPT = "javascript"


class LanguageInfo(BaseModel):
    id: SupportedLanguage
    judge0_id: int
    display_name: str
    # Monaco's built-in language id for syntax highlighting - NOT always
    # the same as `id` (Python's Monaco id is "python", not "python3").
    monaco_id: str


LANGUAGES: dict[SupportedLanguage, LanguageInfo] = {
    SupportedLanguage.C: LanguageInfo(
        id=SupportedLanguage.C, judge0_id=50, display_name="C", monaco_id="c"
    ),
    SupportedLanguage.CPP: LanguageInfo(
        id=SupportedLanguage.CPP, judge0_id=54, display_name="C++", monaco_id="cpp"
    ),
    SupportedLanguage.JAVA: LanguageInfo(
        id=SupportedLanguage.JAVA, judge0_id=62, display_name="Java", monaco_id="java"
    ),
    SupportedLanguage.PYTHON3: LanguageInfo(
        id=SupportedLanguage.PYTHON3, judge0_id=71, display_name="Python 3", monaco_id="python"
    ),
    SupportedLanguage.JAVASCRIPT: LanguageInfo(
        id=SupportedLanguage.JAVASCRIPT,
        judge0_id=63,
        display_name="JavaScript (Node.js)",
        monaco_id="javascript",
    ),
}

DEFAULT_LANGUAGE = SupportedLanguage.C
