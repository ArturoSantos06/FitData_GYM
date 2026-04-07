const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const {Readable} = require("stream");
const {randomUUID} = require("crypto");

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

const isPrivilegedRole = (roleValue = "") => {
  const role = String(roleValue || "").trim().toLowerCase();
  return ["admin", "trainer", "coach", "entrenador", "nutriologo", "nutri"].includes(role);
};

const isPrivilegedFromToken = (decodedToken = {}) => {
  return decodedToken.admin === true ||
    String(decodedToken.role || "").toUpperCase() === "ADMIN" ||
    isPrivilegedRole(decodedToken.role) ||
    decodedToken.email === "admin@fitdata.gym";
};

const getMemberIdFromPath = (path = "") => {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const match = cleanPath.match(/^(dietFiles|dietas)\/([^/]+)\//);
  return match?.[2] || "";
};

const sanitizeDownloadName = (value = "archivo") => String(value || "archivo")
    .replace(/[\r\n]/g, " ")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180) || "archivo";

const toJsDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSaleDate = (data = {}) => {
  return toJsDate(data.createdAt) || toJsDate(data.fecha) || null;
};

const isPrivilegedRequest = async (request) => {
  const uid = String(request?.auth?.uid || "");
  if (!uid) return false;

  if (isPrivilegedFromToken(request.auth.token || {})) {
    return true;
  }

  try {
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const userRole = String(userSnap.data()?.role || "").toLowerCase();
    return isPrivilegedRole(userRole);
  } catch {
    return false;
  }
};

const buildFacturaDescripcion = (saleData = {}) => {
  const rawDetail = saleData.detalle_productos;
  if (rawDetail) {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const names = parsed
            .map((item) => String(item?.nombre || item?.name || item?.producto || "").trim())
            .filter(Boolean);
        if (names.length > 0) {
          return names.length === 1 ? names[0] : names.join(", ");
        }
      }
    } catch {
    }
  }

  return String(
      saleData.membership_name ||
      saleData.membershipName ||
      saleData.producto ||
      saleData.producto_nombre ||
      saleData.productoNombre ||
      saleData.tipo_venta ||
      "Producto"
  );
};

const normalizeFacturaItem = (docSnap) => {
  const data = docSnap.data() || {};
  const totalNumber = Number(data.total || 0);
  const subtotalNumber = Number(data.subtotal || (totalNumber > 0 ? totalNumber / 1.16 : 0));
  const ivaNumber = Number(data.totalIVA || (totalNumber - subtotalNumber));
  const saleDate = getSaleDate(data) || new Date();

  return {
    id: docSnap.id,
    fecha: saleDate,
    factura_numero: String(data.folio || data.factura_numero || data.numeroFactura || data.saleFolio || docSnap.id),
    cliente_nombre: String(data.clienteNombre || data.cliente_nombre || data.nombreCliente || data.userName || data.customerName || "Sin nombre"),
    membership_name: String(data.membership_name || data.membershipName || ""),
    producto: buildFacturaDescripcion(data),
    subtotal: subtotalNumber,
    total: totalNumber,
    totalIVA: ivaNumber,
    estado: String(data.estado || "Generada")
  };
};

const mergeSaleSnapshots = (snapshots) => {
  const mergedById = new Map();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      mergedById.set(docSnap.id, docSnap);
    });
  });
  return Array.from(mergedById.values());
};

