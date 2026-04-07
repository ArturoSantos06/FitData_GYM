const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const DEFAULT_FROM_EMAIL = defineSecret("DEFAULT_FROM_EMAIL");

admin.initializeApp();

setGlobalOptions({maxInstances: 10, region: "us-east1", invoker: "public"});

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("es-MX");
};

const normalizeComparableText = (value = "") => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const generateSaleFolio = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `V-${timestamp}-${random}`;
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

  try {
    await event.data.ref.update({
      renewalEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      renewalEmailStatus: "skipped_initial_registration",
      renewalEmailProvider: "none",
    });
  } catch (error) {
    logger.warn("No se pudo marcar skip en membership", {
      membershipId: event.params.membershipId,
      error: String(error.message || error),
    });
  }

  logger.info("Correo de membership omitido para evitar duplicado", {
    membershipId: event.params.membershipId,
    reason: "initial_registration",
  });
  return;

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


// TRIGGER: Enviar comprobante de venta

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

  if ((venta.tipo_venta || "") === "ALTA_MEMBRESIA") {
    try {
      await event.data.ref.update({
        saleEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        saleEmailStatus: "skipped_initial_registration",
        saleEmailProvider: "none",
      });
    } catch (error) {
      logger.warn("No se pudo marcar skip en venta", {
        ventaId: event.params.ventaId,
        error: String(error.message || error),
      });
    }

    logger.info("Comprobante de venta omitido para alta inicial", {
      ventaId: event.params.ventaId,
      folio: venta.folio || "S/N",
    });
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
    `Hola ${nombre}, ¡Bienvenido a FitData GYM!`,
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
    "2. Abre tu portal cliente FitData GYM",
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

exports.createUserAccount = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new Error("No autenticado");
  }

  const {email, password, displayName} = request.data;

  if (!email || !password) {
    throw new Error("Email y contraseña son requeridos");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || null,
    });

    logger.info("Usuario creado exitosamente", {
      uid: userRecord.uid,
      email: userRecord.email,
      createdBy: request.auth.uid,
    });

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
    };
  } catch (error) {
    logger.error("Error creando usuario", {
      email,
      error: String(error.message || error),
    });

    throw new Error(error.message || "Error creando usuario");
  }
});

const assertAdminRequest = async (request, db) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  if (request.auth.token?.admin === true ||
      String(request.auth.token?.role || "").toLowerCase() === "admin") {
    return;
  }

  const directUserDoc = await db.collection("users").doc(request.auth.uid).get();
  if (directUserDoc.exists && String(directUserDoc.data()?.role || "").toLowerCase() === "admin") {
    return;
  }

  const byAuthUid = await db.collection("users")
      .where("authUid", "==", request.auth.uid)
      .limit(1)
      .get();

  if (!byAuthUid.empty) {
    const role = String(byAuthUid.docs[0].data()?.role || "").toLowerCase();
    if (role === "admin") {
      return;
    }
  }

  throw new HttpsError("permission-denied", "No tienes permisos de administrador");
};

const buildUsernameFromEmail = (email = "") => {
  const localPart = String(email).split("@")[0] || "usuario";
  return localPart
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 40) || "usuario";
};

exports.registerTrainerByAdmin = onCall({cors: true, invoker: "public"}, async (request) => {
  const db = admin.firestore();

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    contractType,
  } = request.data || {};

  if (!email || !password || !firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Faltan campos requeridos para el registro del entrenador");
  }

  let createdAuthUid = null;

  try {
    await assertAdminRequest(request, db);

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });
    createdAuthUid = authUser.uid;

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const resolvedUsername = String(username || "").trim() || buildUsernameFromEmail(email);

    await db.collection("users").doc(authUser.uid).set({
      email,
      username: resolvedUsername,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      role: "trainer",
      contractType: contractType || "Asignación por cliente",
      tipoContrato: contractType || "Asignación por cliente",
      isStaff: true,
      isSuperuser: false,
      isActive: true,
      authUid: authUser.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, {merge: true});

    await admin.auth().setCustomUserClaims(authUser.uid, {
      role: "TRAINER",
      trainer: true,
    });

    return {
      success: true,
      id: authUser.uid,
      authUid: authUser.uid,
      email,
      role: "trainer",
    };
  } catch (error) {
    if (createdAuthUid) {
      try {
        await admin.auth().deleteUser(createdAuthUid);
      } catch (rollbackError) {
        logger.error("No se pudo revertir usuario auth de entrenador", {
          uid: createdAuthUid,
          error: String(rollbackError.message || rollbackError),
        });
      }
    }

    logger.error("Error en registerTrainerByAdmin", {
      email,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "No se pudo registrar al entrenador");
  }
});

