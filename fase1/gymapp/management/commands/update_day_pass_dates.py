from django.core.management.base import BaseCommand
from gymapp.models import UserMembership, Miembro
from datetime import timedelta

class Command(BaseCommand):
    help = 'Actualizar fechas de vencimiento para day pass (deben vencer el mismo día)'

    def handle(self, *args, **kwargs):
        # Buscar todas las membresías de 1 día (day pass)
        day_pass_memberships = UserMembership.objects.filter(
            membership_type__duration_days=1
        )
        
        updated_count = 0
        
        for membership in day_pass_memberships:
            # Forzar siempre end_date = start_date (por si renovaciones anteriores la dejaron +1 día)
            if membership.end_date != membership.start_date:
                membership.end_date = membership.start_date
                membership.save(update_fields=["end_date"])
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Fix membership: {membership.user.username} -> {membership.end_date}'))

            # Sincronizar miembro
            if membership.user and hasattr(membership.user, 'miembro_perfil'):
                miembro = membership.user.miembro_perfil
                if miembro.fecha_vencimiento != membership.end_date:
                    miembro.fecha_vencimiento = membership.end_date
                    miembro.save(update_fields=["fecha_vencimiento"])
                    self.stdout.write(self.style.SUCCESS(f'  ↳ Sync miembro: {miembro.email} -> {miembro.fecha_vencimiento}'))
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Total actualizadas: {updated_count} membresías day pass'
            )
        )
