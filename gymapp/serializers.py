from rest_framework import serializers
from .models import MembershipType, UserMembership
from django.contrib.auth.models import User 
from django.utils import timezone
from .models import Producto, Venta

# Serializer existente
class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ['id', 'name', 'price', 'duration_days']


# Serializer de asignación de membresía
class UserMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    membership_name = serializers.ReadOnlyField(source='membership_type.name')
    
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = UserMembership
        fields = ['id', 'user', 'user_name', 'membership_type', 'membership_name', 'start_date', 'end_date', 'is_active']
        read_only_fields = ['end_date', 'start_date']

    def get_is_active(self, obj):
        today = timezone.now().date()
        if obj.end_date and obj.end_date < today:
            return False
        return True


# --- SERIALIZER: User (ACTUALIZADO) ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Añadimos 'password' a los campos
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password']
        # Configuramos password para que se pueda escribir pero NO leer (por seguridad)
        extra_kwargs = {'password': {'write_only': True}}

    # Sobrescribimos el método create para encriptar la contraseña
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'

# En gymapp/serializers.py

class VentaSerializer(serializers.ModelSerializer):
    # Campo existente
    cliente_username = serializers.ReadOnlyField(source='cliente.username')
    
    # --- NUEVO: Nombre Completo ---
    cliente_nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        # Agregamos 'folio' y 'cliente_nombre_completo' a la lista
        fields = ['id', 'folio', 'cliente', 'cliente_username', 'cliente_nombre_completo', 'fecha', 'total', 'metodo_pago', 'detalle_productos']

    # Lógica para obtener el nombre completo
    def get_cliente_nombre_completo(self, obj):
        if obj.cliente:
            nombre = f"{obj.cliente.first_name} {obj.cliente.last_name}".strip()
            # Si el usuario no tiene nombre registrado, devolvemos el usuario
            return nombre if nombre else obj.cliente.username
        return "Público General"