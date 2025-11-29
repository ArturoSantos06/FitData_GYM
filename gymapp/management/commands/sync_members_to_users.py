from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from gymapp.models import Miembro


class Command(BaseCommand):
    help = "Sincroniza Miembros con Usuarios de Django (crea usuarios por email si faltan)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--default-password',
            type=str,
            default='12345',
            help='Contraseña por defecto para nuevos usuarios creados'
        )

    def handle(self, *args, **options):
        default_password = options['default_password']
        creados = 0
        actualizados = 0

        for miembro in Miembro.objects.all():
            email = (miembro.email or '').strip()
            if not email:
                continue

            user = User.objects.filter(email__iexact=email).first()
            if user:
                # Opcional: vincular OneToOne si no está
                if not miembro.user:
                    miembro.user = user
                    miembro.save(update_fields=['user'])
                actualizados += 1
                continue

            # Crear usuario nuevo con username basado en email
            base_username = email.split('@')[0]
            username = base_username
            idx = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{idx}"
                idx += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=miembro.nombre,
                last_name=miembro.apellido,
                password=default_password,
            )

            # Vincular al perfil Miembro
            miembro.user = user
            miembro.save(update_fields=['user'])
            creados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Usuarios creados: {creados}, vinculados/actualizados: {actualizados}"
        ))
