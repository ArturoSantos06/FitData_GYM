from rest_framework import viewsets, mixins
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.contrib.auth.models import User

# Importar modelos y serializers
from .models import MembershipType, UserMembership, Producto, Venta
from .serializers import (
    MembershipTypeSerializer, 
    UserMembershipSerializer, 
    UserSerializer, 
    ProductoSerializer, 
    VentaSerializer
)

# --- 1. MEMBRESÍAS ---
class MembershipTypeViewSet(viewsets.ModelViewSet):
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class UserMembershipViewSet(viewsets.ModelViewSet):
    queryset = UserMembership.objects.all()
    serializer_class = UserMembershipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# --- 2. USUARIOS ---
class UserViewSet(mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# --- 3. PRODUCTOS ---
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# --- 4. VENTAS (HISTORIAL) - ¡ESTA ES LA QUE FALTABA! ---
class VentaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver el historial de ventas. Solo lectura.
    """
    queryset = Venta.objects.all().order_by('-fecha')
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]

# --- 5. LÓGICA DE VENTA (RESTA STOCK) ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_venta(request):
    data = request.data
    try:
        with transaction.atomic():
            # Crear la venta
            nueva_venta = Venta.objects.create(
                cliente_id=data.get('cliente_id'),
                total=data['total'],
                metodo_pago=data['metodo_pago'],
                detalle_productos=str(data['productos'])
            )

            # Restar Stock
            for item in data['productos']:
                try:
                    prod_db = Producto.objects.get(id=item['id'])
                    if prod_db.stock < item['cantidad']:
                        raise Exception(f"Stock insuficiente para {prod_db.nombre}")
                    
                    prod_db.stock -= item['cantidad']
                    prod_db.save()
                except Producto.DoesNotExist:
                     raise Exception(f"Producto con ID {item['id']} no encontrado")

            return Response({'status': 'success', 'venta_id': nueva_venta.id}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)