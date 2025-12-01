from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from gymapp.models import Miembro
import random


class Command(BaseCommand):
    help = 'Crea registros de Miembro para usuarios que no tienen uno y genera sus códigos QR'

    def generar_color_aleatorio(self):
        """Genera un color hexadecimal aleatorio para el avatar"""
        colores = [
            '#1D4ED8', '#DC2626', '#059669', '#D97706',
            '#7C3AED', '#DB2777', '#0891B2', '#4F46E5'
        ]
        return random.choice(colores)

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("CREACIÓN DE MIEMBROS FALTANTES")
        self.stdout.write("=" * 60 + "\n")

        usuarios_sin_miembro = User.objects.filter(miembro_perfil__isnull=True)

        if not usuarios_sin_miembro.exists():
            self.stdout.write(self.style.SUCCESS("✅ Todos los usuarios ya tienen un registro de miembro."))
            return

        self.stdout.write(f"📋 Encontrados {usuarios_sin_miembro.count()} usuarios sin registro de miembro:\n")

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
                avatar_color=self.generar_color_aleatorio()
            )

            self.stdout.write(self.style.SUCCESS(f"✅ Miembro creado: {miembro.nombre} {miembro.apellido}"))
            self.stdout.write(f"   Usuario: {usuario.username}")
            self.stdout.write(f"   Email: {miembro.email}")
            self.stdout.write(f"   Código QR: {miembro.qr_code}\n")

            creados += 1

        self.stdout.write(self.style.SUCCESS(f"\n🎉 Se crearon {creados} registros de miembros exitosamente."))
        self.stdout.write("Los códigos QR están listos para ser usados en check-in/out.\n")
        self.stdout.write("=" * 60)
        self.stdout.write("PROCESO COMPLETADO")
        self.stdout.write("=" * 60)
