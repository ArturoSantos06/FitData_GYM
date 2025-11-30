from django.contrib import admin
# Importamos TODOS los modelos que hemos creado
from .models import MembershipType, UserMembership, Producto, Venta, Miembro, HealthProfile, Asistencia, EntradaInventario

# Register your models here.

# Gestión de Miembros
@admin.register(Miembro)
class MiembroAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'apellido', 'email', 'telefono', 'user', 'fecha_inscripcion']
    search_fields = ['nombre', 'apellido', 'email', 'telefono']
    list_filter = ['fecha_inscripcion']
    readonly_fields = ['qr_code', 'avatar_color']

# Gestión de Membresías
@admin.register(MembershipType)
class MembershipTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'price', 'duration_days']
    search_fields = ['name']

@admin.register(UserMembership)
class UserMembershipAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'membership_type', 'start_date', 'end_date', 'is_active']
    list_filter = ['membership_type', 'start_date', 'end_date']
    search_fields = ['user__username', 'user__email']
    
    def is_active(self, obj):
        from django.utils import timezone
        return obj.end_date >= timezone.now().date()
    is_active.boolean = True
    is_active.short_description = 'Activa'

# Gestión de Fichas Médicas
@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'miembro', 'edad', 'condicion_corazon', 'presion_alta', 'lesiones_recientes', 'medicamentos', 'actualizado']
    list_filter = ['condicion_corazon', 'presion_alta', 'lesiones_recientes', 'medicamentos', 'actualizado']
    search_fields = ['miembro__nombre', 'miembro__apellido', 'miembro__email']
    readonly_fields = ['actualizado']

# Gestión de Asistencias
@admin.register(Asistencia)
class AsistenciaAdmin(admin.ModelAdmin):
    list_display = ['id', 'miembro', 'fecha_hora_entrada', 'fecha_hora_salida', 'acceso_permitido']
    list_filter = ['fecha_hora_entrada', 'fecha_hora_salida', 'acceso_permitido']
    search_fields = ['miembro__nombre', 'miembro__apellido', 'miembro__email']
    date_hierarchy = 'fecha_hora_entrada'
    readonly_fields = ['fecha_hora_entrada']

# Gestión de Punto de Venta 
@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'precio', 'stock']
    search_fields = ['nombre']

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['id', 'folio', 'cliente', 'total', 'fecha', 'metodo_pago']
    list_filter = ['fecha', 'metodo_pago']
    search_fields = ['folio']
    date_hierarchy = 'fecha'
    readonly_fields = ['folio', 'fecha']

@admin.register(EntradaInventario)
class EntradaInventarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'producto', 'cantidad', 'fecha']
    list_filter = ['fecha', 'producto']
    search_fields = ['producto__nombre']
    date_hierarchy = 'fecha'
    readonly_fields = ['fecha']