const registerNutriologoByAdminHandler = async (request) => {
  const db = admin.firestore();

  const {
    email,
    password,
    firstName,
    lastName,
    especialidad,
  } = request.data || {};

  if (!email || !password || !firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Faltan campos requeridos para el registro del nutriólogo");
  }

  let createdAuthUid = null;

  try {
    await assertAdminRequest(request, db);

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });
    createdAuthUid = authUser.uid;

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("users").doc(authUser.uid).set({
      email,
      username: buildUsernameFromEmail(email),
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      role: "nutriologo",
      especialidad: String(especialidad || "Nutrición general").trim(),
      isStaff: true,
      isSuperuser: false,
      isActive: true,
      authUid: authUser.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, {merge: true});

    await admin.auth().setCustomUserClaims(authUser.uid, {
      role: "NUTRIOLOGO",
      nutriologo: true,
    });

    return {
      success: true,
      id: authUser.uid,
      authUid: authUser.uid,
      email,
      role: "nutriologo",
    };
  } catch (error) {
    if (createdAuthUid) {
      try {
        await admin.auth().deleteUser(createdAuthUid);
      } catch (rollbackError) {
        logger.error("No se pudo revertir usuario auth de nutriologo", {
          uid: createdAuthUid,
          error: String(rollbackError.message || rollbackError),
        });
      }
    }

    logger.error("Error en registerNutriologoByAdmin", {
      email,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "No se pudo registrar al nutriólogo");
  }
};

exports.registerNutriologoByAdmin = onCall(
    {cors: true, invoker: "public"},
    registerNutriologoByAdminHandler,
);

// Alias para evitar endpoint legacy con permisos atascados.
exports.registerNutriologoByAdminV2 = onCall(
    {cors: true, invoker: "public"},
    registerNutriologoByAdminHandler,
);

