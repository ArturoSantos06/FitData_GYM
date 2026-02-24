"""
Script de migración de datos de Django SQLite a Firebase Firestore
Ejecutar: python migrate_to_firestore.py
"""

import os
import django
import json
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gym.settings')
django.setup()

# Imports después de setup
from django.contrib.auth.models import User
from gymapp.models import (
    Miembro, MembershipType, UserMembership, 
    Producto, Venta, Asistencia, HealthProfile
)

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

# Inicializar Firebase Admin
try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Admin inicializado correctamente")
except Exception as e:
    print(f"❌ Error inicializando Firebase Admin: {e}")
    print("\n⚠️  Necesitas descargar el archivo firebase-service-account.json:")
    print("1. Ve a Firebase Console > Configuración del proyecto > Cuentas de servicio")
    print("2. Click en 'Generar nueva clave privada'")
    print("3. Guarda el archivo como 'firebase-service-account.json' en la raíz del proyecto\n")
    exit(1)

def serialize_datetime(obj):
    """Convertir datetime a timestamp de Firestore"""
    if isinstance(obj, datetime):
        return obj
    return obj

def migrate_users():
    """Migrar usuarios de Django a Firebase Authentication y Firestore"""
    print("\n📦 Migrando usuarios...")
    users = User.objects.all()
    migrated = 0
    
    for user in users:
        try:
            # Crear usuario en Firebase Authentication
            try:
                firebase_user = firebase_auth.create_user(
                    uid=str(user.id),
                    email=user.email or f"{user.username}@fitdata.gym",
                    display_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                    password="FitData2026!"  # Contraseña temporal
                )
                print(f"  ✓ Usuario creado en Auth: {firebase_user.email}")
            except firebase_auth.EmailAlreadyExistsError:
                firebase_user = firebase_auth.get_user_by_email(user.email)
                print(f"  ℹ Usuario ya existe en Auth: {firebase_user.email}")
            except Exception as e:
                print(f"  ⚠️  No se pudo crear en Auth: {user.username} - {e}")
                continue
            
            # Guardar datos adicionales en Firestore
            user_data = {
                'email': user.email or f"{user.username}@fitdata.gym",
                'username': user.username,
                'firstName': user.first_name,
                'lastName': user.last_name,
                'isStaff': user.is_staff,
                'isSuperuser': user.is_superuser,
                'isActive': user.is_active,
                'dateJoined': user.date_joined,
                'role': 'admin' if user.is_staff else 'client',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            db.collection('users').document(str(user.id)).set(user_data)
            migrated += 1
            print(f"  ✓ Usuario {user.username} migrado")
            
        except Exception as e:
            print(f"  ❌ Error migrando usuario {user.username}: {e}")
    
    print(f"✅ {migrated}/{users.count()} usuarios migrados\n")

def migrate_members():
    """Migrar miembros a Firestore"""
    print("📦 Migrando miembros...")
    miembros = Miembro.objects.all()
    migrated = 0
    
    for miembro in miembros:
        try:
            member_data = {
                'userId': str(miembro.user.id) if miembro.user else None,
                'nombre': miembro.nombre,
                'apellido': miembro.apellido,
                'email': miembro.email,
                'telefono': miembro.telefono,
                'fechaNacimiento': miembro.fecha_nacimiento.isoformat() if miembro.fecha_nacimiento else None,
                'direccion': miembro.direccion or '',
                'qrCode': miembro.qr_code or f"FD-USER{miembro.id}",
                'avatarColor': getattr(miembro, 'avatar_color', '#6366f1'),
                'active': True,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            db.collection('miembros').document(str(miembro.id)).set(member_data)
            migrated += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando miembro {miembro.nombre}: {e}")
    
    print(f"✅ {migrated}/{miembros.count()} miembros migrados\n")

def migrate_membership_types():
    """Migrar tipos de membresía a Firestore"""
    print("📦 Migrando tipos de membresía...")
    types = MembershipType.objects.all()
    migrated = 0
    
    for mtype in types:
        try:
            type_data = {
                'name': mtype.name,
                'description': mtype.description,
                'durationDays': mtype.duration_days,
                'price': float(mtype.price),
                'imageUrl': mtype.image.url if mtype.image else None,
                'active': True,
                'createdAt': firestore.SERVER_TIMESTAMP,
            }
            
            db.collection('membershipTypes').document(str(mtype.id)).set(type_data)
            migrated += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando tipo {mtype.name}: {e}")
    
    print(f"✅ {migrated}/{types.count()} tipos de membresía migrados\n")

def migrate_memberships():
    """Migrar membresías de usuarios a Firestore"""
    print("📦 Migrando membresías activas...")
    memberships = UserMembership.objects.all()
    migrated = 0
    
    for membership in memberships:
        try:
            membership_data = {
                'userId': str(membership.user.id),
                'membershipTypeId': str(membership.tipo.id),
                'membershipName': membership.tipo.name,
                'startDate': membership.start_date.isoformat() if membership.start_date else None,
                'endDate': membership.end_date.isoformat() if membership.end_date else None,
                'price': float(membership.tipo.price),
                'active': membership.end_date >= datetime.now().date() if membership.end_date else False,
                'createdAt': firestore.SERVER_TIMESTAMP,
            }
            
            db.collection('memberships').add(membership_data)
            migrated += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando membresía: {e}")
    
    print(f"✅ {migrated}/{memberships.count()} membresías migradas\n")

def migrate_products():
    """Migrar productos a Firestore"""
    print("📦 Migrando productos...")
    productos = Producto.objects.all()
    migrated = 0
    
    for producto in productos:
        try:
            product_data = {
                'nombre': producto.nombre,
                'descripcion': producto.descripcion or '',
                'precio': float(producto.precio),
                'stock': producto.stock,
                'categoria': producto.categoria or 'general',
                'imageUrl': producto.imagen.url if producto.imagen else None,
                'active': True,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            db.collection('productos').document(str(producto.id)).set(product_data)
            migrated += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando producto {producto.nombre}: {e}")
    
    print(f"✅ {migrated}/{productos.count()} productos migrados\n")

def migrate_attendance():
    """Migrar asistencias a Firestore"""
    print("📦 Migrando asistencias...")
    asistencias = Asistencia.objects.all()[:100]  # Últimas 100
    migrated = 0
    
    for asistencia in asistencias:
        try:
            attendance_data = {
                'memberId': str(asistencia.miembro.id) if asistencia.miembro else None,
                'userId': str(asistencia.miembro.user.id) if asistencia.miembro and asistencia.miembro.user else None,
                'checkInTime': asistencia.fecha_hora_entrada,
                'checkOutTime': asistencia.fecha_hora_salida if asistencia.fecha_hora_salida else None,
                'createdAt': asistencia.fecha_hora_entrada,
            }
            
            db.collection('asistencias').add(attendance_data)
            migrated += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando asistencia: {e}")
    
    print(f"✅ {migrated} asistencias migradas\n")

def main():
    print("\n" + "="*60)
    print("🚀 MIGRACIÓN DE DATOS: Django SQLite → Firebase Firestore")
    print("="*60)
    
    try:
        migrate_users()
        migrate_members()
        migrate_membership_types()
        migrate_memberships()
        migrate_products()
        migrate_attendance()
        
        print("\n" + "="*60)
        print("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
        print("="*60)
        print("\n⚠️  IMPORTANTE:")
        print("- Todos los usuarios tienen contraseña temporal: FitData2026!")
        print("- Pide a los usuarios que cambien su contraseña al iniciar sesión")
        print("- Revisa Firebase Console para verificar los datos migrados\n")
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")

if __name__ == "__main__":
    main()
