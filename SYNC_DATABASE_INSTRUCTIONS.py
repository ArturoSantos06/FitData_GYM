"""
Instrucciones para sincronizar bases de datos usando comandos de Django

OPCIÓN 1: Exportar desde Render e importar a Local
===================================================

1. En el servidor de Render, ejecuta:
   python manage.py dumpdata gymapp auth.user --natural-foreign --natural-primary -o backup_data.json

2. Descarga el archivo backup_data.json desde Render

3. En tu servidor local, ejecuta:
   python manage.py loaddata backup_data.json


OPCIÓN 2: Usar el script automático
====================================

Ejecuta el script sync_from_production.py:
   python sync_from_production.py

Este script te pedirá:
- URL de tu API en Render
- Credenciales de admin
- Descargará y sincronizará automáticamente los datos


OPCIÓN 3: Configurar base de datos compartida
==============================================

Puedes configurar Django para usar la base de datos de Render también en local.
Esto requiere:
1. Acceso remoto a la base de datos de PostgreSQL en Render
2. Actualizar settings.py con las credenciales de producción


RECOMENDACIÓN:
==============
- Para desarrollo: Usa bases de datos separadas (SQLite local, PostgreSQL en Render)
- Para sincronizar: Usa la Opción 1 o 2 periódicamente
- Para producción: Siempre usa la base de datos de Render

NOTA IMPORTANTE:
================
- Al sincronizar, los datos locales pueden sobrescribirse
- Haz backup antes de sincronizar
- Los IDs de objetos deben coincidir para evitar duplicados
"""

print(__doc__)