exports.registerClientByAdmin = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
    membershipTypeId,
    paymentMethod,
    montoRecibido,
  } = request.data || {};

  if (!username || !email || !password || !firstName || !lastName || !phone || !membershipTypeId) {
    throw new HttpsError("invalid-argument", "Faltan campos requeridos para el registro");
  }

  const normalizedPhone = String(phone).replace(/\D/g, "").slice(0, 10);
  if (!/^\d{10}$/.test(normalizedPhone)) {
    throw new HttpsError("invalid-argument", "Número de teléfono inválido");
  }

  const db = admin.firestore();

  try {
    await assertAdminRequest(request, db);

    const normalizedUsername = normalizeComparableText(username);
    if (!normalizedUsername) {
      throw new HttpsError("invalid-argument", "El nombre de usuario es requerido");
    }

    const normalizedFirstName = normalizeComparableText(firstName);
    const normalizedLastName = normalizeComparableText(lastName);
    if (!normalizedFirstName || !normalizedLastName) {
      throw new HttpsError("invalid-argument", "El nombre y los apellidos son requeridos");
    }

    const usersSnapshot = await db.collection("users").get();
    const duplicatedUsernameDoc = usersSnapshot.docs.find((docSnap) => {
      const userData = docSnap.data() || {};
      const existingUsername = userData.username || userData.userName || "";
      return normalizeComparableText(existingUsername) === normalizedUsername;
    });

    if (duplicatedUsernameDoc) {
      throw new HttpsError("already-exists", "Ya existe un usuario registrado con ese nombre de usuario");
    }

    const duplicatedLastNameDoc = usersSnapshot.docs.find((docSnap) => {
      const userData = docSnap.data() || {};
      const userRole = userData.role;

      if (userRole && userRole !== "client") {
        return false;
      }

      const existingFirstName = userData.firstName || userData.first_name || userData.nombre || "";
      const existingLastName = userData.lastName || userData.last_name || userData.apellido || "";

      return (
        normalizeComparableText(existingFirstName) === normalizedFirstName &&
        normalizeComparableText(existingLastName) === normalizedLastName
      );
    });

    if (duplicatedLastNameDoc) {
      throw new HttpsError("already-exists", "Ya existe un cliente registrado con el mismo nombre y apellidos");
    }

    const membershipTypeDoc = await db.collection("membershipTypes").doc(String(membershipTypeId)).get();
    if (!membershipTypeDoc.exists) {
      throw new HttpsError("not-found", "Tipo de membresía no encontrado");
    }
    const membershipType = membershipTypeDoc.data() || {};

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });

    const now = new Date();
    const mexicoOffset = -6 * 60; 
    const localDate = new Date(now.getTime() + (now.getTimezoneOffset() + mexicoOffset) * 60000);
    const today = localDate;
    
    const durationDays = Number(membershipType.duration_days || membershipType.durationDays || 30);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + durationDays);
    const startDateIso = today.toISOString().split("T")[0];
    const endDateIso = endDate.toISOString().split("T")[0];

    const counterRef = db.collection("_meta").doc("counters");

    const registration = await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);

      let nextId = 1;

      if (counterSnap.exists && Number.isFinite(Number(counterSnap.data()?.lastNumericId))) {
        nextId = Number(counterSnap.data().lastNumericId) + 1;
      } else {
        const [usersSnap, membersSnap, membershipsSnap] = await Promise.all([
          db.collection("users").get(),
          db.collection("miembros").get(),
          db.collection("memberships").get(),
        ]);

        let maxId = 0;
        [usersSnap, membersSnap, membershipsSnap].forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            const parsed = Number(docSnap.id);
            if (Number.isInteger(parsed) && String(parsed) === docSnap.id && parsed > maxId) {
              maxId = parsed;
            }
          });
        });

        nextId = maxId + 1;
      }

      const newId = String(nextId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const fullName = `${firstName} ${lastName}`.trim();
      const membershipPrice = Number(membershipType.price || 0);
      const received = Number(montoRecibido || 0);
      const payMethod = paymentMethod || "EFECTIVO";
      const saleFolio = generateSaleFolio();

      tx.set(db.collection("users").doc(newId), {
        email,
        username,
        firstName,
        lastName,
        phone: normalizedPhone,
        telefono: normalizedPhone,
        displayName: fullName,
        role: "client",
        isStaff: false,
        isSuperuser: false,
        isActive: true,
        authUid: authUser.uid,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (membershipPrice > 0) {
        const saleRef = db.collection("ventas").doc();
        tx.set(saleRef, {
          folio: saleFolio,
          cliente: newId,
          cliente_id: newId,
          cliente_username: username,
          cliente_email: email,
          clienteEmail: email,
          clienteNombre: fullName || username || email,
          metodo_pago: payMethod,
          total: membershipPrice,
          monto_recibido: payMethod === "EFECTIVO" ? (received || membershipPrice) : membershipPrice,
          detalle_productos: JSON.stringify([
            {
              nombre: `Membresía: ${membershipType.name || "Membresía"}`,
              precio: membershipPrice,
              cantidad: 1,
            },
          ]),
          tipo_venta: "ALTA_MEMBRESIA",
          fecha: timestamp,
          createdAt: timestamp,
        });
      }

      tx.set(db.collection("miembros").doc(newId), {
        userId: newId,
        authUid: authUser.uid,
        nombre: firstName,
        apellido: lastName,
        email,
        telefono: normalizedPhone,
        qr_code: `FD-USER${newId}`,
        qrCode: `FD-USER${newId}`,
        avatar_color: "#6366f1",
        avatarColor: "#6366f1",
        active: true,
        membershipTypeName: membershipType.name || "",
        membershipName: membershipType.name || "",
        membershipPrice,
        paymentMethod: payMethod,
        montoRecibido: payMethod === "EFECTIVO" ? (received || membershipPrice) : membershipPrice,
        folio: membershipPrice > 0 ? saleFolio : "N/A",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      tx.set(db.collection("memberships").doc(newId), {
        userId: newId,
        authUid: authUser.uid,
        userName: username,
        userEmail: email,
        userFullName: fullName,
        membershipTypeId: String(membershipTypeId),
        membershipTypeName: membershipType.name || "",
        membershipName: membershipType.name || "",
        membershipPrice,
        price: membershipPrice,
        durationDays,
        startDate: startDateIso,
        endDate: endDateIso,
        active: true,
        paymentMethod: payMethod,
        montoRecibido: payMethod === "EFECTIVO" ? received : membershipPrice,
        cambio: payMethod === "EFECTIVO" ? received - membershipPrice : 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      tx.set(counterRef, {
        lastNumericId: nextId,
        updatedAt: timestamp,
      }, {merge: true});

      return {
        id: newId,
        authUid: authUser.uid,
        membershipTypeName: membershipType.name || "",
        membershipPrice,
        saleFolio,
      };
    });

    logger.info("Registro de cliente completado", {
      byAdmin: request.auth.uid,
      id: registration.id,
      authUid: registration.authUid,
      email,
    });

    return {
      success: true,
      id: registration.id,
      authUid: registration.authUid,
      email,
      membershipTypeName: registration.membershipTypeName,
      membershipPrice: registration.membershipPrice,
      saleFolio: registration.saleFolio,
    };
  } catch (error) {
    logger.error("Error en registerClientByAdmin", {
      email,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "No se pudo registrar el cliente");
  }
});


exports.updateClientEmail = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const { newEmail, userId } = request.data || {};
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com)$/i;

  if (!newEmail || !emailRegex.test(newEmail)) {
    throw new HttpsError("invalid-argument", "Correo inválido. Solo se aceptan dominios: gmail, outlook, hotmail, yahoo o icloud.");
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;

  try {
    await admin.auth().updateUser(authUid, { email: newEmail });

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const updates = [];


    if (userId) {
      const userRef = db.collection("users").doc(String(userId));
      updates.push(userRef.update({ email: newEmail, updatedAt: timestamp }));
    }
    const usersByAuthUid = await db.collection("users").where("authUid", "==", authUid).limit(1).get();
    if (!usersByAuthUid.empty) {
      updates.push(usersByAuthUid.docs[0].ref.update({ email: newEmail, updatedAt: timestamp }));
    }

    // 3. Actualizar colección miembros
    const miembrosByAuthUid = await db.collection("miembros").where("authUid", "==", authUid).limit(1).get();
    if (!miembrosByAuthUid.empty) {
      updates.push(miembrosByAuthUid.docs[0].ref.update({ email: newEmail, updatedAt: timestamp }));
    }

    const candidates = authUid ? [authUid] : [];
    if (userId) {
      candidates.push(String(userId));
      const numericId = Number(userId);
      if (!Number.isNaN(numericId)) candidates.push(numericId);
    }

    const membershipQueries = [
      db.collection("memberships").where("authUid", "==", authUid).get(),
    ];
    if (userId) {
      membershipQueries.push(db.collection("memberships").where("userId", "==", String(userId)).get());
    }

    const membershipSnaps = await Promise.all(membershipQueries);
    const dedupDocs = new Map();
    membershipSnaps.forEach((snap) => snap.docs.forEach((d) => dedupDocs.set(d.id, d)));
    dedupDocs.forEach((d) => {
      updates.push(d.ref.update({ userEmail: newEmail, updatedAt: timestamp }));
    });

    await Promise.all(updates);

    logger.info("Email actualizado correctamente", { authUid, newEmail, membershipsUpdated: dedupDocs.size });
    return { success: true };
  } catch (error) {
    logger.error("Error actualizando email", { authUid, error: String(error.message) });
    throw new HttpsError("internal", error.message || "No se pudo actualizar el correo");
  }
});

exports.updateSelfProfile = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const authUid = request.auth.uid;
  const tokenEmail = String(request.auth.token.email || "").trim().toLowerCase();
  const {
    userId,
    email,
    username,
    telefono,
  } = request.data || {};

  const normalizedUsername = String(username || "").trim();
  const normalizedEmail = String(email || tokenEmail || "").trim().toLowerCase();
  const normalizedPhone = String(telefono || "").replace(/\D/g, "").slice(0, 10);

  if (!normalizedUsername) {
    throw new HttpsError("invalid-argument", "El nombre de usuario es obligatorio");
  }

  const db = admin.firestore();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  try {
    const userDocIds = new Set();
    if (userId !== undefined && userId !== null && String(userId).trim()) {
      userDocIds.add(String(userId).trim());
    }
    userDocIds.add(authUid);

    const byAuthUid = await db.collection("users").where("authUid", "==", authUid).limit(5).get();
    byAuthUid.docs.forEach((d) => userDocIds.add(d.id));

    if (tokenEmail) {
      const byEmail = await db.collection("users").where("email", "==", tokenEmail).limit(5).get();
      byEmail.docs.forEach((d) => userDocIds.add(d.id));
    }

    const userPayload = {
      username: normalizedUsername,
      email: normalizedEmail || null,
      phone: normalizedPhone,
      telefono: normalizedPhone,
      updatedAt: timestamp,
    };

    let usersUpdated = 0;
    for (const docId of userDocIds) {
      if (!docId) continue;
      const ref = db.collection("users").doc(docId);
      const snap = await ref.get();
      if (!snap.exists) continue;
      await ref.update(userPayload);
      usersUpdated += 1;
    }

    const memberUserIdCandidates = new Set();
    memberUserIdCandidates.add(authUid);
    if (userId !== undefined && userId !== null && String(userId).trim()) {
      memberUserIdCandidates.add(String(userId).trim());
      const n = Number(userId);
      if (!Number.isNaN(n)) memberUserIdCandidates.add(n);
    }

    let membersUpdated = 0;
    const memberTargets = new Map();

    const membersByAuthUid = await db.collection("miembros").where("authUid", "==", authUid).get();
    membersByAuthUid.docs.forEach((d) => memberTargets.set(d.id, d.ref));

    for (const candidate of memberUserIdCandidates) {
      const memberByUserId = await db.collection("miembros").where("userId", "==", candidate).get();
      memberByUserId.docs.forEach((d) => memberTargets.set(d.id, d.ref));
    }

    for (const [, ref] of memberTargets) {
      await ref.update({
        email: normalizedEmail || null,
        telefono: normalizedPhone,
        updatedAt: timestamp,
      });
      membersUpdated += 1;
    }

    logger.info("Perfil propio actualizado", {
      authUid,
      usersUpdated,
      membersUpdated,
    });

    return { success: true, usersUpdated, membersUpdated };
  } catch (error) {
    logger.error("Error en updateSelfProfile", {
      authUid,
      error: String(error.message || error),
    });
    throw new HttpsError("internal", error.message || "No se pudo actualizar el perfil");
  }
});

