"""Utility helpers for talking to the Judge0 execution API."""
from __future__ import annotations

import json
import logging
import os
import ssl
import time
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - python-dotenv is optional
    load_dotenv = None

try:
    import certifi
except ImportError:  # pragma: no cover - certifi is optional
    certifi = None

logger = logging.getLogger(__name__)

if load_dotenv is not None:
    # Mirror the behaviour in ``core.ai`` so Judge0 helpers respect local ``.env``
    # configuration when running the Django development server.
    project_root = Path(__file__).resolve().parents[1]
    load_dotenv(project_root / ".env")

__all__ = [
    "Judge0Error",
    "execute_code",
    "get_supported_languages",
]


class Judge0Error(RuntimeError):
    """Raised when the Judge0 API reports an error."""


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _env_truthy(name: str) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes"}


BASE_URL = os.getenv("JUDGE0_API_URL", "https://judge0-ce.p.rapidapi.com").rstrip("/")
REQUEST_TIMEOUT = _env_float("JUDGE0_REQUEST_TIMEOUT", 10.0)
POLL_INTERVAL = _env_float("JUDGE0_POLL_INTERVAL", 0.75)
MAX_WAIT_SECONDS = _env_float("JUDGE0_MAX_WAIT_SECONDS", 20.0)
RAPIDAPI_HOST = os.getenv("JUDGE0_RAPIDAPI_HOST") or urllib_parse.urlparse(BASE_URL).netloc
RAPIDAPI_KEY = os.getenv("JUDGE0_RAPIDAPI_KEY")
DIRECT_API_KEY = os.getenv("JUDGE0_API_KEY")


def _build_ssl_context() -> ssl.SSLContext:
    disable_verify = _env_truthy("JUDGE0_DISABLE_SSL_VERIFY")
    context = ssl.create_default_context()

    if disable_verify:
        logger.warning(
            "Judge0 SSL verification is disabled via JUDGE0_DISABLE_SSL_VERIFY; "
            "this should only be used for local development."
        )
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return context

    ca_bundle_path = os.getenv("JUDGE0_CA_BUNDLE_PATH")
    if ca_bundle_path:
        try:
            context.load_verify_locations(cafile=ca_bundle_path)
            logger.debug("Loaded custom Judge0 CA bundle from %s", ca_bundle_path)
        except OSError as exc:
            logger.warning(
                "Failed to load Judge0 CA bundle '%s': %s", ca_bundle_path, exc
            )

    if certifi is not None:
        try:
            context.load_verify_locations(cafile=certifi.where())
            logger.debug("Loaded certifi CA bundle for Judge0 requests")
        except Exception as exc:  # pragma: no cover - defensive guard
            logger.warning("Unable to load certifi CA bundle: %s", exc)

    return context


_SSL_CONTEXT = _build_ssl_context()


def _default_headers() -> Dict[str, str]:
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if RAPIDAPI_KEY:
        headers.setdefault("X-RapidAPI-Key", RAPIDAPI_KEY)
        headers.setdefault("X-RapidAPI-Host", RAPIDAPI_HOST)
    if DIRECT_API_KEY:
        # Judge0 CE allows authenticating with X-Auth-Token when self-hosted.
        headers.setdefault("X-Auth-Token", DIRECT_API_KEY)
    return headers


LANGUAGE_DEFINITIONS: List[Mapping[str, object]] = [
    {
        "key": "python",
        "id": 71,
        "name": "Python (3.8.1)",
        "editor": "python",
        "aliases": ["py", "python3"],
    },
    {
        "key": "javascript",
        "id": 63,
        "name": "JavaScript (Node.js 12.14)",
        "editor": "javascript",
        "aliases": ["js", "node"],
    },
    {
        "key": "typescript",
        "id": 74,
        "name": "TypeScript (3.7.4)",
        "editor": "typescript",
        "aliases": ["ts"],
    },
    {
        "key": "c",
        "id": 50,
        "name": "C (GCC 9.2.0)",
        "editor": "c",
        "aliases": [],
    },
    {
        "key": "cpp",
        "id": 54,
        "name": "C++ (GCC 9.2.0)",
        "editor": "cpp",
        "aliases": ["c++"],
    },
    {
        "key": "java",
        "id": 62,
        "name": "Java (OpenJDK 13)",
        "editor": "java",
        "aliases": [],
    },
    {
        "key": "csharp",
        "id": 51,
        "name": "C# (Mono 6.6)",
        "editor": "csharp",
        "aliases": ["c#", "cs"],
    },
    {
        "key": "go",
        "id": 60,
        "name": "Go (1.13.5)",
        "editor": "go",
        "aliases": ["golang"],
    },
    {
        "key": "rust",
        "id": 73,
        "name": "Rust (1.40.0)",
        "editor": "rust",
        "aliases": [],
    },
    {
        "key": "ruby",
        "id": 72,
        "name": "Ruby (2.7.0)",
        "editor": "ruby",
        "aliases": [],
    },
    {
        "key": "php",
        "id": 68,
        "name": "PHP (7.4.1)",
        "editor": "php",
        "aliases": [],
    },
    {
        "key": "swift",
        "id": 83,
        "name": "Swift (5.2.3)",
        "editor": "swift",
        "aliases": [],
    },
    {
        "key": "kotlin",
        "id": 78,
        "name": "Kotlin (1.3.70)",
        "editor": "kotlin",
        "aliases": [],
    },
    {
        "key": "sql",
        "id": 82,
        "name": "SQL (SQLite 3.27)",
        "editor": "sql",
        "aliases": ["sqlite"],
    },
    {
        "key": "bash",
        "id": 46,
        "name": "Bash (5.0.0)",
        "editor": "shell",
        "aliases": ["sh", "shell"],
    },
]

