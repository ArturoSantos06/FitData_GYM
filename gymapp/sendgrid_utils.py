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
    response = sg.send(message)
    # Log básico para debugging (aparecerá en stdout/logs de Render)
    try:
        status = getattr(response, 'status_code', None)
        body = getattr(response, 'body', None)
        print(f"SendGrid response status: {status}")
        if body:
            print(f"SendGrid response body: {body}")
    except Exception:
        pass
    return response
