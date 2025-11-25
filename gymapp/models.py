from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta
from django.utils import timezone 
import uuid

# Modelo existente para el tipo de membresía 
class MembershipType(models.Model):
    name = models.CharField(max_length=150, unique=True, verbose_name="Nombre")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio")
    duration_days = models.IntegerField(verbose_name="Duración (en días)")
    
    image = models.ImageField(upload_to='memberships/', blank=True, null=True, verbose_name="Imagen de Tarjeta")
    def __str__(self):
        return f"{self.name} (${self.price})"

    class Meta:
        verbose_name = "Tipo de Membresía"
        verbose_name_plural = "Tipos de Membresía"

# --- NUEVO MODELO: El Registro de Asignación ---
class UserMembership(models.Model):
    # 1. Relación con el Usuario (quién tiene la membresía)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuario")
    
    # 2. Relación con el Tipo (qué membresía está asignada)
    membership_type = models.ForeignKey(MembershipType, on_delete=models.PROTECT, verbose_name="Tipo de Membresía")
    
    # Fechas
    start_date = models.DateField(verbose_name="Fecha de Inicio", blank=True, null=True)
    end_date = models.DateField(verbose_name="Fecha de Vencimiento", blank=True, null=True)
    
    # Estado Activo (será calculado)
    is_active = models.BooleanField(default=True, verbose_name="Activa")

    def __str__(self):
        return f"{self.user.username} - {self.membership_type.name} hasta {self.end_date}"

    # --- LÓGICA DE CÁLCULO AUTOMÁTICO ---
    def save(self, *args, **kwargs):
        # Solo calculamos las fechas si es un objeto nuevo o si las fechas no están establecidas
        if not self.start_date:
            self.start_date = timezone.now().date()
            
        # Calcula la fecha de vencimiento si no existe
        if not self.end_date:
            self.end_date = self.start_date + timedelta(days=self.membership_type.duration_days)
        
        # El campo is_active se usa para filtros
        self.is_active = self.end_date >= timezone.now().date()
        
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Membresía Asignada"
        verbose_name_plural = "Membresías Asignadas"

class Producto(models.Model):
    nombre = models.CharField(max_length=200)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)

    def __str__(self):
        return f"{self.nombre} (${self.precio})"

class Venta(models.Model):
    cliente = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=50, default='EFECTIVO')
    detalle_productos = models.TextField(default="[]")

    # --- NUEVO CAMPO: FOLIO ---
    folio = models.CharField(max_length=10, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Si no tiene folio, generamos uno único
        if not self.folio:
            self.folio = "V-" + str(uuid.uuid4())[:6].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Folio: {self.folio} - ${self.total}"

class EntradaInventario(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='entradas')
    cantidad = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.producto.nombre} (+{self.cantidad})"