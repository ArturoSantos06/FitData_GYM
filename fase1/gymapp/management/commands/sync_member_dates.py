from django.core.management.base import BaseCommand
from gymapp.models import Miembro, UserMembership
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Sincroniza fechas de vencimiento entre Miembro y UserMembership'

    def handle(self, *args, **options):
        miembros = Miembro.objects.all()
        
        for miembro in miembros:
            if miembro.user:
                # Buscar la membresía más reciente del usuario
                user_membership = UserMembership.objects.filter(
                    user=miembro.user
                ).order_by('-end_date').first()
                
                if user_membership and user_membership.end_date:
                    miembro.fecha_vencimiento = user_membership.end_date
                    miembro.save()
                    self.stdout.write(
                        f'✓ {miembro.nombre} {miembro.apellido}: {miembro.fecha_vencimiento}'
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠ {miembro.nombre} {miembro.apellido}: Sin membresía asignada'
                        )
                    )
        
        self.stdout.write(self.style.SUCCESS('✅ Sincronización completada'))
