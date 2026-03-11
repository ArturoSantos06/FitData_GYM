from rest_framework import serializers
from .models import MembershipType, UserMembership
from django.contrib.auth.models import User 
from django.utils import timezone
from .models import Producto, Venta
from .models import EntradaInventario

# Serializer existente
class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        # AGREGAMOS 'image' A LA LISTA
        fields = ['id', 'name', 'price', 'duration_days', 'image']


# Serializer de asignación de membresía
class UserMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    # NUEVO CAMPO: Nombre completo
    user_full_name = serializers.SerializerMethodField()
    # NUEVO CAMPO: Email del usuario
    user_email = serializers.ReadOnlyField(source='user.email')
    
    membership_name = serializers.ReadOnlyField(source='membership_type.name')
    # Incluir objeto completo del tipo de membresía
    tipo = MembershipTypeSerializer(source='membership_type', read_only=True)
    
    # Campo calculado de activo/vencido
    is_active = serializers.SerializerMethodField()
    # Tiempo restante de la membresía
    time_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = UserMembership
        fields = ['id', 'user', 'user_name', 'user_full_name', 'user_email', 'membership_type', 'membership_name', 'tipo', 'start_date', 'end_date', 'is_active', 'time_remaining']
        read_only_fields = ['end_date', 'start_date']

    # Función para calcular el estado (ya la tenías)
    def get_is_active(self, obj):
        today = timezone.now().date()
        if obj.end_date and obj.end_date < today:
            return False
        return True
    
    def get_time_remaining(self, obj):
        """Obtiene el tiempo restante de la membresía"""
        return obj.get_time_remaining()

    def get_user_full_name(self, obj):
        # Junta nombre y apellido, y quita espacios si están vacíos
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class UserSerializer(serializers.ModelSerializer):
    is_staff = serializers.ReadOnlyField()
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_staff']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        # 1. Validar Nombre de Usuario (Username)
        username = data.get('username')
        # Si es creación (no hay instancia) y existe el username
        if not self.instance and username:
            if User.objects.filter(username=username).exists():
                raise serializers.ValidationError({"username": ["Este nombre de usuario ya está ocupado."]})

        # 2. Validar Correo Electrónico (¡AQUÍ ESTÁ LA CLAVE!)
        email = data.get('email', '').strip()
        if email:
            # Buscamos si existe algún usuario con este correo
            user_query = User.objects.filter(email__iexact=email)
            
            # Si estamos editando, excluimos al usuario actual de la búsqueda
            if self.instance:
                user_query = user_query.exclude(pk=self.instance.pk)
            
            if user_query.exists():
                # Usamos la clave estándar 'email' para que sea más fácil o 'email_error' si prefieres
                raise serializers.ValidationError({"email_error": [f"El correo '{email}' ya está registrado en el sistema."]})

        # 3. Validar Nombre Completo
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()

        if first_name and last_name:
            name_query = User.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name)
            
            if self.instance:
                name_query = name_query.exclude(pk=self.instance.pk)

            if name_query.exists():
                raise serializers.ValidationError({"fullname_error": [f"Ya existe un cliente registrado como '{first_name} {last_name}'."]})
        
        return data

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
    

class EntradaInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = EntradaInventario
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'fecha', 'usuario', 'usuario_nombre']


# --- SERIALIZERS DE JOELY: PORTAL DE CLIENTES ---

from .models import Miembro, Pago, Asistencia, HealthProfile

class MiembroSerializer(serializers.ModelSerializer):
    """Serializer para miembros/clientes"""
    esta_activo = serializers.SerializerMethodField()
    
    class Meta:
        model = Miembro
        fields = '__all__'
        read_only_fields = ['qr_code']
    
    def get_esta_activo(self, obj):
        """Verifica si la membresía está vigente"""
        if obj.fecha_vencimiento:
            return obj.fecha_vencimiento >= timezone.now().date()
        return False


class PagoSerializer(serializers.ModelSerializer):
    """Serializer para pagos de membresías"""
    miembro_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Pago
        fields = ['id', 'miembro', 'miembro_nombre', 'monto', 'fecha_pago', 'metodo', 'concepto']
    
    def get_miembro_nombre(self, obj):
        return f"{obj.miembro.nombre} {obj.miembro.apellido}"


class AsistenciaSerializer(serializers.ModelSerializer):
    """Serializer para check-in/check-out"""
    miembro_nombre = serializers.SerializerMethodField()
    miembro_avatar_color = serializers.SerializerMethodField()
    tiempo_en_gym = serializers.ReadOnlyField()
    
    class Meta:
        model = Asistencia
        fields = ['id', 'miembro', 'miembro_nombre', 'miembro_avatar_color', 'fecha_hora_entrada', 'fecha_hora_salida', 'acceso_permitido', 'observacion', 'tiempo_en_gym']
        read_only_fields = ['acceso_permitido', 'observacion', 'tiempo_en_gym']
    
    def get_miembro_nombre(self, obj):
        return f"{obj.miembro.nombre} {obj.miembro.apellido}"
    
    def get_miembro_avatar_color(self, obj):
        return obj.miembro.avatar_color or '#1D4ED8'

class HealthProfileSerializer(serializers.ModelSerializer):
    miembro_nombre = serializers.SerializerMethodField()
    miembro = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = HealthProfile
        fields = ['id','miembro','miembro_nombre','edad','condicion_corazon','presion_alta','lesiones_recientes','medicamentos','comentarios','actualizado']
        read_only_fields = ['actualizado','miembro']

    def get_miembro_nombre(self, obj):
        return f"{obj.miembro.nombre} {obj.miembro.apellido}".strip()