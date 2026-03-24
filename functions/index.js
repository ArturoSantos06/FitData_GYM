const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const {Readable} = require("stream");

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

// Cloud Function para crear usuarios sin cambiar la sesión del admin
exports.createUserAccount = onCall(async (request) => {
  // Verificar que el usuario que llama está autenticado
  if (!request.auth) {
    throw new Error("No autenticado");
  }

  const {email, password, displayName} = request.data;

  if (!email || !password) {
    throw new Error("Email y contraseña son requeridos");
  }

  try {
    // Crear usuario con Admin SDK (no afecta la sesión del frontend)
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

exports.registerClientByAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    membershipTypeId,
    paymentMethod,
    montoRecibido,
  } = request.data || {};

  if (!username || !email || !password || !firstName || !lastName || !membershipTypeId) {
    throw new HttpsError("invalid-argument", "Faltan campos requeridos para el registro");
  }

  const db = admin.firestore();

  try {
    const adminUserDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "No tienes permisos de administrador");
    }

    const normalizedLastName = normalizeComparableText(lastName);
    if (!normalizedLastName) {
      throw new HttpsError("invalid-argument", "Los apellidos son requeridos");
    }

    const usersSnapshot = await db.collection("users").get();
    const duplicatedLastNameDoc = usersSnapshot.docs.find((docSnap) => {
      const userData = docSnap.data() || {};
      const userRole = userData.role;

      if (userRole && userRole !== "client") {
        return false;
      }

      const existingLastName = userData.lastName || userData.last_name || "";
      return normalizeComparableText(existingLastName) === normalizedLastName;
    });

    if (duplicatedLastNameDoc) {
      throw new HttpsError("already-exists", "Ya existe un cliente registrado con esos apellidos");
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
        telefono: "",
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

exports.registerNutriologoByAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const {
    email,
    password,
    firstName,
    lastName,
    especialidad,
  } = request.data || {};

  if (!email || !password) {
    throw new HttpsError("invalid-argument", "Email y contraseña son requeridos");
  }

  const db = admin.firestore();

  try {
    const adminUserDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "No tienes permisos de administrador");
    }

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
    });

    const userDoc = {
      email,
      role: "nutriologo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (firstName) userDoc.firstName = firstName;
    if (lastName) userDoc.lastName = lastName;
    if (especialidad) userDoc.especialidad = especialidad;

    await db.collection("users").doc(authUser.uid).set(userDoc);

    return {
      success: true,
      id: authUser.uid,
      email: authUser.email,
    };
  } catch (error) {
    logger.error("Error en registerNutriologoByAdmin", {
      email,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      error.message || "No se pudo registrar el nutriólogo",
      { message: String(error.message || error) }
    );
  }
});

