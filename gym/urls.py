from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from rest_framework.authtoken import views # <--- IMPORTA ESTO

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('gymapp.urls')),
    
    # --- NUEVA RUTA PARA LOGIN ---
    path('api-token-auth/', views.obtain_auth_token), 
    
    re_path(r'^.*$', TemplateView.as_view(template_name='base.html')),
]