"""
Middleware personalizado para CORS - Garantiza CORS funcione en todas partes
"""
import os
from django.http import HttpResponse


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://pruebafitdatagym.netlify.app",
            "https://fit-data-gym.vercel.app",
        ]

    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')
        
        # Manejar OPTIONS (preflight) PRIMERO
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response['Access-Control-Allow-Origin'] = origin or '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
            return response
        
        # Obtener respuesta de la vista
        try:
            response = self.get_response(request)
        except Exception as e:
            # Si hay error, devolver respuesta con headers CORS igualmente
            response = HttpResponse(str(e), status=500)
        
        # SIEMPRE añadir headers CORS a la respuesta
        response['Access-Control-Allow-Origin'] = origin or '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        return response
