"""
Script para sincronizar datos desde la base de datos de producción (Render) a local.
Ejecutar este script descargará los datos de producción y los importará localmente.
"""
import os
import sys
import json
import django
import requests

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gym.settings')
django.setup()

from django.contrib.auth.models import User
from gymapp.models import Miembro, Asistencia, UserMembership, MembershipType, Producto

def sync_from_production():
    """
    Sincroniza los datos desde la API de producción a la base de datos local.
    """
    # URL de tu API en producción (Render)
    PRODUCTION_API_URL = input("Ingresa la URL de tu API en Render (ej: https://tu-api.onrender.com): ").strip()
    
    # Token de autenticación (necesitarás un superusuario)
    username = input("Usuario admin de producción: ").strip()
    password = input("Contraseña: ").strip()
    
    print("\n🔐 Autenticando con la API de producción...")
    
    # Login para obtener el token
    try:
        response = requests.post(
            f"{PRODUCTION_API_URL}/api/login/",
            json={"username": username, "password": password}
        )
        
        if response.status_code != 200:
            print("❌ Error de autenticación. Verifica tus credenciales.")
            return
        
        token = response.json().get('token')
        headers = {'Authorization': f'Token {token}'}
        
        print("✅ Autenticación exitosa\n")
        
        # Sincronizar Miembros
        print("📥 Descargando miembros desde producción...")
        response = requests.get(f"{PRODUCTION_API_URL}/api/miembros/", headers=headers)
        
        if response.status_code == 200:
            miembros_data = response.json()
            print(f"   Encontrados {len(miembros_data)} miembros en producción")
            
            for miembro_data in miembros_data:
                # Buscar o crear el usuario asociado
                user = None
                if miembro_data.get('user'):
                    try:
                        user = User.objects.get(id=miembro_data['user'])
                    except User.DoesNotExist:
                        print(f"   ⚠️  Usuario {miembro_data['user']} no encontrado localmente")
                
                # Crear o actualizar miembro
                miembro, created = Miembro.objects.update_or_create(
                    qr_code=miembro_data['qr_code'],
                    defaults={
                        'nombre': miembro_data['nombre'],
                        'apellido': miembro_data['apellido'],
                        'email': miembro_data['email'],
                        'telefono': miembro_data.get('telefono', ''),
                        'avatar_color': miembro_data.get('avatar_color', '#1D4ED8'),
                        'user': user
                    }
                )
                
                action = "✅ Creado" if created else "🔄 Actualizado"
                print(f"   {action}: {miembro.nombre} {miembro.apellido} ({miembro.qr_code})")
        
        # Sincronizar Asistencias
        print("\n📥 Descargando asistencias desde producción...")
        response = requests.get(f"{PRODUCTION_API_URL}/api/asistencias/", headers=headers)
        
        if response.status_code == 200:
            asistencias_data = response.json()
            if isinstance(asistencias_data, dict):
                asistencias_data = asistencias_data.get('results', [])
            
            print(f"   Encontradas {len(asistencias_data)} asistencias en producción")
            
            for asistencia_data in asistencias_data:
                try:
                    miembro = Miembro.objects.get(id=asistencia_data['miembro'])
                    
                    Asistencia.objects.update_or_create(
                        id=asistencia_data['id'],
                        defaults={
                            'miembro': miembro,
                            'fecha_hora_entrada': asistencia_data['fecha_hora_entrada'],
                            'fecha_hora_salida': asistencia_data.get('fecha_hora_salida'),
                            'acceso_permitido': asistencia_data.get('acceso_permitido', True),
                            'observacion': asistencia_data.get('observacion', '')
                        }
                    )
                except Miembro.DoesNotExist:
                    print(f"   ⚠️  Miembro {asistencia_data['miembro']} no encontrado")
                except Exception as e:
                    print(f"   ⚠️  Error con asistencia {asistencia_data.get('id')}: {e}")
        
        print("\n🎉 Sincronización completada exitosamente!")
        
    except requests.exceptions.ConnectionError:
        print("❌ No se pudo conectar con la API de producción. Verifica la URL.")
    except Exception as e:
        print(f"❌ Error durante la sincronización: {e}")

if __name__ == '__main__':
    print("=" * 60)
    print("SINCRONIZACIÓN DE BASE DE DATOS")
    print("Desde: Producción (Render)")
    print("Hacia: Local (SQLite)")
    print("=" * 60 + "\n")
    
    confirmar = input("¿Deseas continuar? Esto puede sobrescribir datos locales (s/n): ").strip().lower()
    
    if confirmar == 's':
        sync_from_production()
    else:
        print("Operación cancelada.")
