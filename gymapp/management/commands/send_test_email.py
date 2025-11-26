from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Enviar un email de prueba usando SendGrid API (si está configurada) o SMTP fallback.'

    def add_arguments(self, parser):
        parser.add_argument('recipient', type=str, help='Correo destinatario')
        parser.add_argument('--subject', type=str, default='Prueba FitData', help='Asunto del correo')
        parser.add_argument('--message', type=str, default='Mensaje de prueba desde FitData', help='Contenido del correo')

    def handle(self, *args, **options):
        recipient = options['recipient']
        subject = options['subject']
        message = options['message']

        sg_key = os.environ.get('SENDGRID_API_KEY') or getattr(settings, 'SENDGRID_API_KEY', None)

        if sg_key:
            try:
                from gymapp.sendgrid_utils import sendgrid_send
                resp = sendgrid_send(sg_key, subject, message, [recipient], from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None))
                self.stdout.write(self.style.SUCCESS(f'SendGrid response status: {getattr(resp, "status_code", "unknown")}'))
                return
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'SendGrid API failed: {e}'))

        # Fallback SMTP
        try:
            from django.core.mail import send_mail
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            sent = send_mail(subject, message, from_email, [recipient], fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f'SMTP send_mail returned: {sent}'))
        except Exception as e:
            raise CommandError(f'SMTP send failed: {e}')
