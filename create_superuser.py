import os
import django

# Configura el entorno de Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gym.settings")
django.setup()

from django.contrib.auth.models import User

# Cambia estos datos por los que tú quieras para tu equipo
USERNAME = 'admin'
EMAIL = 'admin@fitdata.com'
PASSWORD = 'FitData2025!' 

def create_admin():
    if not User.objects.filter(username=USERNAME).exists():
        print(f"Creando superusuario: {USERNAME}")
        User.objects.create_superuser(USERNAME, EMAIL, PASSWORD)
        print("¡Superusuario creado con éxito!")
    else:
        print(f"El superusuario {USERNAME} ya existe. No se hizo nada.")

if __name__ == "__main__":
    create_admin()