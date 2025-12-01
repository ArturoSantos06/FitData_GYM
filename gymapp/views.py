import os
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.core.mail import send_mail
import threading
import logging
import os
# Importar modelos y serializers
from .models import MembershipType, UserMembership, Producto, Venta, Miembro, Asistencia, Pago
from .serializers import (
    MembershipTypeSerializer, 
    UserMembershipSerializer, 
    UserSerializer, 
    ProductoSerializer, 
    VentaSerializer,
    MiembroSerializer,
    AsistenciaSerializer,
    PagoSerializer
)

# --- LÓGICA INTELIGENTE DE ENTORNO ---
# Se permite acceso completo en todas partes
BaseViewSet = viewsets.ModelViewSet

# ---------------------------------------------------
# VIEWSETS
# ---------------------------------------------------

def send_mail_async(subject, message, recipient_list, from_email=None, fail_silently=True):
    """Enviar correo en un hilo separado para evitar bloquear el worker.

    Orden de prioridad:
    1. Gmail API (si GMAIL_REFRESH_TOKEN existe)
    2. SendGrid Web API (si SENDGRID_API_KEY existe)
    3. Fallback SMTP
    """
    def _send():
        try:
            # 1. Intentar Gmail API primero
            gmail_refresh = os.environ.get('GMAIL_REFRESH_TOKEN')
            if gmail_refresh:
                try:
                    from .gmail_utils import send_gmail_api
                    # Gmail API envía a un destinatario a la vez
                    for recipient in recipient_list:
                        send_gmail_api(subject, message, recipient, from_email=from_email)
                    print(f"✅ Correo enviado vía Gmail API a {len(recipient_list)} destinatario(s)")
                    return
                except Exception as e:
                    print(f"⚠️ Gmail API send failed: {e}")

            # 2. Intentar SendGrid Web API si está disponible
            sg_key = os.environ.get('SENDGRID_API_KEY')
            if sg_key:
                try:
                    from .sendgrid_utils import sendgrid_send
                    sendgrid_send(sg_key, subject, message, recipient_list, from_email=from_email)
                    print(f"✅ Correo enviado vía SendGrid a {len(recipient_list)} destinatario(s)")
                    return
                except Exception as e:
                    print(f"⚠️ SendGrid API send failed: {e}")

            # 3. Fallback: usar django.core.mail.send_mail (SMTP)
            from django.core.mail import send_mail as django_send
            django_send(subject, message, from_email, recipient_list, fail_silently=fail_silently)
            print(f"✅ Correo enviado vía SMTP a {len(recipient_list)} destinatario(s)")
        except Exception as e:
            # Registrar error pero no elevar excepción
            print(f"❌ Error envío correo async: {e}")

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()

class MembershipTypeViewSet(BaseViewSet):
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # Lectura pública, escritura autenticada
    permission_classes = [IsAuthenticatedOrReadOnly]

