from django.contrib import admin
# Importamos ambos modelos: MembershipType y UserMembership
from .models import MembershipType, UserMembership 

# Register your models here.

admin.site.register(MembershipType)
admin.site.register(UserMembership) 