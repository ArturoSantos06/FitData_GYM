from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MembershipTypeViewSet, 
    UserMembershipViewSet, 
    UserViewSet, 
    ProductoViewSet, 
    VentaViewSet,
    crear_venta
)

# 1. Configuración del Router
router = DefaultRouter()
router.register(r'memberships', MembershipTypeViewSet, basename='membershiptype')
router.register(r'user-memberships', UserMembershipViewSet, basename='user-membership')
router.register(r'users', UserViewSet, basename='user')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'ventas', VentaViewSet, basename='venta') 

# 2. Lista de URLs Unificada
urlpatterns = [
    # Rutas manuales
    path('crear-venta/', crear_venta, name='crear-venta'),
    
    # Rutas automáticas del Router
    path('', include(router.urls)),
]