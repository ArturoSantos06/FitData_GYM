from gymapp.models import Miembro, UserMembership

# Obtener el miembro
miembro = Miembro.objects.get(email='00834546@red.unid.mx')

# Buscar su membresía
user_membership = UserMembership.objects.filter(user=miembro.user).first()

if user_membership:
    miembro.fecha_vencimiento = user_membership.end_date
    miembro.save()
    print(f'✅ Fecha actualizada para {miembro.nombre} {miembro.apellido}')
    print(f'   Fecha de vencimiento: {miembro.fecha_vencimiento}')
else:
    print('❌ Este usuario no tiene membresía asignada')
