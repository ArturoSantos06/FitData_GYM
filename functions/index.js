const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const DEFAULT_FROM_EMAIL = defineSecret("DEFAULT_FROM_EMAIL");

admin.initializeApp();

setGlobalOptions({maxInstances: 10, region: "us-east1"});

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("es-MX");
};

const nodemailer = require("nodemailer");

const sendGmailSmtp = async ({toEmail, subject, message, defaultFrom}) => {
  const gmailUser = GMAIL_USER.value();
  const appPassword = GMAIL_APP_PASSWORD.value();
  const fromEmail = defaultFrom || "FitData GYM <fitdatagym@gmail.com>";

  if (!gmailUser || !appPassword) {
    throw new Error("Faltan secretos GMAIL_USER o GMAIL_APP_PASSWORD");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: appPassword,
    },
  });

  const info = await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject,
    text: message,
    html: `<pre>${message}</pre>`,
  });

  return {id: info.messageId};
};

exports.onMembershipCreatedSendEmail = onDocumentCreated({
  document: "memberships/{membershipId}",
  secrets: [
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    DEFAULT_FROM_EMAIL,
  ],
}, async (event) => {
  const membership = event.data?.data();
  if (!membership) {
    logger.warn("Evento memberships sin data, se omite");
    return;
  }

  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "membership-email",
      membershipId: event.params.membershipId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) {
      logger.info(`Evento duplicado ${event.id}, correo omitido`);
      return;
    }
    throw error;
  }

  const recipient = membership.userEmail;
  if (!recipient) {
    logger.warn("Membresía sin userEmail, no se envía correo", {membershipId: event.params.membershipId});
    return;
  }

  const total = Number(membership.membershipPrice || 0);
  const subtotal = total > 0 ? total / 1.16 : 0;
  const iva = total - subtotal;
  const paymentMethod = membership.paymentMethod || "EFECTIVO";
  const montoRecibido = Number(membership.montoRecibido || 0);
  const cambio = paymentMethod === "EFECTIVO" ? montoRecibido - total : 0;
  const clientName = membership.userFullName || membership.userName || recipient.split("@")[0] || "Cliente";
  const membershipName = membership.membershipTypeName || membership.membershipName || "Membresía";
  const durationDays = Number(membership.durationDays || 0);

  const subject = `Renovación Exitosa - ${membershipName}`;
  const message = [
    `Hola ${clientName}, gracias por tu renovación en FitData GYM.`,
    "",
    "========================================",
    "       TICKET DE RENOVACIÓN",
    "========================================",
    `CLIENTE:  ${clientName}`,
    `MEMBRESÍA: ${membershipName}`,
    `INICIO:   ${formatDate(membership.startDate)}`,
    `VENCE:    ${formatDate(membership.endDate)}`,
    `VIGENCIA: ${durationDays || "N/A"} día(s)`,
    "========================================",
    `SUBTOTAL:           $${subtotal.toFixed(2)}`,
    `IVA (16%):          $${iva.toFixed(2)}`,
    "----------------------------------------",
    `TOTAL:              $${total.toFixed(2)}`,
    "========================================",
    `MÉTODO DE PAGO:     ${paymentMethod}`,
    ...(paymentMethod === "EFECTIVO" ? [
      `EFECTIVO:           $${montoRecibido.toFixed(2)}`,
      `CAMBIO:             $${cambio.toFixed(2)}`,
    ] : []),
    "",
    "¡A entrenar con todo!",
  ].join("\n");

  try {
    const result = await sendGmailSmtp({
      toEmail: recipient,
      subject,
      message,
      defaultFrom: DEFAULT_FROM_EMAIL.value() || "FitData GYM <fitdatagym@gmail.com>",
    });

    await event.data.ref.update({
      renewalEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      renewalEmailStatus: "sent",
      renewalEmailProvider: "gmail-api",
      renewalEmailMessageId: result.id || null,
    });

    logger.info("Correo de renovación enviado", {
      membershipId: event.params.membershipId,
      email: recipient,
      messageId: result.id,
    });
  } catch (error) {
    await event.data.ref.update({
      renewalEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      renewalEmailStatus: "failed",
      renewalEmailProvider: "gmail-api",
      renewalEmailError: String(error.message || error),
    });

    logger.error("Error enviando correo de renovación", {
      membershipId: event.params.membershipId,
      email: recipient,
      error: String(error.message || error),
    });
  }
});