class UserMembershipViewSet(BaseViewSet):
    queryset = UserMembership.objects.all().order_by('-start_date')
    serializer_class = UserMembershipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get('user')
        new_type_id = request.data.get('membership_type')
        force_renew = request.data.get('force_renew', False)
        payment_method = request.data.get('payment_method', 'EFECTIVO')
        monto_recibido = float(request.data.get('monto_recibido', 0)) # NUEVO: Recibir monto

        existing = UserMembership.objects.filter(user_id=user_id).order_by('-end_date').first()
        today = timezone.now().date()

        # Validar Conflicto
        if existing and not force_renew:
            estado = "ACTIVA" if existing.end_date >= today else "VENCIDA"
            return Response({
                'conflict': True,
                'message': f'El usuario ya tiene una membresía: {existing.membership_type.name} ({estado})',
                'detail': f'Vence el: {existing.end_date}. ¿Deseas reemplazarla o renovarla?',
            }, status=status.HTTP_409_CONFLICT)

        # Obtener tipo de membresía
        try:
            target_id = new_type_id if new_type_id else existing.membership_type.id # Fallback
            new_membership_type = MembershipType.objects.get(id=target_id)
        except:
            return Response({'error': 'Membresía no válida'}, status=400)

        duration = new_membership_type.duration_days
        if duration == 0: duration = 1

        with transaction.atomic():
            # 1. Actualizar o Crear Membresía
            if existing:
                existing.membership_type = new_membership_type
                # SIEMPRE reemplazar la fecha desde hoy (no sumar días)
                existing.start_date = today
                # Ajuste especial para Day Pass (1 día): vence el mismo día
                if duration == 1:
                    existing.end_date = today
                else:
                    existing.end_date = today + timedelta(days=duration)
                existing.save()
                mensaje_exito = f'¡Renovación Exitosa! Vence: {existing.end_date}'
                obj_result = existing
                
                # Actualizar también la fecha del Miembro (para check-in)
                try:
                    miembro = Miembro.objects.get(user_id=user_id)
                    miembro.fecha_vencimiento = existing.end_date
                    miembro.save()
                except Miembro.DoesNotExist:
                    pass
            else:
                obj_result = UserMembership.objects.create(
                    user_id=user_id,
                    membership_type=new_membership_type
                )
                mensaje_exito = f'¡Asignación Exitosa! Vence: {obj_result.end_date}'
                
                # Actualizar también la fecha del Miembro (para check-in)
                try:
                    miembro = Miembro.objects.get(user_id=user_id)
                    miembro.fecha_vencimiento = obj_result.end_date
                    miembro.save()
                except Miembro.DoesNotExist:
                    pass

            # 2. Registrar Venta y Enviar Correo
            if new_membership_type.price > 0:
                # Crear Venta
                nueva_venta = Venta.objects.create(
                    cliente_id=user_id,
                    total=new_membership_type.price,
                    metodo_pago=payment_method,
                    detalle_productos=f"[{{'nombre': 'Renovación: {new_membership_type.name}', 'precio': {new_membership_type.price}, 'cantidad': 1}}]"
                )
                
                # --- ENVÍO DE CORREO (TICKET) ---
                try:
                    cliente = User.objects.get(id=user_id)
                    if cliente.email:
                        fecha_local = timezone.localtime(nueva_venta.fecha)
                        fecha_str = fecha_local.strftime('%d/%m/%Y %I:%M %p')
                        
                        # Cálculos
                        total_float = float(nueva_venta.total)
                        subtotal = total_float / 1.16
                        iva = total_float - subtotal
                        cambio = 0
                        if payment_method == 'EFECTIVO' and monto_recibido:
                            cambio = monto_recibido - total_float

                        mensaje_mail = f"""
Hola {cliente.first_name}, gracias por tu renovación en FitData GYM.

========================================
       TICKET DE RENOVACIÓN
========================================
FOLIO:    {nueva_venta.folio}
FECHA:    {fecha_str}
CLIENTE:  {cliente.first_name} {cliente.last_name}
========================================

CONCEPTO:
- 1x Membresía {new_membership_type.name} (${total_float})
  (Vigencia: {duration} días)

========================================
SUBTOTAL:           ${subtotal:,.2f}
IVA (16%):          ${iva:,.2f}
----------------------------------------
TOTAL:              ${total_float:,.2f}
========================================
MÉTODO DE PAGO:     {payment_method}
"""
                        if payment_method == 'EFECTIVO':
                            mensaje_mail += f"EFECTIVO:           ${monto_recibido:,.2f}\n"
                            mensaje_mail += f"CAMBIO:             ${cambio:,.2f}\n"
                        
                        mensaje_mail += "\n¡A entrenar con todo!"

                        send_mail_async(
                            f"Renovación Exitosa - Folio: {nueva_venta.folio}",
                            mensaje_mail,
                            [cliente.email],
                            from_email=None,
                            fail_silently=True
                        )
                except Exception as e:
                    print(f"Error correo renovación: {e}")
                # --------------------------------

            serializer = self.get_serializer(obj_result)
            return Response({'message': mensaje_exito, **serializer.data}, status=status.HTTP_200_OK)