exports.downloadDietFile = onRequest({ cors: true, region: "us-east1" }, async (req, res) => {
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");
  let decoded = null;

  if (hasBearer) {
    const idToken = authHeader.slice(7);
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }
  }

  const storagePath = req.query.path;
  const fileName = req.query.name || "archivo";
  const downloadToken = String(req.query.token || "").trim();

  if (!storagePath) {
    return res.status(400).json({ error: "Falta el parámetro path" });
  }

  try {
    if (hasBearer) {
      const db = admin.firestore();
      const usersRef = db.collection("users");
      const email = String(decoded?.email || "").trim();
      const normalizedEmail = email.toLowerCase();

      let isAdmin = decoded?.admin === true || String(decoded?.role || "").toLowerCase() === "admin";

      if (!isAdmin) {
        const userDoc = await usersRef.doc(decoded.uid).get();
        isAdmin = String(userDoc.data()?.role || "").toLowerCase() === "admin";
      }

      if (!isAdmin) {
        const authUidSnap = await usersRef.where("authUid", "==", decoded.uid).limit(1).get();
        isAdmin = authUidSnap.docs.some((doc) => String(doc.data()?.role || "").toLowerCase() === "admin");
      }

      if (!isAdmin && email) {
        const emailSnap = await usersRef.where("email", "==", email).limit(1).get();
        isAdmin = emailSnap.docs.some((doc) => String(doc.data()?.role || "").toLowerCase() === "admin");
      }

      if (!isAdmin && normalizedEmail === "admin@fitdata.gym") {
        isAdmin = true;
      }

      if (!isAdmin) {
        return res.status(403).json({ error: "Solo administradores pueden descargar archivos" });
      }
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    const [metadata] = await file.getMetadata();

    if (!hasBearer) {
      const rawTokens = String(metadata?.metadata?.firebaseStorageDownloadTokens || "");
      const allowedTokens = rawTokens.split(",").map((t) => t.trim()).filter(Boolean);
      if (!downloadToken || !allowedTokens.includes(downloadToken)) {
        return res.status(403).json({ error: "Token de descarga inválido" });
      }
    }

    res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader("Cache-Control", "private, no-cache");

    file.createReadStream().pipe(res);
  } catch (error) {
    logger.error("Error descargando archivo de dieta", { error: String(error.message) });
    res.status(500).json({ error: "No se pudo descargar el archivo" });
  }
});
