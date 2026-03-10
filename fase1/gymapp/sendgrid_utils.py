import os
from typing import List

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except Exception:
    SendGridAPIClient = None
    Mail = None


def sendgrid_send(api_key: str, subject: str, content: str, recipients: List[str], from_email: str = None):
    """Enviar correo usando la API Web de SendGrid.

    Lanza excepción si falla.
    """
    if not api_key:
        raise ValueError('Missing SendGrid API key')
    if SendGridAPIClient is None or Mail is None:
        raise RuntimeError('sendgrid package not installed')

    from_email = from_email or os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@fitdata.gym')

    message = Mail(
        from_email=from_email,
        to_emails=recipients,
        subject=subject,
        plain_text_content=content,
    )

    sg = SendGridAPIClient(api_key)
    try:
        response = sg.send(message)
        # Log básico para debugging (aparecerá en stdout/logs de Render)
        try:
            status = getattr(response, 'status_code', None)
            body = getattr(response, 'body', None)
            print(f"SendGrid response status: {status}")
            if body:
                # body puede ser bytes o str
                try:
                    print(f"SendGrid response body: {body.decode()}")
                except Exception:
                    print(f"SendGrid response body: {body}")
        except Exception:
            pass
        return response
    except Exception as e:
        # Capturar y mostrar información útil en logs para diagnosticar 403/4xx/5xx
        try:
            # La excepción del cliente puede contener 'status_code' y 'body'
            status = getattr(e, 'status_code', None)
            body = getattr(e, 'body', None)
            print(f"SendGrid API send failed - exception status: {status}")
            if body:
                try:
                    print(f"SendGrid API error body: {body.decode()}")
                except Exception:
                    print(f"SendGrid API error body: {body}")
        except Exception:
            pass
        # Re-lanzar para que el llamador quede informado (send_mail_async lo captura y lo registra)
        raise