// ========================================
// TRIGGER: Enviar comprobante de venta
// ========================================
exports.onSaleCreatedSendEmail = onDocumentCreated({
  document: "ventas/{ventaId}",
  secrets: [
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    DEFAULT_FROM_EMAIL,
  ],
}, async (event) => {
  const venta = event.data?.data();
  if (!venta) {
    logger.warn("Evento ventas sin data, se omite");
    return;
  }

  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "sale-email",
      ventaId: event.params.ventaId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) {
      logger.info(`Evento duplicado ${event.id}, correo omitido`);
      return;
    }
    throw error;
  }

  const recipient = venta.clienteEmail;
  if (!recipient) {
    logger.warn("Venta sin clienteEmail, no se envía correo", {ventaId: event.params.ventaId});
    return;
  }

  const total = Number(venta.total || 0);
  const subtotal = total > 0 ? total / 1.16 : 0;
  const iva = total - subtotal;
  const paymentMethod = venta.metodo_pago || "EFECTIVO";
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambio = paymentMethod === "EFECTIVO" ? montoRecibido - total : 0;
  const clientName = venta.clienteNombre || recipient.split("@")[0] || "Cliente";
  const folio = venta.folio || "S/N";
  const fecha = new Date(venta.fecha?.toDate?.() || venta.fecha || new Date());
  const fechaStr = fecha.toLocaleDateString("es-MX");

  // Parsear detalle_productos (puede ser JSON string o array)
  let productos = [];
  try {
    if (typeof venta.detalle_productos === "string") {
      productos = JSON.parse(venta.detalle_productos);
    } else if (Array.isArray(venta.detalle_productos)) {
      productos = venta.detalle_productos;
    }
  } catch (e) {
    logger.warn("Error parseando detalle_productos", {error: e});
  }

  const detalleProductos = productos
    .map((p) => `- ${p.nombre || p.name || "Producto"} x${p.cantidad || 1} = $${p.precio || p.price || 0}`)
    .join("\n") || "Sin detalles";

  const subject = `Comprobante de Venta - Folio: ${folio}`;
  const message = [
    `Hola ${clientName}, gracias por tu compra en FitData GYM.`,
    "",
    "========================================",
    "       COMPROBANTE DE VENTA",
    "========================================",
    `FOLIO:    ${folio}`,
    `FECHA:    ${fechaStr}`,
    `CLIENTE:  ${clientName}`,
    "========================================",
    "",
    "PRODUCTOS:",
    detalleProductos,
    "",
    "========================================",
    `SUBTOTAL:           $${subtotal.toFixed(2)}`,
    `IVA (16%):          $${iva.toFixed(2)}`,
    "----------------------------------------",
    `TOTAL:              $${total.toFixed(2)}`,
    "========================================",
    `MÉTODO DE PAGO:     ${paymentMethod}`,
    ...(paymentMethod === "EFECTIVO" ? [
      `EFECTIVO:           $${montoRecibido.toFixed(2)}`,
      `CAMBIO:             $${cambio.toFixed(2)}`,
    ] : []),
    "",
    "¡Gracias por tu preferencia!",
  ].join("\n");

  try {
    const result = await sendGmailSmtp({
      toEmail: recipient,
      subject,
      message,
      defaultFrom: DEFAULT_FROM_EMAIL.value() || "FitData GYM <fitdatagym@gmail.com>",
    });

    await event.data.ref.update({
      saleEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      saleEmailStatus: "sent",
      saleEmailProvider: "gmail-smtp",
      saleEmailMessageId: result.id || null,
    });

    logger.info("Comprobante de venta enviado", {
      ventaId: event.params.ventaId,
      email: recipient,
      folio,
      messageId: result.id,
    });
  } catch (error) {
    await event.data.ref.update({
      saleEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      saleEmailStatus: "failed",
      saleEmailProvider: "gmail-smtp",
      saleEmailError: String(error.message || error),
    });

    logger.error("Error enviando comprobante de venta", {
      ventaId: event.params.ventaId,
      email: recipient,
      error: String(error.message || error),
    });
  }
});

