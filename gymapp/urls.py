from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MembershipTypeViewSet, 
    UserMembershipViewSet, 
    UserViewSet, 
    ProductoViewSet, 
    VentaViewSet,
    crear_venta,
    register_user_with_membership ,
    EntradaInventarioViewSet
)

# 1. Configuración del Router (Rutas automáticas CRUD)
router = DefaultRouter()
router.register(r'memberships', MembershipTypeViewSet, basename='membershiptype')
router.register(r'user-memberships', UserMembershipViewSet, basename='user-membership')
router.register(r'users', UserViewSet, basename='user')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'inventario-entradas', EntradaInventarioViewSet, basename='inventario-entrada') 

# 2. Lista de URLs Unificada
urlpatterns = [
    # --- Rutas Manuales (Funciones específicas) ---
    
    # 1. Procesar Venta (Punto de Venta)
    path('crear-venta/', crear_venta, name='crear-venta'),
    
    # 2. Registrar Usuario y Asignar Membresía en un paso
    path('users/register-with-membership/', register_user_with_membership, name='register-with-membership'),
    
    # --- Rutas Automáticas del Router ---
    path('', include(router.urls)),
]