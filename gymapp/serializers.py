from rest_framework import serializers
from .models import MembershipType, UserMembership
from django.contrib.auth.models import User # <-- Asegúrate que esta línea esté aquí

# Serializer existente
class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ['id', 'name', 'price', 'duration_days']


# Serializer de asignación de membresía
class UserMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    membership_name = serializers.ReadOnlyField(source='membership_type.name')
    
    class Meta:
        model = UserMembership
        fields = ['id', 'user', 'user_name', 'membership_type', 'membership_name', 'start_date', 'end_date', 'is_active']
        read_only_fields = ['end_date', 'is_active', 'start_date']


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