// ========================================
// TRIGGER: Enviar bienvenida a nuevo cliente
// ========================================
exports.onMemberCreatedSendEmail = onDocumentCreated({
  document: "miembros/{memberId}",
  secrets: [
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    DEFAULT_FROM_EMAIL,
  ],
}, async (event) => {
  const miembro = event.data?.data();
  if (!miembro) {
    logger.warn("Evento miembros sin data, se omite");
    return;
  }

  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "member-email",
      memberId: event.params.memberId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) {
      logger.info(`Evento duplicado ${event.id}, correo omitido`);
      return;
    }
    throw error;
  }

  const recipient = miembro.email;
  if (!recipient) {
    logger.warn("Miembro sin email, no se envía correo", {memberId: event.params.memberId});
    return;
  }

  const nombre = miembro.nombre || "Cliente";
  const apellido = miembro.apellido || "";
  const nombreCompleto = `${nombre} ${apellido}`.trim();
  const fechaInscripcion = new Date(miembro.fecha_inscripcion?.toDate?.() || miembro.fecha_inscripcion || new Date());
  const fechaStr = fechaInscripcion.toLocaleDateString("es-MX");

  // DATOS DE MEMBRESÍA (pago inicial)
  const folio = miembro.folio || "N/A";
  const membershipName = miembro.membershipTypeName || miembro.membershipName || "Membresía";
  const total = Number(miembro.membershipPrice || 0);
  const subtotal = total > 0 ? total / 1.16 : 0;
  const iva = total - subtotal;
  const paymentMethod = miembro.paymentMethod || "EFECTIVO";
  const montoRecibido = Number(miembro.montoRecibido || 0);
  const cambio = paymentMethod === "EFECTIVO" ? montoRecibido - total : 0;

  const subject = `¡Bienvenido a FitData GYM, ${nombre}! - Folio: ${folio}`;
  const message = [
    `Hola ${nombre}, ¡bienvenido a FitData GYM!`,
    "",
    "Gracias por registrarte. Te compartimos los detalles de tu membresía inicial.",
    "",
    "========================================",
    "    CONFIRMACIÓN DE REGISTRO Y PAGO",
    "========================================",
    `FOLIO:    ${folio}`,
    `FECHA:    ${fechaStr}`,
    `CLIENTE:  ${nombreCompleto}`,
    "========================================",
    "",
    "MEMBRESÍA ADQUIRIDA:",
    `- 1x ${membershipName}`,
    "",
    "========================================",
    `SUBTOTAL:           $${subtotal.toFixed(2)}`,
    `IVA (16%):          $${iva.toFixed(2)}`,
    "----------------------------------------",
    `TOTAL:              $${total.toFixed(2)}`,
    "========================================",
    `MÉTODO DE PAGO:     ${paymentMethod}`,
    ...(paymentMethod === "EFECTIVO" ? [
      `EFECTIVO:           $${montoRecibido.toFixed(2)}`,
      `CAMBIO:             $${cambio.toFixed(2)}`,
    ] : []),
    "",
    "PRÓXIMOS PASOS:",
    "1. Completa tu perfil de salud en la app",
    "2. Descarga la app FitData GYM",
    "3. ¡Comienza a entrenar!",
    "",
    "========================================",
    "",
    "Si tienes dudas, contactanos:",
    "📧 fitdatagym@gmail.com",
    "",
    "¡A entrenar con todo!",
  ].join("\n");

  try {
    const result = await sendGmailSmtp({
      toEmail: recipient,
      subject,
      message,
      defaultFrom: DEFAULT_FROM_EMAIL.value() || "FitData GYM <fitdatagym@gmail.com>",
    });

    await event.data.ref.update({
      welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      welcomeEmailStatus: "sent",
      welcomeEmailProvider: "gmail-smtp",
      welcomeEmailMessageId: result.id || null,
    });

    logger.info("Email de bienvenida y pago enviado", {
      memberId: event.params.memberId,
      email: recipient,
      nombre,
      folio,
      messageId: result.id,
    });
  } catch (error) {
    await event.data.ref.update({
      welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      welcomeEmailStatus: "failed",
      welcomeEmailProvider: "gmail-smtp",
      welcomeEmailError: String(error.message || error),
    });

    logger.error("Error enviando email de bienvenida y pago", {
      memberId: event.params.memberId,
      email: recipient,
      error: String(error.message || error),
    });
  }
});
