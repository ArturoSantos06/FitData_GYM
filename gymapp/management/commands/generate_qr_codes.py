from django.core.management.base import BaseCommand
from gymapp.models import Miembro

class Command(BaseCommand):
    help = 'Genera códigos QR únicos para todos los miembros que no tienen uno'

    def handle(self, *args, **options):
        miembros_sin_qr = Miembro.objects.filter(qr_code__isnull=True) | Miembro.objects.filter(qr_code='')
        
        count = miembros_sin_qr.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ Todos los miembros ya tienen código QR'))
            return
        
        self.stdout.write(f'Generando códigos QR para {count} miembro(s)...')
        
        for miembro in miembros_sin_qr:
            miembro.save()  # Esto activa el auto-guardado que genera el QR
            self.stdout.write(f'  ✓ {miembro.nombre} {miembro.apellido}: {miembro.qr_code}')
        
        self.stdout.write(self.style.SUCCESS(f'✅ {count} código(s) QR generado(s) exitosamente'))