exports.obtenerReporteFacturas = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar el reporte.");
  }

  const privileged = await isPrivilegedRequest(request);
  if (!privileged) {
    throw new HttpsError("permission-denied", "No tienes permisos para consultar este reporte.");
  }

  const mes = Number(request.data?.mes);
  const anio = Number(request.data?.anio);

  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000) {
    throw new HttpsError("invalid-argument", "Mes y año inválidos.");
  }

  const db = admin.firestore();
  const ventasRef = db.collection("ventas");

  const startDate = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(anio, mes, 1, 0, 0, 0, 0);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

  const [timestampSnapshot, fechaSnapshot] = await Promise.allSettled([
    ventasRef
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<", endTimestamp)
        .orderBy("createdAt", "desc")
        .get(),
    ventasRef
        .where("fecha", ">=", startIso)
        .where("fecha", "<", endIso)
        .orderBy("fecha", "desc")
        .get()
  ]);

  let docs = [];
  if (timestampSnapshot.status === "fulfilled" && fechaSnapshot.status === "fulfilled") {
    docs = mergeSaleSnapshots([timestampSnapshot.value, fechaSnapshot.value]);
  } else if (timestampSnapshot.status === "fulfilled") {
    docs = timestampSnapshot.value.docs;
  } else if (fechaSnapshot.status === "fulfilled") {
    docs = fechaSnapshot.value.docs;
  }

  if (docs.length === 0) {
    const fallbackSnapshot = await ventasRef.orderBy("createdAt", "desc").limit(500).get();
    docs = fallbackSnapshot.docs;
  }

  const facturas = docs
      .map(normalizeFacturaItem)
      .filter((item) => {
        const saleDate = item.fecha;
        return saleDate &&
          saleDate.getFullYear() === anio &&
          saleDate.getMonth() + 1 === mes;
      })
      .sort((a, b) => b.fecha - a.fecha);

  const totals = facturas.reduce((accumulator, factura) => {
    accumulator.totalFacturas += 1;
    accumulator.totalIngresos += Number(factura.total || 0);
    accumulator.subtotal += Number(factura.subtotal || 0);
    accumulator.totalIVA += Number(factura.totalIVA || 0);
    return accumulator;
  }, {
    totalFacturas: 0,
    totalIngresos: 0,
    subtotal: 0,
    totalIVA: 0,
  });

  return {
    success: true,
    ...totals,
    facturas
  };
});

