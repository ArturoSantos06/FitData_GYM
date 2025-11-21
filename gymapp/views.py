import os # <--- 1. IMPORTAMOS OS PARA LEER EL ENTORNO
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

# --- LÓGICA INTELIGENTE ---
# Detectamos si estamos en Render
ESTOY_EN_LA_NUBE = 'RENDER' in os.environ

# Definimos la clase "Padre":
# Si estamos en la nube -> Solo Lectura (ReadOnlyModelViewSet)
# Si estamos en local -> Control Total (ModelViewSet)
if ESTOY_EN_LA_NUBE:
    BaseViewSet = viewsets.ReadOnlyModelViewSet
    print("🔒 MODO NUBE: Escritura BLOQUEADA")
else:
    BaseViewSet = viewsets.ModelViewSet
    print("🔓 MODO LOCAL: Escritura PERMITIDA")

# ---------------------------------------------------
# AHORA TODOS HEREDAN DE 'BaseViewSet' (El camaleón)
# ---------------------------------------------------

class MembershipTypeViewSet(BaseViewSet):
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class UserMembershipViewSet(BaseViewSet):
    queryset = UserMembership.objects.all()
    serializer_class = UserMembershipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class UserViewSet(BaseViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ProductoViewSet(BaseViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# Ventas siempre es mejor que sea solo lectura el historial, 
# pero si quieres borrar en local, usa BaseViewSet
class VentaViewSet(BaseViewSet):
    queryset = Venta.objects.all().order_by('-fecha')
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]

# --- LÓGICA DE VENTA (Función Especial) ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_venta(request):
    
    # 1. BLOQUEO INTELIGENTE
    if ESTOY_EN_LA_NUBE:
        return Response(
            {'error': 'Modo Demo: Las ventas están deshabilitadas en la versión pública.'}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Lógica Normal (Solo se ejecuta en Local)
    data = request.data
    try:
        with transaction.atomic():
            nueva_venta = Venta.objects.create(
                cliente_id=data.get('cliente_id'),
                total=data['total'],
                metodo_pago=data['metodo_pago'],
                detalle_productos=str(data['productos'])
            )

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