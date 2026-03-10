"""
Comando para limpiar fichas de salud duplicadas específicamente.
"""
from django.core.management.base import BaseCommand
from gymapp.models import HealthProfile

class Command(BaseCommand):
    help = 'Elimina fichas de salud duplicadas, conservando solo la de Arturo Santos Lopez (ID 1)'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Buscando fichas de salud...")
        
        # Obtener todas las fichas
        all_profiles = HealthProfile.objects.all()
        self.stdout.write(f"Total de fichas encontradas: {all_profiles.count()}")
        
        for profile in all_profiles:
            self.stdout.write(f"  - ID {profile.id}: {profile.miembro.nombre} {profile.miembro.apellido}")
        
        # Contar las que se van a eliminar
        to_delete = HealthProfile.objects.exclude(id=1)
        count_to_delete = to_delete.count()
        
        if count_to_delete == 0:
            self.stdout.write(self.style.SUCCESS("✅ No hay fichas duplicadas para eliminar"))
            return
        
        self.stdout.write(f"\n⚠️  Se eliminarán {count_to_delete} fichas duplicadas:")
        for profile in to_delete:
            self.stdout.write(f"  - ID {profile.id}: {profile.miembro.nombre} {profile.miembro.apellido}")
        
        # Confirmar
        confirm = input("\n¿Continuar? (sí/no): ").lower()
        if confirm != 'sí' and confirm != 'si':
            self.stdout.write(self.style.WARNING("❌ Operación cancelada"))
            return
        
        # Eliminar
        deleted_count, _ = to_delete.delete()
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ {deleted_count} fichas eliminadas exitosamente"))
        self.stdout.write(f"Fichas restantes: {HealthProfile.objects.count()}")
