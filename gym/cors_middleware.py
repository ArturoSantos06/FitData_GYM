"""
Middleware personalizado para CORS
Asegura que CORS funcione correctamente en todas las solicitudes
"""
import os

class CustomCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Orígenes permitidos
        self.allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://pruebafitdatagym.netlify.app",
            "https://fit-data-gym.vercel.app",
        ]

    def __call__(self, request):
        # Obtener origen de la solicitud
        origin = request.META.get('HTTP_ORIGIN', '')

        # Si DEBUG está activo, permitir cualquier origen
        if os.environ.get('DEBUG', 'True') == 'True':
            response = self.get_response(request)
            response['Access-Control-Allow-Origin'] = origin or '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '3600'
            return response

        # En producción, solo permitir orígenes específicos
        if origin in self.allowed_origins:
            response = self.get_response(request)
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '3600'
            return response

        # Manejar preflight requests
        if request.method == 'OPTIONS':
            response = self.get_response(request)
            if origin in self.allowed_origins:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
                response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response['Access-Control-Allow-Credentials'] = 'true'
            return response

        return self.get_response(request)
