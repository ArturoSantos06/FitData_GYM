"""
Script para obtener el refresh token de Gmail OAuth2.
Ejecutar UNA VEZ localmente, luego usar el token en producción.
"""
from google_auth_oauthlib.flow import InstalledAppFlow
import json

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_refresh_token():
    """Obtiene el refresh token mediante flujo OAuth2"""
    # Asume que tienes client_secret.json en la misma carpeta
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secret.json',
        scopes=SCOPES
    )
    
    # Usar puerto fijo 8080 (ya está en las URIs autorizadas)
    creds = flow.run_local_server(port=8080)
    
    print("\n" + "="*60)
    print("✅ AUTORIZACIÓN EXITOSA")
    print("="*60)
    print("\nGuarda estas credenciales en Render:\n")
    print(f"GMAIL_CLIENT_ID={creds.client_id}")
    print(f"GMAIL_CLIENT_SECRET={creds.client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    print("\n" + "="*60)
    
    # Guardar en archivo local (NO subir a Git)
    with open('gmail_tokens.json', 'w') as f:
        json.dump({
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'refresh_token': creds.refresh_token
        }, f, indent=2)
    
    print("\n✅ Tokens guardados en: gmail_tokens.json")
    print("⚠️  NO SUBAS este archivo a GitHub\n")

if __name__ == '__main__':
    print("🔐 Obteniendo refresh token para Gmail API...")
    print("Se abrirá tu navegador para autorizar.\n")
    get_refresh_token()
