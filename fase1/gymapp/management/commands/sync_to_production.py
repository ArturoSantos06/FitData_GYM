"""
Comando para sincronizar datos locales con producción (Render).
Este comando te da instrucciones claras de cómo actualizar Render.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from gymapp.models import HealthProfile

class Command(BaseCommand):
    help = 'Genera instrucciones para sincronizar la base de datos de Render con local'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("📊 ANÁLISIS DE BASE DE DATOS LOCAL"))
        self.stdout.write("=" * 60)
        
        # Contar registros locales
        health_profiles = HealthProfile.objects.all()
        self.stdout.write(f"\n✅ Fichas de Salud en LOCAL: {health_profiles.count()}")
        
        for profile in health_profiles:
            self.stdout.write(f"   - ID {profile.id}: {profile.miembro.nombre} {profile.miembro.apellido}")
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.WARNING("🔧 PARA SINCRONIZAR RENDER:"))
        self.stdout.write("=" * 60)
        
        self.stdout.write("""
📝 OPCIÓN 1: Usar Python Shell en Render
   1. Ve al dashboard de Render
   2. Selecciona tu servicio backend
   3. Abre la pestaña "Shell" (puede requerir upgrade)
   4. Ejecuta estos comandos:

   python manage.py shell
   
   Luego dentro del shell:
   from gymapp.models import HealthProfile
   HealthProfile.objects.exclude(id=1).delete()
   exit()

📝 OPCIÓN 2: Crear endpoint temporal de limpieza
   Si no tienes acceso a Shell, puedo crear un endpoint
   API temporal para que lo llames desde el navegador.
   
   ¿Quieres que cree este endpoint? (responde: sí/no)
""")
        
        self.stdout.write("=" * 60)
