import os
import django
import sys
from pathlib import Path

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym.settings")
django.setup()

from django.core.management import call_command

def exportar():
    print("📦 Exportando datos a 'datos_gym.json' en UTF-8...")

    # Asegurar que el archivo se genere siempre junto a este script (carpeta gym/)
    script_dir = Path(__file__).resolve().parent
    out_file = script_dir / 'datos_gym.json'

    # Abrimos el archivo forzando UTF-8
    with open(out_file, 'w', encoding='utf-8') as f:
        call_command(
            'dumpdata', 
            exclude=['auth.permission', 'contenttypes', 'sessions', 'admin.logentry'], 
            indent=2, 
            stdout=f
        )

    print(f"✅ ¡Exportación completada con éxito! -> {out_file}")

if __name__ == "__main__":
    exportar()