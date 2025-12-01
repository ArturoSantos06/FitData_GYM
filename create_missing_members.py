"""
Script para crear registros de Miembro para usuarios existentes que no tienen uno.
Genera códigos QR automáticamente para cada miembro creado.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gym.settings')
django.setup()

from django.contrib.auth.models import User
from gymapp.models import Miembro
import random

def generar_color_aleatorio():
    """Genera un color hexadecimal aleatorio para el avatar"""
    colores = [
        '#1D4ED8', '#DC2626', '#059669', '#D97706', 
        '#7C3AED', '#DB2777', '#0891B2', '#4F46E5'
    ]
    return random.choice(colores)

def crear_miembros_faltantes():
    """Crea registros de Miembro para usuarios que no tienen uno"""
    usuarios_sin_miembro = User.objects.filter(miembro_perfil__isnull=True)
    
    if not usuarios_sin_miembro.exists():
        print("✅ Todos los usuarios ya tienen un registro de miembro.")
        return
    
    print(f"📋 Encontrados {usuarios_sin_miembro.count()} usuarios sin registro de miembro:\n")
    
    creados = 0
    for usuario in usuarios_sin_miembro:
        # Extraer nombre y apellido del usuario
        nombre_completo = usuario.get_full_name()
        if nombre_completo:
            partes = nombre_completo.split(' ', 1)
            nombre = partes[0]
            apellido = partes[1] if len(partes) > 1 else ''
        else:
            nombre = usuario.username
            apellido = ''
        
        # Crear el registro de miembro
        miembro = Miembro.objects.create(
            user=usuario,
            nombre=nombre,
            apellido=apellido,
            email=usuario.email if usuario.email else f"{usuario.username}@temp.com",
            telefono='',  # Se puede actualizar después
            avatar_color=generar_color_aleatorio()
        )
        
        print(f"✅ Miembro creado: {miembro.nombre} {miembro.apellido}")
        print(f"   Usuario: {usuario.username}")
        print(f"   Email: {miembro.email}")
        print(f"   Código QR: {miembro.qr_code}\n")
        
        creados += 1
    
    print(f"\n🎉 Se crearon {creados} registros de miembros exitosamente.")
    print("Los códigos QR están listos para ser usados en check-in/out.")

if __name__ == '__main__':
    print("=" * 60)
    print("CREACIÓN DE MIEMBROS FALTANTES")
    print("=" * 60 + "\n")
    
    crear_miembros_faltantes()
    
    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO")
    print("=" * 60)
