"""
Comando para sincronizar la base de datos de producción con los datos locales.
Elimina todos los datos existentes y carga datos_gym.json
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
import os

class Command(BaseCommand):
    help = 'Sincroniza la base de datos con datos_gym.json (ELIMINA datos existentes)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirma que quieres eliminar todos los datos y recargar',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING("⚠️  ADVERTENCIA: Este comando eliminará TODOS los datos existentes."))
            self.stdout.write("Para confirmar, ejecuta: python manage.py load_gym_data --confirm")
            return
        
        self.stdout.write("🗑️  Eliminando datos existentes...")
        
        try:
            # Eliminar todos los datos
            call_command('flush', '--no-input')
            self.stdout.write(self.style.SUCCESS("✅ Datos anteriores eliminados"))
            
            # Verificar que existe el archivo
            if not os.path.exists('datos_gym.json'):
                self.stdout.write(self.style.ERROR("❌ No se encontró el archivo datos_gym.json"))
                return
            
            # Cargar los datos del archivo JSON
            self.stdout.write("🔄 Cargando datos desde datos_gym.json...")
            call_command('loaddata', 'datos_gym.json')
            
            self.stdout.write(self.style.SUCCESS("✅ ¡Base de datos sincronizada exitosamente!"))
            self.stdout.write("La base de datos ahora tiene los mismos datos que tu local.")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))