// --- CLOUD FUNCTION: GENERAR FACTURA PDF ---
exports.generarFactura = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const { ventaId } = request.data || {};

  if (!ventaId) {
    throw new HttpsError("invalid-argument", "Falta ventaId");
  }

  const db = admin.firestore();
  const storage = admin.storage();

  try {
    // 1. Obtener el documento de venta
    const ventaDoc = await db.collection("ventas").doc(ventaId).get();
    if (!ventaDoc.exists) {
      throw new HttpsError("not-found", "Venta no encontrada");
    }

    const venta = ventaDoc.data();

    // 2. Generar número de factura secuencial
    const fechaVenta = venta.fecha?.toDate?.() || new Date(venta.fecha || Date.now());
    const periodo = `${fechaVenta.getFullYear()}-${String(fechaVenta.getMonth() + 1).padStart(2, "0")}`;
    
    const configRef = db.collection("facturas_config").doc("numeracion");
    const configSnap = await configRef.get();
    
    let numeroFactura = 1;
    let periodoActual = periodo;

    if (configSnap.exists) {
      const config = configSnap.data();
      if (config.periodo_actual === periodo) {
        numeroFactura = (config.ultimo_numero || 0) + 1;
      } else {
        numeroFactura = 1;
      }
      periodoActual = periodo;
    }

    const numeroFacturaFormato = String(numeroFactura).padStart(5, "0");
    const anio = fechaVenta.getFullYear();
    const facturaNumeroCodigo = `FAC-001-${anio}-${numeroFacturaFormato}`;

    // 3. Actualizar config de numeración
    await configRef.set({
      periodo_actual: periodoActual,
      ultimo_numero: numeroFactura,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Generar PDF
    const pdfBuffer = await generarPDFFactura({
      facturaNumeroCodigo,
      venta,
      fechaVenta
    });

    // 5. Guardar PDF en Storage
    const storageePath = `facturas/${anio}/${periodo}/${facturaNumeroCodigo}.pdf`;
    const file = storage.bucket().file(storageePath);

    await new Promise((resolve, reject) => {
      const stream = file.createWriteStream({
        metadata: {
          contentType: "application/pdf"
        }
      });
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(pdfBuffer);
    });

    // 6. Obtener URL descargable (signed URL válida por 7 días)
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    // 7. Actualizar documento de venta con info de factura
    await db.collection("ventas").doc(ventaId).update({
      factura_numero: facturaNumeroCodigo,
      factura_estado: "generada",
      factura_url: signedUrl,
      factura_info_storage: storageePath,
      factura_fecha_generacion: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      facturaNumeroCodigo,
      factura_url: signedUrl
    };
  } catch (error) {
    logger.error("Error generando factura", {
      ventaId,
      error: String(error.message || error)
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      error.message || "No se pudo generar la factura"
    );
  }
});

// --- HELPER: Generar PDF de factura ---
async function generarPDFFactura({ facturaNumeroCodigo, venta, fechaVenta }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // --- Cabecera ---
    doc.fontSize(20).font("Helvetica-Bold").text("FitData GYM", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Centro de Entrenamiento Especializado", { align: "center" });
    doc.text("Av. Resurgimiento 611, Campeche, México", { align: "center" });
    doc.text("Tel: +52 981 111 2233 | Email: info@fitdatagym.com", { align: "center" });

    doc.moveTo(50, 120).lineTo(550, 120).stroke();

    // --- Número de factura ---
    doc.fontSize(12).font("Helvetica-Bold").text(`Factura: ${facturaNumeroCodigo}`, 50, 130);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Fecha: ${fechaVenta.toLocaleDateString("es-MX")}`, 50, 150);
    doc.text(`Folio de Referencia: ${venta.folio || "N/A"}`, 50, 165);

    // --- Datos del cliente ---
    doc.fontSize(10).font("Helvetica-Bold").text("CLIENTE", 50, 190);
    doc.font("Helvetica");
    doc.text(`Nombre: ${venta.clienteNombre || venta.cliente_username || "N/A"}`, 50, 208);
    doc.text(`Email: ${venta.clienteEmail || venta.cliente_email || "N/A"}`, 50, 223);

    // --- Tabla de productos/servicios ---
    doc.moveTo(50, 260).lineTo(550, 260).stroke();

    const tableTop = 270;
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Descripción", 50, tableTop);
    doc.text("Cantidad", 300, tableTop);
    doc.text("Precio Unit.", 370, tableTop);
    doc.text("Total", 480, tableTop);

    doc.moveTo(50, 285).lineTo(550, 285).stroke();

    doc.font("Helvetica").fontSize(9);
    let currentY = 295;

    // Parsear items
    let items = [];
    if (venta.detalle_productos) {
      try {
        items = typeof venta.detalle_productos === "string" 
          ? JSON.parse(venta.detalle_productos) 
          : venta.detalle_productos;
      } catch (e) {
        items = [{ nombre: "Membresía", cantidad: 1, precio: venta.total }];
      }
    } else if (venta.membership_name) {
      items = [{ 
        nombre: `Membresía: ${venta.membership_name}`, 
        cantidad: 1, 
        precio: venta.total 
      }];
    }

    items.forEach((item) => {
      const nombre = item.nombre || "Producto";
      const cantidad = item.cantidad || 1;
      const precio = item.precio || 0;
      const subtotal = cantidad * precio;

      doc.text(nombre.substring(0, 35), 50, currentY);
      doc.text(String(cantidad), 300, currentY);
      doc.text(`$${precio.toFixed(2)}`, 370, currentY);
      doc.text(`$${subtotal.toFixed(2)}`, 480, currentY);

      currentY += 20;
    });

    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();

    // --- Totales ---
    currentY += 10;
    const subtotal = venta.total / 1.16;
    const iva = venta.total - subtotal;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Subtotal:`, 350, currentY);
    doc.text(`$${subtotal.toFixed(2)}`, 480, currentY);
    
    doc.text(`IVA (16%):`, 350, currentY + 18);
    doc.text(`$${iva.toFixed(2)}`, 480, currentY + 18);

    doc.moveTo(350, currentY + 38).lineTo(550, currentY + 38).stroke();

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text(`TOTAL:`, 350, currentY + 45);
    doc.text(`$${venta.total.toFixed(2)}`, 480, currentY + 45);

    // --- Forma de pago ---
    currentY += 90;
    doc.fontSize(9).font("Helvetica");
    doc.text(`Método de Pago: ${venta.metodo_pago || "EFECTIVO"}`, 50, currentY);
    if (venta.metodo_pago === "EFECTIVO") {
      doc.text(`Monto Recibido: $${(venta.monto_recibido || venta.total).toFixed(2)}`, 50, currentY + 15);
      doc.text(`Cambio: $${((venta.monto_recibido || venta.total) - venta.total).toFixed(2)}`, 50, currentY + 30);
    }

    // --- Pie ---
    currentY += 80;
    doc.fontSize(8).font("Helvetica").text("Gracias por su compra. Para consultas: info@fitdatagym.com", 50, currentY, { align: "center" });

    doc.end();
  });
}

// --- CLOUD FUNCTION: OBTENER REPORTES DE FACTURAS (ADMIN) ---
exports.obtenerReporteFacturas = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const { mes, anio } = request.data || {};
  const db = admin.firestore();

  try {
    // Verificar que sea admin
    const adminDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "No tienes permisos");
    }

    // Filtrar ventas por mes/año
    const mesStr = mes ? String(mes).padStart(2, "0") : String(new Date().getMonth() + 1).padStart(2, "0");
    const anioStr = anio || new Date().getFullYear();

    // Obtener todas las ventas con factura
    const snapshot = await db.collection("ventas").get();
    const reportes = [];
    let totalFacturado = 0;

    snapshot.docs.forEach((doc) => {
      const venta = doc.data();
      const fecha = venta.fecha?.toDate?.() || new Date(venta.fecha);
      
      if (fecha.getFullYear() === parseInt(anioStr) && 
          fecha.getMonth() + 1 === parseInt(mesStr)) {
        reportes.push({
          id: doc.id,
          factura_numero: venta.factura_numero,
          cliente: venta.clienteNombre || venta.cliente_username,
          email: venta.clienteEmail || venta.cliente_email,
          total: venta.total,
          fecha: fecha.toLocaleDateString("es-MX"),
          metodo_pago: venta.metodo_pago
        });
        totalFacturado += venta.total;
      }
    });

    return {
      success: true,
      mes: mesStr,
      anio: anioStr,
      total_facturas: reportes.length,
      total_facturado: totalFacturado,
      reportes
    };
  } catch (error) {
    logger.error("Error obteniendo reporte facturas", {
      error: String(error.message || error)
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "Error obteniendo reporte");
  }
});