class UserViewSet(BaseViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Endpoint para obtener los datos del usuario autenticado"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


# --- LOGIN DE CLIENTE POR EMAIL ---
@api_view(['POST'])
@permission_classes([])
def client_login(request):
    """Autentica por email + contraseña y devuelve token.

    Body:
    { "email": "user@example.com", "password": "12345" }
    """
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    if not email or not password:
        return Response({'error': 'Email y contraseña son requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    # Buscar usuario por email
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'error': 'Email o contraseña incorrectos'}, status=status.HTTP_400_BAD_REQUEST)

    # Autenticar usando username real del usuario
    user_auth = authenticate(username=user.username, password=password)
    if not user_auth:
        return Response({'error': 'Email o contraseña incorrectos'}, status=status.HTTP_400_BAD_REQUEST)

    # Crear/obtener token
    token, _ = Token.objects.get_or_create(user=user_auth)
    return Response({'token': token.key, 'username': user_auth.username, 'email': user_auth.email})

class ProductoViewSet(BaseViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class VentaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Venta.objects.all().order_by('-fecha')
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]


# --- CAMBIO DE CONTRASEÑA DEL CLIENTE ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Permite al usuario autenticado cambiar su contraseña.

    Body esperado:
    { "current_password": "...", "new_password": "..." }
    Devuelve nuevo token para mantener la sesión activa.
    """
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not current_password or not new_password:
        return Response({'error': 'Contraseña actual y nueva son requeridas'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'error': 'La contraseña actual es incorrecta'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    # Invalidar token anterior y emitir uno nuevo
    try:
        Token.objects.filter(user=user).delete()
    except Exception:
        pass
    new_token = Token.objects.create(user=user)

    return Response({'detail': 'Contraseña actualizada correctamente', 'token': new_token.key})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_venta(request):
    data = request.data
    cliente_id = data.get('cliente_id')
    
    try:
        with transaction.atomic():
            # 1. Crear Venta
            nueva_venta = Venta.objects.create(
                cliente_id=cliente_id,
                total=data['total'],
                metodo_pago=data['metodo_pago'],
                detalle_productos=str(data['productos'])
            )

            # 2. Restar Stock
            for item in data['productos']:
                prod_db = Producto.objects.get(id=item['id'])
                if prod_db.stock < item['cantidad']:
                    raise Exception(f"Stock insuficiente: {prod_db.nombre}")
                prod_db.stock -= item['cantidad']
                prod_db.save()

            # --- 3. ENVIAR CORREO CON DESGLOSE DE IVA ---
            if cliente_id:
                try:
                    cliente = User.objects.get(id=cliente_id)
                    if cliente.email:
                        # A. Fecha Local
                        fecha_local = timezone.localtime(nueva_venta.fecha)
                        fecha_str = fecha_local.strftime('%d/%m/%Y %I:%M %p')

                        # B. Cálculos Monetarios (IVA)
                        monto_recibido = float(data.get('monto_recibido', 0))
                        total_float = float(nueva_venta.total)
                        
                        # Desglosamos el IVA (asumiendo 16%)
                        # Si el total es 116, el subtotal es 100 y el IVA 16.
                        subtotal = total_float / 1.16
                        iva = total_float - subtotal
                        
                        cambio = 0
                        if nueva_venta.metodo_pago == 'EFECTIVO' and monto_recibido:
                            cambio = monto_recibido - total_float

                        asunto = f"Ticket de Compra - Folio: {nueva_venta.folio}"
                        
                        # C. Construcción del Ticket
                        mensaje = f"""
Hola {cliente.first_name}, aquí tienes tu recibo de compra.

========================================
          TICKET DE COMPRA
========================================
FOLIO:    {nueva_venta.folio}
FECHA:    {fecha_str}
CLIENTE:  {cliente.first_name} {cliente.last_name}
========================================

PRODUCTOS:
"""
                        for item in data['productos']:
                            mensaje += f"- {item['cantidad']}x {item['nombre']:<25} ${item['precio']}\n"
                        
                        mensaje += f"""
========================================
SUBTOTAL:           ${subtotal:,.2f}
IVA (16%):          ${iva:,.2f}
----------------------------------------
TOTAL:              ${total_float:,.2f}
========================================
MÉTODO DE PAGO:     {nueva_venta.metodo_pago}
"""
                        if nueva_venta.metodo_pago == 'EFECTIVO':
                            mensaje += f"EFECTIVO:           ${monto_recibido:,.2f}\n"
                            mensaje += f"CAMBIO:             ${cambio:,.2f}\n"
                        
                        mensaje += "\n¡Gracias por tu preferencia!"

                        # Usar send_mail_async que intenta Gmail API primero
                        send_mail_async(
                            asunto,
                            mensaje,
                            [cliente.email],
                            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                            fail_silently=False
                        )
                        print(f"📧 Correo programado para envío a {cliente.email}")
                except Exception as e:
                    print(f"❌ ERROR ENVÍO CORREO: {e}")
                    import traceback
                    traceback.print_exc()
            # --------------------------------

            return Response({'status': 'success', 'venta_id': nueva_venta.id}, status=201)
            
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
def register_user_with_membership(request):
    data = request.data
    
    # Validaciones previas
    user_serializer = UserSerializer(data=data)
    if not user_serializer.is_valid():
        return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # 1. Crear Usuario
            user = user_serializer.save()

            # 2. Datos de Membresía y Pago
            membership = MembershipType.objects.get(id=data['membership_id'])
            payment_method = data.get('payment_method', 'EFECTIVO')
            monto_recibido = float(data.get('monto_recibido', 0)) # Nuevo dato

            # 3. Calcular fecha de vencimiento
            fecha_vencimiento = timezone.now().date() + timedelta(days=membership.duration_days)

            # 4. Crear Miembro (para check-in/QR) con fecha de vencimiento
            Miembro.objects.create(
                nombre=user.first_name,
                apellido=user.last_name,
                email=user.email,
                fecha_vencimiento=fecha_vencimiento,
                user=user
            )

            # 5. Asignar Membresía
            UserMembership.objects.create(user=user, membership_type=membership)

            # 5. Registrar Venta (Solo si tiene precio)
            if membership.price > 0:
                nueva_venta = Venta.objects.create(
                    cliente=user,
                    total=membership.price,
                    metodo_pago=payment_method,
                    detalle_productos=f"[{{'nombre': 'Membresía: {membership.name}', 'precio': {membership.price}, 'cantidad': 1}}]"
                )

                # --- 6. ENVIAR TICKET POR CORREO ---
                if user.email:
                    try:
                        fecha_local = timezone.localtime(nueva_venta.fecha)
                        fecha_str = fecha_local.strftime('%d/%m/%Y %I:%M %p')
                        
                        # Cálculos
                        total_float = float(nueva_venta.total)
                        subtotal = total_float / 1.16
                        iva = total_float - subtotal
                        cambio = 0
                        if payment_method == 'EFECTIVO' and monto_recibido:
                            cambio = monto_recibido - total_float

                        mensaje = f"""
Hola {user.first_name}, ¡Bienvenido a FitData GYM!
Tu registro y compra de membresía han sido exitosos.

========================================
          TICKET DE BIENVENIDA
========================================
FOLIO:    {nueva_venta.folio}
FECHA:    {fecha_str}
CLIENTE:  {user.first_name} {user.last_name}
USUARIO:  {user.username}
========================================

CONCEPTO:
- 1x Membresía {membership.name} (${total_float})

========================================
SUBTOTAL:           ${subtotal:,.2f}
IVA (16%):          ${iva:,.2f}
----------------------------------------
TOTAL:              ${total_float:,.2f}
========================================
MÉTODO DE PAGO:     {payment_method}
"""
                        if payment_method == 'EFECTIVO':
                            mensaje += f"EFECTIVO:           ${monto_recibido:,.2f}\n"
                            mensaje += f"CAMBIO:             ${cambio:,.2f}\n"
                        
                        mensaje += "\n¡Gracias por unirte a nosotros!"

                        send_mail_async(
                            f"Bienvenido a FitData - Ticket {nueva_venta.folio}",
                            mensaje,
                            [user.email],
                            from_email=None,
                            fail_silently=True
                        )
                    except Exception as e:
                        print(f"Error enviando correo: {e}")

            return Response({'status': 'Creado exitosamente'}, status=201)
            
    except Exception as e:
        return Response({'error': str(e)}, status=400)
    
from .models import EntradaInventario
from .serializers import EntradaInventarioSerializer

class EntradaInventarioViewSet(viewsets.ModelViewSet): 
    queryset = EntradaInventario.objects.all().order_by('-fecha')
    serializer_class = EntradaInventarioSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        try:
            with transaction.atomic():
                # 1. Guardar el registro histórico
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                # Guardamos el usuario que hizo la acción
                entrada = serializer.save(usuario=request.user)

                # 2. SUMAR AL STOCK ACTUAL DEL PRODUCTO
                producto = entrada.producto
                producto.stock += entrada.cantidad
                producto.save()

                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# --- VIEWSETS DE JOELY: PORTAL DE CLIENTES ---

from .models import Miembro, Pago, Asistencia, HealthProfile
from .serializers import MiembroSerializer, PagoSerializer, AsistenciaSerializer, HealthProfileSerializer
from rest_framework import serializers as drf_serializers

class MiembroViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar miembros/clientes"""
    queryset = Miembro.objects.all().order_by('-fecha_inscripcion')
    serializer_class = MiembroSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['PATCH'], permission_classes=[IsAuthenticated])
    def set_color(self, request):
        """Actualiza el color del avatar inicial del miembro autenticado.

        Body: { "color": "#FFFFFF" }
        """
        color = request.data.get('color', '').strip()
        if not color or not color.startswith('#') or len(color) not in (4,7):
            return Response({'error': 'Color hex inválido'}, status=400)
        user = request.user
        miembro = Miembro.objects.filter(user=user).first() or Miembro.objects.filter(email__iexact=user.email).first()
        if not miembro:
            return Response({'error': 'Miembro no encontrado'}, status=404)
        miembro.avatar_color = color
        miembro.save(update_fields=['avatar_color'])
        return Response({'status': 'ok', 'avatar_color': miembro.avatar_color}, status=200)


class PagoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar pagos de membresías (RF-006)"""
    queryset = Pago.objects.all().order_by('-fecha_pago')
    serializer_class = PagoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class AsistenciaViewSet(viewsets.ModelViewSet):
    """ViewSet para check-in/check-out con validación automática (RF-005)"""
    queryset = Asistencia.objects.all().order_by('-fecha_hora_entrada')
    serializer_class = AsistenciaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Filtrar asistencias por fecha y búsqueda de nombre"""
        queryset = super().get_queryset()
        
        # Filtro por fecha específica
        fecha = self.request.query_params.get('fecha', None)
        if fecha:
            queryset = queryset.filter(fecha_hora_entrada__date=fecha)
        
        # Búsqueda por nombre de miembro
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                miembro__nombre__icontains=search
            ) | queryset.filter(
                miembro__apellido__icontains=search
            ) | queryset.filter(
                miembro__email__icontains=search
            )
        
        return queryset

    def perform_create(self, serializer):
        """Validación automática de acceso basado en fecha de vencimiento"""
        miembro = serializer.validated_data['miembro']
        hoy = timezone.now().date()
        
        # Lógica del semáforo: ¿Tiene membresía activa?
        if miembro.fecha_vencimiento and miembro.fecha_vencimiento >= hoy:
            acceso = True
            obs = "Acceso Permitido"
        else:
            acceso = False
            obs = "Membresía Vencida o Inexistente"

        # Guardar con el resultado calculado
        serializer.save(acceso_permitido=acceso, observacion=obs)
    
    @action(detail=False, methods=['get'])
    def hoy(self, request):
        """Obtener todas las asistencias del día actual"""
        hoy = timezone.now().date()
        asistencias = self.queryset.filter(fecha_hora_entrada__date=hoy)
        serializer = self.get_serializer(asistencias, many=True)
        return Response(serializer.data)

