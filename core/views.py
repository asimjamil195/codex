from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai import ask_codex
from .judge0 import Judge0Error, execute_code, get_supported_languages

class CurriculumView(APIView):
    def post(self, request):
        topic = request.data.get("topic", "Python basics")
        prompt = f"Design a simple 3-level learning curriculum for {topic} with beginner, intermediate, and advanced lessons."
        curriculum = ask_codex(prompt)
        return Response({"curriculum": curriculum})

class LessonView(APIView):
    def post(self, request):
        concept = request.data.get("concept", "variables in Python")
        prompt = f"Explain {concept} in simple terms with one example and one short practice exercise."
        lesson = ask_codex(prompt)
        return Response({"lesson": lesson})

class FeedbackView(APIView):
    def post(self, request):
        topic = request.data.get("topic", "Python")
        code = request.data.get("code", "")
        prompt = f"Review this {topic} code:\n{code}\nCheck correctness, give feedback, and suggest improvements."
        feedback = ask_codex(prompt)
        return Response({"feedback": feedback})


class CodeExecutionView(APIView):
    """Proxy code execution requests to Judge0."""

    def get(self, request):
        return Response({"languages": get_supported_languages()})

    def post(self, request):
        language = request.data.get("language")
        source_code = request.data.get("source_code", "")
        stdin = request.data.get("stdin", "")
        cli_args = request.data.get("command_line_arguments")
        expected_output = request.data.get("expected_output")

        if not language:
            return Response(
                {"error": "language is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = execute_code(
                language,
                source_code,
                stdin=stdin,
                command_line_arguments=cli_args,
                expected_output=expected_output,
            )
            return Response(result)
        except ValueError as exc:  # missing or unsupported parameters
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Judge0Error as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
