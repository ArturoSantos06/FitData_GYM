from rest_framework import viewsets
from rest_framework import mixins
from .models import MembershipType, UserMembership
from .serializers import MembershipTypeSerializer, UserMembershipSerializer, UserSerializer
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticatedOrReadOnly

# ViewSet existente
class MembershipTypeViewSet(viewsets.ModelViewSet):
    """
    Un ViewSet para ver y editar los tipos de membresía (CRUD).
    """
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Protegemos el acceso

# ViewSet de asignación (el que acabas de crear)
class UserMembershipViewSet(viewsets.ModelViewSet):
    """
    Un ViewSet para asignar membresías a usuarios y ver el estado de la asignación.
    """
    queryset = UserMembership.objects.all()
    serializer_class = UserMembershipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Protegemos el acceso

# --- NUEVO VIEWSET: User (El que faltaba) ---
# --- VIEWSET: User (ACTUALIZADO) ---
class UserViewSet(viewsets.ModelViewSet): # <--- Ahora es ModelViewSet (Permite CRUD completo)
    """
    ViewSet para ver, crear y editar usuarios.
    """
    queryset = User.objects.all().order_by('-date_joined') # Ordenar por los más nuevos
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]