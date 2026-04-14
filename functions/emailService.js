const nodemailer = require('nodemailer');

const sendMarketingEmail = async (toEmail, userName, tipoCampaña, dias = 0) => {
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'fitdatagym@gmail.com', // Tu correo oficial
            pass: process.env.GYM_EMAIL_PASS  // secreto de Firebase
        }
    });

    let subjectText = '';
    let mainMessage = '';
    let subMessage = '';
    let callToAction = 'Iniciar Sesión';
    
    // Cambiar url por una real de fit
    const loginUrl = 'https://fitdatagym-f347a.web.app/login'; 

    // CEREBRO DE MARKETING 
    switch (tipoCampaña) {
        case 'VENCIMIENTO_HOY':
            subjectText = '🚨 Tu membresía en FitData GYM vence HOY';
            mainMessage = `¡Hola, ${userName}! Tu membresía llega hoy a su fin.`;
            subMessage = 'No dejes que tu progreso se detenga. Pasa a recepción hoy mismo para no perder tu racha.';
            break;
            
        case 'RECORDATORIO_5_DIAS':
            subjectText = '⏰ Tu membresía está por vencer';
            mainMessage = `¡Hola, ${userName}! Te quedan 5 días de entrenamiento.`;
            subMessage = 'Anticipa tu renovación para que no pierdas ni un solo día. ¡Te esperamos!';
            break;

        case 'DAY_PASS_UPGRADE':
            subjectText = '🔥 ¿Te gustó entrenar ayer? Hazlo oficial';
            mainMessage = `¡Qué buen entrenamiento, ${userName}!`;
            subMessage = 'Vimos que usaste un Day Pass ayer. Si hoy decides adquirir una mensualidad, te bonificamos el costo de tu pase. ¡Aprovecha la motivación!';
            callToAction = 'Ver Mensualidades';
            break;

        case 'VIP_RENEWAL':
            subjectText = '⭐ Eres Leyenda en FitData GYM';
            mainMessage = `¡Gracias por tu lealtad, ${userName}!`;
            subMessage = 'Estás a 30 días de cumplir tu anualidad con nosotros. Renueva este mes y obtén un 20% de descuento directo o 1 mes extra gratis.';
            callToAction = 'Canjear mi Regalo';
            break;

        case 'PREVENCION_ABANDONO':
            subjectText = '👀 ¡Te extrañamos en FitData GYM!';
            mainMessage = `¡Hola, ${userName}! Notamos que llevas unos días sin venir.`;
            subMessage = 'La constancia es la clave del éxito. Regresa a entrenar esta semana y no pierdas el progreso que has logrado.';
            callToAction = 'Agendar mi regreso';
            break;
    }

    // DISEÑO 
    const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #0f172a; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; border-bottom: 3px solid #2dd4bf;">
            <h1 style="color: #2dd4bf; margin: 0; font-size: 28px; letter-spacing: 2px;">FitData GYM</h1>
        </div>
        <div style="padding: 40px 30px; background-color: #1e293b; color: #f8fafc;">
            <h2 style="color: #f1f5f9; font-size: 20px; margin-top: 0;">${mainMessage}</h2>
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">${subMessage}</p>
            <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
                <a href="${loginUrl}" style="background-color: #0d9488; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">${callToAction}</a>
            </div>
        </div>
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 FitData GYM. Todos los derechos reservados.</p>
        </div>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: '"FitData GYM" <fitdatagym@gmail.com>',
            to: toEmail,
            subject: subjectText,
            html: htmlTemplate 
        });
        console.log(`✅ [${tipoCampaña}] Correo enviado a ${toEmail}`);
        return true;
    } catch (error) {
        console.error(`❌ Error al enviar a ${toEmail}:`, error);
        return false;
    }
};

module.exports = { sendMarketingEmail };