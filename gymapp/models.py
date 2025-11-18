from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta
from django.utils import timezone # Necesario para obtener la fecha actual

# Modelo existente para el tipo de membresía (el que creaste la semana pasada)
class MembershipType(models.Model):
    name = models.CharField(max_length=150, unique=True, verbose_name="Nombre")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio")
    duration_days = models.IntegerField(verbose_name="Duración (en días)")

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
            
        # Calcula la fecha de vencimiento
        # Se asegura de usar la duración del tipo de membresía
        self.end_date = self.start_date + timedelta(days=self.membership_type.duration_days)
        
        # El campo is_active se usa para filtros, lo actualizaremos con una tarea programada
        self.is_active = self.end_date >= timezone.now().date()
        
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Membresía Asignada"
        verbose_name_plural = "Membresías Asignadas"