class HealthProfileViewSet(viewsets.ModelViewSet):
    queryset = HealthProfile.objects.select_related('miembro').all().order_by('-actualizado')
    serializer_class = HealthProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Si es staff ve todos, sino solo el suyo
        if user.is_staff:
            return self.queryset
        miembro = Miembro.objects.filter(user=user).first() or Miembro.objects.filter(email__iexact=user.email).first()
        if miembro and hasattr(miembro, 'health_profile'):
            return HealthProfile.objects.filter(miembro=miembro)
        return HealthProfile.objects.none()

    def create(self, request, *args, **kwargs):
        """
        Crear o actualizar ficha de salud (upsert).
        """
        try:
            user = request.user
            miembro_id = request.data.get('miembro_id')
            
            # Determinar el miembro
            if user.is_staff and miembro_id:
                miembro = Miembro.objects.filter(id=miembro_id).first()
                if not miembro:
                    return Response({'error': 'Miembro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            else:
                miembro = Miembro.objects.filter(user=user).first() or Miembro.objects.filter(email__iexact=user.email).first()
                if not miembro:
                    return Response({'error': 'Perfil de miembro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar si ya existe una ficha para este miembro
            existing = getattr(miembro, 'health_profile', None)
            
            if existing:
                # Actualizar ficha existente
                for field in ['edad', 'condicion_corazon', 'presion_alta', 'lesiones_recientes', 'medicamentos', 'comentarios']:
                    if field in request.data:
                        setattr(existing, field, request.data.get(field))
                existing.save()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Crear nueva ficha
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save(miembro=miembro)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


# --- ENDPOINTS PARA CHECK IN/OUT CON QR ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in_qr(request):
    """
    Check-in usando código QR
    POST /api/check-in-qr/
    Body: { "qr_code": "FD-XXXXXXXXXX" }
    """
    qr_code = request.data.get('qr_code', '').strip()
    
    if not qr_code:
        return Response({'error': 'Código QR requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Buscar miembro por código QR
        miembro = Miembro.objects.get(qr_code=qr_code)
        ahora = timezone.now()
        hoy = ahora.date()
        
        # Verificar si ya hizo check-in hoy y no ha hecho check-out
        asistencia_activa = Asistencia.objects.filter(
            miembro=miembro,
            fecha_hora_entrada__date=hoy,
            fecha_hora_salida__isnull=True
        ).first()
        
        if asistencia_activa:
            return Response({
                'error': 'El miembro ya hizo check-in hoy',
                'asistencia_id': asistencia_activa.id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar membresía activa (considerar horario de cierre para day pass)
        from datetime import datetime, time
        
        # Obtener la membresía del miembro para saber si es day pass
        user_membership = UserMembership.objects.filter(
            user=miembro.user,
            end_date__gte=hoy
        ).order_by('-end_date').first()
        
        # Verificar fecha de vencimiento básica
        if not miembro.fecha_vencimiento or miembro.fecha_vencimiento < hoy:
            # RECHAZAR ACCESO si está vencido
            return Response({
                'error': f'Acceso Denegado: Membresía Vencida',
                'miembro': f'{miembro.nombre} {miembro.apellido}',
                'fecha_vencimiento': miembro.fecha_vencimiento,
                'acceso_permitido': False
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Si es day pass (1 día) y la fecha de vencimiento es hoy, validar horario de cierre (10 PM)
        if user_membership and user_membership.membership_type.duration_days == 1:
            if miembro.fecha_vencimiento == hoy:
                # Horario de cierre: 10 PM
                closing_time = timezone.make_aware(datetime.combine(hoy, time(22, 0, 0)))
                if ahora >= closing_time:
                    return Response({
                        'error': f'Acceso Denegado: Day Pass vencido (horario de cierre: 10 PM)',
                        'miembro': f'{miembro.nombre} {miembro.apellido}',
                        'fecha_vencimiento': miembro.fecha_vencimiento,
                        'acceso_permitido': False
                    }, status=status.HTTP_403_FORBIDDEN)
        
        # Membresía ACTIVA - Permitir acceso
        asistencia = Asistencia.objects.create(
            miembro=miembro,
            acceso_permitido=True,
            observacion="Acceso Permitido"
        )
        
        serializer = AsistenciaSerializer(asistencia, context={'request': request})
        
        return Response({
            'success': True,
            'message': f'Check-in exitoso para {miembro.nombre} {miembro.apellido}',
            'acceso_permitido': True,
            'asistencia': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Miembro.DoesNotExist:
        return Response({
            'error': 'Código QR no válido o miembro no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Error procesando check-in: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_out_qr(request):
    """
    Check-out usando código QR
    POST /api/check-out-qr/
    Body: { "qr_code": "FD-XXXXXXXXXX" }
    """
    qr_code = request.data.get('qr_code', '').strip()
    
    if not qr_code:
        return Response({'error': 'Código QR requerido'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Buscar miembro por código QR
        miembro = Miembro.objects.get(qr_code=qr_code)
        hoy = timezone.now().date()
        
        # Buscar asistencia activa (sin check-out)
        asistencia = Asistencia.objects.filter(
            miembro=miembro,
            fecha_hora_entrada__date=hoy,
            fecha_hora_salida__isnull=True
        ).first()
        
        if not asistencia:
            return Response({
                'error': 'No hay check-in activo para este miembro hoy'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Registrar salida
        asistencia.fecha_hora_salida = timezone.now()
        asistencia.save()
        
        serializer = AsistenciaSerializer(asistencia, context={'request': request})
        
        return Response({
            'success': True,
            'message': f'Check-out exitoso para {miembro.nombre} {miembro.apellido}',
            'tiempo_en_gym': asistencia.tiempo_en_gym,
            'asistencia': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Miembro.DoesNotExist:
        return Response({
            'error': 'Código QR no válido o miembro no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Error procesando check-out: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)