exports.generarFactura = onCall({cors: true, invoker: "public"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para generar facturas.");
  }

  const ventaId = String(request.data?.ventaId || "").trim();
  if (!ventaId) {
    throw new HttpsError("invalid-argument", "El parámetro ventaId es requerido.");
  }

  const db = admin.firestore();
  const ventaRef = db.collection("ventas").doc(ventaId);
  const ventaSnap = await ventaRef.get();

  if (!ventaSnap.exists) {
    throw new HttpsError("not-found", "No se encontró la venta solicitada.");
  }

  const ventaData = ventaSnap.data() || {};
  const authUid = String(request.auth.uid || "");
  const authEmail = String(request.auth.token?.email || "").trim().toLowerCase();

  const privileged = await isPrivilegedRequest(request);
  let allowed = privileged;

  if (!allowed) {
    let userDoc = null;
    try {
      const userSnap = await db.doc(`users/${authUid}`).get();
      if (userSnap.exists) userDoc = userSnap.data() || null;
    } catch {
      userDoc = null;
    }

    const userIdCandidates = new Set([
      authUid,
      String(userDoc?.id || "").trim(),
      String(userDoc?.userId || "").trim(),
      String(userDoc?.legacyId || "").trim(),
    ].filter(Boolean));

    const emailCandidates = new Set([
      authEmail,
      String(userDoc?.email || "").trim().toLowerCase(),
    ].filter(Boolean));

    const usernameCandidates = new Set([
      String(userDoc?.username || "").trim().toLowerCase(),
    ].filter(Boolean));

    const ventaUserIds = [
      String(ventaData.cliente || "").trim(),
      String(ventaData.cliente_id || "").trim(),
      String(ventaData.userId || "").trim(),
      String(ventaData.authUid || "").trim(),
    ].filter(Boolean);

    const ventaEmails = [
      String(ventaData.cliente_email || "").trim().toLowerCase(),
      String(ventaData.clienteEmail || "").trim().toLowerCase(),
      String(ventaData.email || "").trim().toLowerCase(),
    ].filter(Boolean);

    const ventaUsernames = [
      String(ventaData.cliente_username || "").trim().toLowerCase(),
    ].filter(Boolean);

    const matchById = ventaUserIds.some((value) => userIdCandidates.has(value));
    const matchByEmail = ventaEmails.some((value) => emailCandidates.has(value));
    const matchByUsername = ventaUsernames.some((value) => usernameCandidates.has(value));

    allowed = matchById || matchByEmail || matchByUsername;
  }

  if (!allowed) {
    throw new HttpsError("permission-denied", "No tienes permisos para generar esta factura.");
  }

  const existingFacturaNumero = String(
      ventaData.factura_numero ||
      ventaData.numeroFactura ||
      ""
  ).trim();
  const existingFacturaUrl = String(ventaData.factura_url || "").trim();
  if (existingFacturaNumero && existingFacturaUrl) {
    return {
      success: true,
      facturaNumeroCodigo: existingFacturaNumero,
      factura_url: existingFacturaUrl,
    };
  }

  const total = Number(ventaData.total || 0);
  const subtotal = Number(ventaData.subtotal || (total > 0 ? total / 1.16 : 0));
  const iva = Number(ventaData.totalIVA || (total - subtotal));
  const fechaVenta = getSaleDate(ventaData) || new Date();
  const fechaStr = fechaVenta.toLocaleDateString("es-MX");

  const facturaNumeroCodigo = existingFacturaNumero ||
    `FAC-${fechaVenta.getFullYear()}${String(fechaVenta.getMonth() + 1).padStart(2, "0")}${String(fechaVenta.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  let detalleItems = [];
  try {
    if (typeof ventaData.detalle_productos === "string") {
      const parsed = JSON.parse(ventaData.detalle_productos);
      if (Array.isArray(parsed)) detalleItems = parsed;
    } else if (Array.isArray(ventaData.detalle_productos)) {
      detalleItems = ventaData.detalle_productos;
    }
  } catch {
    detalleItems = [];
  }

  if (!detalleItems.length) {
    detalleItems = [{
      nombre: buildFacturaDescripcion(ventaData),
      cantidad: 1,
      precio: total,
    }];
  }

  const clienteNombre = String(
      ventaData.clienteNombre ||
      ventaData.cliente_nombre ||
      ventaData.userName ||
      ventaData.customerName ||
      "Cliente"
  );

  const pdfDoc = new PDFDocument({size: "A4", margin: 50});
  const chunks = [];
  pdfDoc.on("data", (chunk) => chunks.push(chunk));

  pdfDoc.fontSize(20).text("FitData GYM - Factura", {align: "left"});
  pdfDoc.moveDown(0.5);
  pdfDoc.fontSize(10).fillColor("#666").text(`No. Factura: ${facturaNumeroCodigo}`);
  pdfDoc.text(`Fecha: ${fechaStr}`);
  pdfDoc.text(`Venta ID: ${ventaId}`);
  pdfDoc.moveDown();

  pdfDoc.fillColor("#000").fontSize(12).text(`Cliente: ${clienteNombre}`);
  if (ventaData.clienteEmail || ventaData.cliente_email || ventaData.email) {
    pdfDoc.fontSize(10).fillColor("#444").text(`Email: ${ventaData.clienteEmail || ventaData.cliente_email || ventaData.email}`);
  }
  pdfDoc.moveDown();

  pdfDoc.fillColor("#000").fontSize(12).text("Conceptos", {underline: true});
  pdfDoc.moveDown(0.4);

  detalleItems.forEach((item) => {
    const nombre = String(item?.nombre || item?.name || "Producto");
    const cantidad = Number(item?.cantidad || 1);
    const precio = Number(item?.precio || item?.price || 0);
    const importe = cantidad * precio;
    pdfDoc.fontSize(10).fillColor("#111").text(`${nombre}  x${cantidad}  -  $${importe.toFixed(2)}`);
  });

  pdfDoc.moveDown();
  pdfDoc.fontSize(11).fillColor("#000").text(`Subtotal: $${subtotal.toFixed(2)}`, {align: "right"});
  pdfDoc.text(`IVA: $${iva.toFixed(2)}`, {align: "right"});
  pdfDoc.font("Helvetica-Bold").text(`Total: $${total.toFixed(2)}`, {align: "right"});
  pdfDoc.font("Helvetica");

  pdfDoc.moveDown(1.5);
  pdfDoc.fontSize(9).fillColor("#666").text("Documento generado automáticamente por FitData GYM.", {align: "center"});
  pdfDoc.end();

  const pdfBuffer = await new Promise((resolve, reject) => {
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", (error) => reject(error));
  });

  const bucket = admin.storage().bucket();
  const storagePath = `facturas/${ventaId}/${facturaNumeroCodigo}.pdf`;
  const token = randomUUID();
  const file = bucket.file(storagePath);
  await file.save(pdfBuffer, {
    metadata: {
      contentType: "application/pdf",
      cacheControl: "private, max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
    resumable: false,
  });

  const facturaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

  await ventaRef.update({
    factura_numero: facturaNumeroCodigo,
    numeroFactura: facturaNumeroCodigo,
    factura_url: facturaUrl,
    factura_estado: "generada",
    facturaStoragePath: storagePath,
    facturaGeneradaAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    facturaNumeroCodigo,
    factura_url: facturaUrl,
  };
});

exports.downloadDietFile = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const rawPath = String(req.query.path || "").trim();
    const cleanPath = rawPath.replace(/^\/+/, "");
    const requestedName = sanitizeDownloadName(req.query.name || "dieta_vigente");

    if (!cleanPath) {
      res.status(400).json({error: "El parámetro path es requerido."});
      return;
    }

    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({error: "Falta token de autenticación."});
      return;
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = String(decodedToken.uid || "");
    if (!uid) {
      res.status(401).json({error: "Token inválido."});
      return;
    }

    let hasPrivilegedAccess = isPrivilegedFromToken(decodedToken);
    if (!hasPrivilegedAccess) {
      try {
        const userSnap = await admin.firestore().doc(`users/${uid}`).get();
        const userRole = String(userSnap.data()?.role || "").toLowerCase();
        hasPrivilegedAccess = isPrivilegedRole(userRole);
      } catch {
        hasPrivilegedAccess = false;
      }
    }

    if (!hasPrivilegedAccess) {
      const memberId = getMemberIdFromPath(cleanPath);
      if (!memberId) {
        res.status(403).json({error: "Ruta de archivo no autorizada."});
        return;
      }

      const memberSnap = await admin.firestore().doc(`miembros/${memberId}`).get();
      if (!memberSnap.exists) {
        res.status(404).json({error: "Miembro no encontrado para este archivo."});
        return;
      }

      const memberData = memberSnap.data() || {};
      const ownerByUserId = String(memberData.userId || "") === uid;
      const ownerByAuthUid = String(memberData.authUid || "") === uid;
      if (!ownerByUserId && !ownerByAuthUid) {
        res.status(403).json({error: "No tienes permisos para descargar este archivo."});
        return;
      }
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(cleanPath);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({error: "Archivo no encontrado en Storage."});
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata?.contentType || "application/octet-stream";

    res.set("Content-Type", contentType);
    res.set("Content-Disposition", `attachment; filename="${requestedName}"`);
    res.set("Cache-Control", "private, max-age=60");

    file.createReadStream()
        .on("error", (error) => {
          logger.error("Error al transmitir archivo de dieta", {error: String(error?.message || error)});
          if (!res.headersSent) {
            res.status(500).json({error: "No se pudo descargar el archivo."});
          }
        })
        .pipe(res);
  } catch (error) {
    logger.error("downloadDietFile error", {error: String(error?.message || error)});
    res.status(500).json({error: "No se pudo completar la descarga."});
  }
});

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

exports.onFacturaRequestCreated = onDocumentCreated({
  document: "facturaRequests/{requestId}",
}, async (event) => {
  const requestData = event.data?.data();
  if (!requestData) return;

  const ventaId = String(requestData.ventaId || "").trim();
  const requesterUid = String(requestData.requesterUid || "").trim();
  const requesterEmail = String(requestData.requesterEmail || "").trim().toLowerCase();

  if (!ventaId || !requesterUid) {
    await event.data.ref.update({
      status: "failed",
      error: "Solicitud inválida: falta ventaId o requesterUid",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const db = admin.firestore();
  const ventaRef = db.collection("ventas").doc(ventaId);
  const ventaSnap = await ventaRef.get();

  if (!ventaSnap.exists) {
    await event.data.ref.update({
      status: "failed",
      error: "No se encontró la venta solicitada",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const ventaData = ventaSnap.data() || {};
  const userSnap = await db.doc(`users/${requesterUid}`).get();
  const userRole = String(userSnap.data()?.role || "").toLowerCase();
  const privileged = isPrivilegedRole(userRole);

  const ventaUserIds = [
    String(ventaData.cliente || "").trim(),
    String(ventaData.cliente_id || "").trim(),
    String(ventaData.userId || "").trim(),
    String(ventaData.authUid || "").trim(),
  ].filter(Boolean);
  const ventaEmails = [
    String(ventaData.cliente_email || "").trim().toLowerCase(),
    String(ventaData.clienteEmail || "").trim().toLowerCase(),
    String(ventaData.email || "").trim().toLowerCase(),
  ].filter(Boolean);

  const allowed = privileged || ventaUserIds.includes(requesterUid) || ventaEmails.includes(requesterEmail);
  if (!allowed) {
    await event.data.ref.update({
      status: "failed",
      error: "No autorizado para generar factura de esta venta",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const existingFacturaNumero = String(ventaData.factura_numero || ventaData.numeroFactura || "").trim();
  const existingFacturaUrl = String(ventaData.factura_url || "").trim();
  if (existingFacturaNumero && existingFacturaUrl) {
    await event.data.ref.update({
      status: "done",
      factura_numero: existingFacturaNumero,
      factura_url: existingFacturaUrl,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const total = Number(ventaData.total || 0);
  const subtotal = Number(ventaData.subtotal || (total > 0 ? total / 1.16 : 0));
  const iva = Number(ventaData.totalIVA || (total - subtotal));
  const fechaVenta = getSaleDate(ventaData) || new Date();
  const fechaStr = fechaVenta.toLocaleDateString("es-MX");
  const facturaNumeroCodigo = `FAC-${fechaVenta.getFullYear()}${String(fechaVenta.getMonth() + 1).padStart(2, "0")}${String(fechaVenta.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  let detalleItems = [];
  try {
    if (typeof ventaData.detalle_productos === "string") {
      const parsed = JSON.parse(ventaData.detalle_productos);
      if (Array.isArray(parsed)) detalleItems = parsed;
    } else if (Array.isArray(ventaData.detalle_productos)) {
      detalleItems = ventaData.detalle_productos;
    }
  } catch {
    detalleItems = [];
  }

  if (!detalleItems.length) {
    detalleItems = [{
      nombre: buildFacturaDescripcion(ventaData),
      cantidad: 1,
      precio: total,
    }];
  }

  const clienteNombre = String(
      ventaData.clienteNombre ||
      ventaData.cliente_nombre ||
      ventaData.userName ||
      ventaData.customerName ||
      "Cliente"
  );

  const lines = detalleItems.map((item) => {
    const qty = Number(item?.cantidad || 1);
    const price = Number(item?.precio || item?.price || 0);
    const lineTotal = qty * price;
    return `${item?.nombre || item?.name || "Producto"} x${qty} - $${lineTotal.toFixed(2)}`;
  }).join("\n");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Factura ${facturaNumeroCodigo}</title></head><body><h1>FitData GYM - Factura</h1><p>No. Factura: ${facturaNumeroCodigo}</p><p>Fecha: ${fechaStr}</p><p>Cliente: ${clienteNombre}</p><pre>${lines}</pre><p>Subtotal: $${subtotal.toFixed(2)}</p><p>IVA: $${iva.toFixed(2)}</p><p><strong>Total: $${total.toFixed(2)}</strong></p></body></html>`;

  const bucket = admin.storage().bucket();
  const storagePath = `facturas/${ventaId}/${facturaNumeroCodigo}.html`;
  const token = randomUUID();
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(html, "utf8"), {
    metadata: {
      contentType: "text/html; charset=utf-8",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
    resumable: false,
  });

  const facturaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

  await ventaRef.update({
    factura_numero: facturaNumeroCodigo,
    numeroFactura: facturaNumeroCodigo,
    factura_url: facturaUrl,
    factura_estado: "generada",
    facturaStoragePath: storagePath,
    facturaGeneradaAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await event.data.ref.update({
    status: "done",
    factura_numero: facturaNumeroCodigo,
    factura_url: facturaUrl,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
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

