from django.contrib import admin
# Importamos TODOS los modelos que hemos creado
from .models import MembershipType, UserMembership, Producto, Venta

# Register your models here.

# Gestión de Membresías
admin.site.register(MembershipType)
admin.site.register(UserMembership)

# Gestión de Punto de Venta 
admin.site.register(Producto)
admin.site.register(Venta)