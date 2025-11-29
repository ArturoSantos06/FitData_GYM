from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = "Resetea la contraseña de clientes (no superusuarios) a un valor dado"

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='12345',
            help='Nueva contraseña para clientes'
        )
        parser.add_argument(
            '--only-emails',
            type=str,
            nargs='*',
            help='Opcional: lista de emails a los que aplicar el cambio (si se omite, aplica a todos los no superusuarios)'
        )

    def handle(self, *args, **options):
        password = options['password']
        only_emails = options['only_emails']

        qs = User.objects.filter(is_superuser=False, is_active=True)
        if only_emails:
            qs = qs.filter(email__in=only_emails)

        count = 0
        for user in qs:
            user.set_password(password)
            user.save(update_fields=['password'])
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Contraseñas actualizadas: {count}"))
