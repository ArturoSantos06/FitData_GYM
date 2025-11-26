from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from rest_framework.authtoken import views
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve  # <--- Importar serve para producción

# 1. Rutas principales de Django y API
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('gymapp.urls')),
    
    # Ruta para Login (Token)
    path('api-token-auth/', views.obtain_auth_token),
    
    # 2. Servir archivos media en producción (Render)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# 3. Configuración para servir Imágenes en Desarrollo (Media)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# 4. Ruta Catch-all para React
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='base.html')),
]