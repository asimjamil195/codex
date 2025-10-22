from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from .ai import ask_codex

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