_LANGUAGE_ALIAS_INDEX: Dict[str, Mapping[str, object]] = {}
for entry in LANGUAGE_DEFINITIONS:
    aliases: Iterable[str] = [entry["key"]] + list(entry.get("aliases", []))
    for alias in aliases:
        _LANGUAGE_ALIAS_INDEX[alias.lower()] = entry


def _resolve_language(language: str) -> Mapping[str, object]:
    entry = _LANGUAGE_ALIAS_INDEX.get(language.lower()) if language else None
    if not entry:
        raise ValueError(f"Unsupported language '{language}'.")
    return entry


def get_supported_languages() -> List[Mapping[str, object]]:
    """Return metadata about the languages configured for Judge0."""
    languages: List[Mapping[str, object]] = []
    for entry in LANGUAGE_DEFINITIONS:
        languages.append(
            {
                "key": entry["key"],
                "id": entry["id"],
                "name": entry["name"],
                "editor": entry.get("editor", "plaintext"),
                "aliases": list(entry.get("aliases", [])),
            }
        )
    return languages


def _perform_request(
    method: str,
    path: str,
    *,
    data: Optional[Mapping[str, object]] = None,
    query: Optional[Mapping[str, object]] = None,
) -> MutableMapping[str, object]:
    url = f"{BASE_URL}{path if path.startswith('/') else '/' + path}"
    if query:
        query_string = urllib_parse.urlencode(query)
        url = f"{url}?{query_string}"

    headers = _default_headers()
    payload: Optional[bytes] = None
    if data is not None:
        payload = json.dumps(data).encode("utf-8")

    req = urllib_request.Request(url, data=payload, method=method.upper(), headers=headers)

    try:
        with urllib_request.urlopen(
            req, timeout=REQUEST_TIMEOUT, context=_SSL_CONTEXT
        ) as response:
            content = response.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib_error.HTTPError as exc:
        try:
            error_content = exc.read().decode("utf-8")
        except Exception:
            error_content = ""
        message = error_content or exc.reason or f"HTTP {exc.code}"
        raise Judge0Error(f"Judge0 HTTP error {exc.code}: {message}") from None
    except urllib_error.URLError as exc:
        reason = exc.reason
        if isinstance(reason, ssl.SSLCertVerificationError):
            raise Judge0Error(
                "Judge0 SSL verification failed: "
                f"{reason}. Configure JUDGE0_CA_BUNDLE_PATH to trust your "
                "certificate authority or set JUDGE0_DISABLE_SSL_VERIFY=1 "
                "for local testing."
            ) from exc
        raise Judge0Error(f"Judge0 connection error: {reason}") from exc


_PENDING_STATUS_IDS = {1, 2}


def execute_code(
    language: str,
    source_code: str,
    *,
    stdin: str = "",
    command_line_arguments: Optional[str] = None,
    expected_output: Optional[str] = None,
) -> MutableMapping[str, object]:
    """Submit code to Judge0 and wait for the execution result."""

    if not source_code or not source_code.strip():
        raise ValueError("source_code must be provided.")

    language_entry = _resolve_language(language)

    submission_payload: Dict[str, object] = {
        "language_id": language_entry["id"],
        "source_code": source_code,
        "stdin": stdin or "",
    }
    if command_line_arguments:
        submission_payload["command_line_arguments"] = command_line_arguments
    if expected_output is not None:
        submission_payload["expected_output"] = expected_output

    submission = _perform_request(
        "POST",
        "/submissions",
        data=submission_payload,
        query={"base64_encoded": "false", "wait": "false"},
    )

    token = submission.get("token")
    if not token:
        raise Judge0Error("Judge0 did not return a submission token.")

    deadline = time.monotonic() + MAX_WAIT_SECONDS
    while True:
        result = _perform_request(
            "GET",
            f"/submissions/{token}",
            query={"base64_encoded": "false"},
        )
        status = result.get("status") or {}
        status_id = status.get("id")
        if status_id not in _PENDING_STATUS_IDS:
            break
        if time.monotonic() >= deadline:
            raise Judge0Error("Timed out while waiting for Judge0 to finish the submission.")
        time.sleep(POLL_INTERVAL)

    return {
        "token": token,
        "language": language_entry["key"],
        "language_id": language_entry["id"],
        "language_name": language_entry["name"],
        "status": result.get("status"),
        "stdout": result.get("stdout") or "",
        "stderr": result.get("stderr") or "",
        "compile_output": result.get("compile_output") or "",
        "message": result.get("message") or "",
        "time": result.get("time"),
        "memory": result.get("memory"),
        "exit_code": result.get("exit_code"),
    }
