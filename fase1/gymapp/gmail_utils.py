"""
Utilidad para enviar correos usando Gmail API (HTTP) con OAuth2.
Compatible con Render - no requiere SMTP.
"""
import os
import base64
import json
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def send_gmail_api(subject, message, to_email, from_email=None):
    """
    Envía correo usando Gmail API con OAuth2 refresh token.
    
    Requiere variables de entorno:
    - GMAIL_REFRESH_TOKEN: Token de actualización OAuth2
    - GMAIL_CLIENT_ID: Client ID de Google Cloud
    - GMAIL_CLIENT_SECRET: Client Secret de Google Cloud
    - DEFAULT_FROM_EMAIL: Email del remitente (fitdatagym@gmail.com)
    
    Args:
        subject: Asunto del correo
        message: Cuerpo del correo (texto plano)
        to_email: Destinatario
        from_email: Remitente (opcional)
    
    Returns:
        dict: Respuesta de la API con messageId
    
    Raises:
        Exception: Si falla el envío
    """
    refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
    client_id = os.environ.get('GMAIL_CLIENT_ID')
    client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
    default_from = os.environ.get('DEFAULT_FROM_EMAIL', 'fitdatagym@gmail.com')
    
    if not all([refresh_token, client_id, client_secret]):
        raise ValueError("Faltan credenciales Gmail OAuth2. Verifica variables de entorno.")
    
    if not from_email:
        from_email = default_from
    
    # Crear credenciales OAuth2
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_id,
        client_secret=client_secret,
        scopes=['https://www.googleapis.com/auth/gmail.send']
    )
    
    # Refrescar el token si es necesario
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
    
    # Construir servicio Gmail API
    service = build('gmail', 'v1', credentials=creds)
    
    # Crear mensaje MIME
    mime_message = MIMEText(message)
    mime_message['to'] = to_email
    mime_message['from'] = from_email
    mime_message['subject'] = subject
    
    # Codificar en base64
    raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode('utf-8')
    
    # Enviar
    result = service.users().messages().send(
        userId='me',
        body={'raw': raw_message}
    ).execute()
    
    print(f"✅ Gmail API: Correo enviado a {to_email}, messageId={result.get('id')}")
    return result
