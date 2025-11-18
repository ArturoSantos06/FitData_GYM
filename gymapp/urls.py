from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MembershipTypeViewSet, UserMembershipViewSet, UserViewSet # Importar el nuevo ViewSet

# Crea un router y registra los ViewSets
router = DefaultRouter()
# Endpoint existente para tipos de membresía
router.register(r'memberships', MembershipTypeViewSet, basename='membershiptype')
# NUEVO Endpoint para asignar membresías
router.register(r'user-memberships', UserMembershipViewSet, basename='user-membership')
router.register(r'users', UserViewSet, basename='user')

# Las URLs del API son determinadas automáticamente por el router
urlpatterns = [
    path('', include(router.urls)),
]