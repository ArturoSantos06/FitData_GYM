const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const { Readable } = require("stream");
const { randomUUID } = require("crypto");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  buildAiRoutinePrompt,
  extractGeminiText,
  saveAiRoutineHistory,
} = require("./aiRutinas/geminiRoutineService");

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const DEFAULT_FROM_EMAIL = defineSecret("DEFAULT_FROM_EMAIL");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_MODEL_CANDIDATES = [
  GEMINI_MODEL,
  "gemini-2.5-flash",
].filter((model, index, all) => model && all.indexOf(model) === index);

admin.initializeApp();

setGlobalOptions({ maxInstances: 10, region: "us-east1", invoker: "public" });

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

// Modificado para aceptar diseños HTML (necesario para tu Marketing)
const sendGmailSmtp = async ({ toEmail, subject, message, htmlTemplate, defaultFrom }) => {
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
    html: htmlTemplate || `<pre>${message}</pre>`,
  });

  return { id: info.messageId };
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

const isTrainerForMember = async (memberId, trainerUid, trainerEmail) => {
  const db = admin.firestore();
  const memberSnap = await db.doc(`miembros/${memberId}`).get();
  if (!memberSnap.exists) {
    return { allowed: false, reason: "El cliente no existe." };
  }

  const memberData = memberSnap.data() || {};
  const candidateIds = Array.from(new Set([
    String(memberId || "").trim(),
    String(memberData.userId || "").trim(),
    String(memberData.authUid || "").trim(),
  ].filter(Boolean)));

  for (const candidateId of candidateIds) {
    const directSnap = await db.doc(`client_trainer_assignments/${candidateId}`).get();
    if (directSnap.exists) {
      const directData = directSnap.data() || {};
      const matchesTrainer = String(directData.trainerId || directData.trainer_id || "").trim() === trainerUid
        || String(directData.trainerEmail || directData.trainer_email || "").trim().toLowerCase() === String(trainerEmail || "").trim().toLowerCase();
      if (matchesTrainer) return { allowed: true };
    }

    const [byClientIdSnap, byMemberIdSnap] = await Promise.all([
      db.collection("client_trainer_assignments").where("clientId", "==", candidateId).limit(10).get(),
      db.collection("client_trainer_assignments").where("memberId", "==", candidateId).limit(10).get(),
    ]);

    const candidatos = [...byClientIdSnap.docs, ...byMemberIdSnap.docs];
    for (const docSnap of candidatos) {
      const data = docSnap.data() || {};
      const matchesTrainer = String(data.trainerId || data.trainer_id || "").trim() === trainerUid
        || String(data.trainerEmail || data.trainer_email || "").trim().toLowerCase() === String(trainerEmail || "").trim().toLowerCase();
      if (matchesTrainer) return { allowed: true };
    }
  }

  return { allowed: false, reason: "No tienes permiso para modificar este cliente." };
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

const buildFallbackRoutineText = (payload = {}) => {
  const goal = String(payload.goalLabel || payload.goal || "Objetivo general");
  const level = String(payload.levelLabel || payload.level || "principiante");
  const daysPerWeek = Math.max(1, Math.min(6, Number(payload.daysPerWeek || 4) || 4));
  const sessionLength = Math.max(30, Math.min(180, Number(payload.sessionLength || 60) || 60));
  const limitations = String(payload.limitations || "sin limitaciones especificadas");
  const customRequest = String(payload.customRequest || payload.requestText || payload.extraNotes || payload.preferences || "").trim();

  const normalizedRequest = normalizeRoutineInputText(customRequest);
  const hasRequestKeyword = (...keywords) => keywords.some((keyword) => normalizedRequest.includes(keyword));
  const requestTheme = (() => {
    if (hasRequestKeyword("cardio", "resistencia", "aerobico", "aerobica")) return "cardio";
    if (hasRequestKeyword("movilidad", "estir", "prevencion", "flexibilidad")) return "mobility";
    if (hasRequestKeyword("pierna", "piern", "glute", "lower", "cuadricep", "femoral")) return "lower";
    if (hasRequestKeyword("pecho", "pech", "triceps", "empuje", "push", "hombro")) return "push";
    if (hasRequestKeyword("espalda", "espal", "biceps", "traccion", "pull")) return "pull";
    if (hasRequestKeyword("fuerza", "power")) return "strength";
    if (hasRequestKeyword("musculo", "hipertrofia", "volumen", "masa")) return "hypertrophy";
    return "balanced";
  })();

  const templates = {
    1: [
      {
        day: "Lunes",
        focus: "Cuerpo completo",
        exercises: [
          ["Sentadilla goblet", "4 series x 10 repeticiones"],
          ["Press de banca con mancuernas", "4 series x 10 repeticiones"],
          ["Jalon al pecho", "4 series x 10 repeticiones"],
          ["Peso muerto rumano", "3 series x 10 repeticiones"],
          ["Plancha frontal", "3 series x 30-45 segundos"],
        ],
      },
    ],
    2: [
      {
        day: "Lunes",
        focus: "Pierna y core",
        exercises: [
          ["Sentadilla goblet", "4 series x 8-10 repeticiones"],
          ["Prensa de piernas", "4 series x 10-12 repeticiones"],
          ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
          ["Peso muerto rumano", "3 series x 10 repeticiones"],
          ["Plancha frontal", "3 series x 30-45 segundos"],
        ],
      },
      {
        day: "Jueves",
        focus: "Torso completo",
        exercises: [
          ["Press de banca", "4 series x 8-10 repeticiones"],
          ["Jalón al pecho", "4 series x 10 repeticiones"],
          ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
          ["Press militar", "3 series x 8-10 repeticiones"],
          ["Face pull", "3 series x 12-15 repeticiones"],
        ],
      },
    ],
    3: [
      {
        day: "Lunes",
        focus: "Pierna y core",
        exercises: [
          ["Sentadilla libre o goblet", "4 series x 8-10 repeticiones"],
          ["Prensa de piernas", "4 series x 10-12 repeticiones"],
          ["Peso muerto rumano", "3 series x 10 repeticiones"],
          ["Curl femoral", "3 series x 12 repeticiones"],
          ["Plancha frontal", "3 series x 30-45 segundos"],
        ],
      },
      {
        day: "Miercoles",
        focus: "Pecho y espalda",
        exercises: [
          ["Press de banca", "4 series x 8-10 repeticiones"],
          ["Jalón al pecho", "4 series x 10 repeticiones"],
          ["Remo sentado", "3 series x 10-12 repeticiones"],
          ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
          ["Curl de biceps", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Viernes",
        focus: "Gluteo, hombro y core",
        exercises: [
          ["Hip thrust", "4 series x 10 repeticiones"],
          ["Press militar", "4 series x 8-10 repeticiones"],
          ["Elevaciones laterales", "3 series x 12-15 repeticiones"],
          ["Face pull", "3 series x 12-15 repeticiones"],
          ["Plancha lateral", "3 series x 30 segundos por lado"],
        ],
      },
    ],
    4: [
      {
        day: "Lunes",
        focus: "Pierna y gluteo",
        exercises: [
          ["Sentadilla libre", "4 series x 8 repeticiones"],
          ["Prensa de piernas", "4 series x 10 repeticiones"],
          ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
          ["Hip thrust", "4 series x 10 repeticiones"],
          ["Plancha frontal", "3 series x 30-45 segundos"],
        ],
      },
      {
        day: "Martes",
        focus: "Pecho y triceps",
        exercises: [
          ["Press de banca", "4 series x 8 repeticiones"],
          ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
          ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
          ["Fondos asistidos", "3 series x 10 repeticiones"],
          ["Extension de triceps en polea", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Jueves",
        focus: "Espalda y biceps",
        exercises: [
          ["Jalón al pecho", "4 series x 10 repeticiones"],
          ["Remo sentado", "4 series x 10 repeticiones"],
          ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
          ["Face pull", "3 series x 12 repeticiones"],
          ["Curl de biceps", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Viernes",
        focus: "Hombro y core",
        exercises: [
          ["Press militar", "4 series x 8 repeticiones"],
          ["Elevaciones laterales", "4 series x 12 repeticiones"],
          ["Pajaro en banco inclinado", "3 series x 12 repeticiones"],
          ["Plancha lateral", "3 series x 30 segundos por lado"],
          ["Crunch en polea o suelo", "3 series x 15 repeticiones"],
        ],
      },
    ],
    5: [
      {
        day: "Lunes",
        focus: "Pierna anterior",
        exercises: [
          ["Sentadilla libre", "4 series x 8 repeticiones"],
          ["Prensa de piernas", "4 series x 10 repeticiones"],
          ["Extensiones de cuádriceps", "3 series x 12 repeticiones"],
          ["Zancadas", "3 series x 10 repeticiones por pierna"],
          ["Plancha frontal", "3 series x 30 segundos"],
        ],
      },
      {
        day: "Martes",
        focus: "Pecho y hombro",
        exercises: [
          ["Press de banca", "4 series x 8 repeticiones"],
          ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
          ["Press militar", "3 series x 8 repeticiones"],
          ["Elevaciones laterales", "3 series x 12 repeticiones"],
          ["Aperturas", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Miercoles",
        focus: "Espalda y biceps",
        exercises: [
          ["Jalón al pecho", "4 series x 10 repeticiones"],
          ["Remo sentado", "4 series x 10 repeticiones"],
          ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
          ["Curl de biceps", "3 series x 12 repeticiones"],
          ["Face pull", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Jueves",
        focus: "Pierna posterior y gluteo",
        exercises: [
          ["Peso muerto rumano", "4 series x 8-10 repeticiones"],
          ["Hip thrust", "4 series x 10 repeticiones"],
          ["Curl femoral", "3 series x 12 repeticiones"],
          ["Puente de gluteo", "3 series x 12 repeticiones"],
          ["Pantorrillas de pie", "3 series x 15 repeticiones"],
        ],
      },
      {
        day: "Viernes",
        focus: "Core y cardio",
        exercises: [
          ["Plancha frontal", "3 series x 40 segundos"],
          ["Plancha lateral", "3 series x 30 segundos por lado"],
          ["Crunch abdominal", "3 series x 15 repeticiones"],
          ["Bicicleta abdominal", "3 series x 20 repeticiones"],
          ["Cardio suave en caminadora", "20 minutos"],
        ],
      },
    ],
    6: [
      {
        day: "Lunes",
        focus: "Pierna anterior",
        exercises: [
          ["Sentadilla libre", "4 series x 8 repeticiones"],
          ["Prensa de piernas", "4 series x 10 repeticiones"],
          ["Extensiones de cuádriceps", "3 series x 12 repeticiones"],
          ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
          ["Plancha frontal", "3 series x 30 segundos"],
        ],
      },
      {
        day: "Martes",
        focus: "Pecho y triceps",
        exercises: [
          ["Press de banca", "4 series x 8 repeticiones"],
          ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
          ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
          ["Fondos asistidos", "3 series x 10 repeticiones"],
          ["Extension de triceps en polea", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Miercoles",
        focus: "Espalda y biceps",
        exercises: [
          ["Jalón al pecho", "4 series x 10 repeticiones"],
          ["Remo sentado", "4 series x 10 repeticiones"],
          ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
          ["Face pull", "3 series x 12 repeticiones"],
          ["Curl de biceps", "3 series x 12 repeticiones"],
        ],
      },
      {
        day: "Jueves",
        focus: "Pierna posterior y gluteo",
        exercises: [
          ["Peso muerto rumano", "4 series x 8-10 repeticiones"],
          ["Hip thrust", "4 series x 10 repeticiones"],
          ["Curl femoral", "3 series x 12 repeticiones"],
          ["Puente de gluteo", "3 series x 12 repeticiones"],
          ["Pantorrillas de pie", "3 series x 15 repeticiones"],
        ],
      },
      {
        day: "Viernes",
        focus: "Hombro y core",
        exercises: [
          ["Press militar", "4 series x 8 repeticiones"],
          ["Elevaciones laterales", "4 series x 12 repeticiones"],
          ["Pajaro en banco inclinado", "3 series x 12 repeticiones"],
          ["Plancha lateral", "3 series x 30 segundos por lado"],
          ["Crunch abdominal", "3 series x 15 repeticiones"],
        ],
      },
      {
        day: "Sabado",
        focus: "Cardio y movilidad",
        exercises: [
          ["Caminadora inclinada", "20-25 minutos"],
          ["Bicicleta estatica", "15-20 minutos"],
          ["Movilidad de cadera", "3 series x 10 repeticiones"],
          ["Movilidad de hombro", "3 series x 10 repeticiones"],
          ["Estiramientos globales", "10 minutos"],
        ],
      },
    ],
  };

  const routineDays = templates[daysPerWeek] || templates[4];
  const themeNotes = {
    cardio: "Enfoque principal: condicionamiento y gasto calórico.",
    mobility: "Enfoque principal: movilidad, control y prevención de molestias.",
    lower: "Enfoque principal: tren inferior y gluteo.",
    push: "Enfoque principal: empuje, pecho, hombro y triceps.",
    pull: "Enfoque principal: traccion, espalda y biceps.",
    strength: "Enfoque principal: fuerza con rangos de repeticiones mas bajos.",
    hypertrophy: "Enfoque principal: hipertrofia con volumen moderado.",
    balanced: "Enfoque principal: equilibrio general de fuerza y acondicionamiento.",
  };
  const extraDaysText = requestTheme === "cardio"
    ? "Cardio progresivo, intervalos suaves y movilidad"
    : requestTheme === "mobility"
      ? "Movilidad articular, core y respiracion"
      : daysPerWeek >= 5
        ? "Cardio moderado y movilidad"
        : "Cardio suave opcional";

  const themedExercisePools = {
    lower: [
      ["Sentadilla libre", "4 series x 8-10 repeticiones"],
      ["Prensa de piernas", "4 series x 10 repeticiones"],
      ["Peso muerto rumano", "4 series x 8-10 repeticiones"],
      ["Hip thrust", "4 series x 10-12 repeticiones"],
      ["Zancadas caminando", "3 series x 12 repeticiones por pierna"],
      ["Curl femoral", "3 series x 12 repeticiones"],
      ["Extensiones de cuadriceps", "3 series x 12-15 repeticiones"],
      ["Pantorrilla de pie", "4 series x 15 repeticiones"],
    ],
    push: [
      ["Press de banca", "4 series x 6-8 repeticiones"],
      ["Press inclinado con mancuernas", "4 series x 8-10 repeticiones"],
      ["Press militar", "4 series x 8 repeticiones"],
      ["Fondos asistidos", "3 series x 10 repeticiones"],
      ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
      ["Elevaciones laterales", "4 series x 12-15 repeticiones"],
      ["Extension de triceps en polea", "3 series x 12 repeticiones"],
      ["Press frances", "3 series x 10 repeticiones"],
    ],
    pull: [
      ["Jalon al pecho", "4 series x 8-10 repeticiones"],
      ["Remo sentado", "4 series x 10 repeticiones"],
      ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
      ["Peso muerto convencional", "4 series x 5 repeticiones"],
      ["Face pull", "3 series x 12-15 repeticiones"],
      ["Curl de biceps con barra", "3 series x 10 repeticiones"],
      ["Curl martillo", "3 series x 12 repeticiones"],
      ["Pullover en polea", "3 series x 12 repeticiones"],
    ],
    cardio: [
      ["Caminadora por intervalos", "25 minutos"],
      ["Bicicleta estatica", "20 minutos"],
      ["Saltos de cuerda", "5 bloques x 1 minuto"],
      ["Remo ergometro", "15 minutos"],
      ["Plancha frontal", "3 series x 40 segundos"],
      ["Mountain climbers", "4 series x 30 segundos"],
      ["Step ups", "3 series x 12 repeticiones por pierna"],
      ["Burpees controlados", "3 series x 10 repeticiones"],
    ],
    mobility: [
      ["Movilidad de cadera", "4 series x 10 repeticiones"],
      ["Movilidad toracica", "4 series x 10 repeticiones"],
      ["Sentadilla profunda asistida", "3 series x 40 segundos"],
      ["Estiramiento dinamico de isquios", "3 series x 12 repeticiones"],
      ["Bird dog", "3 series x 12 repeticiones por lado"],
      ["Dead bug", "3 series x 12 repeticiones"],
      ["Plancha lateral", "3 series x 30 segundos por lado"],
      ["Respiracion diafragmatica", "5 minutos"],
    ],
  };

  const themedFocusVariants = {
    lower: ["Pierna y gluteo", "Posterior de pierna", "Cuadriceps y gluteo", "Pierna unilateral y core"],
    push: ["Pecho y triceps", "Pecho superior y hombro", "Hombro y triceps", "Empuje completo"],
    pull: ["Espalda y biceps", "Traccion vertical", "Traccion horizontal", "Espalda completa"],
    cardio: ["Cardio base", "Cardio intervalico", "Acondicionamiento metabolico", "Cardio y core"],
    mobility: ["Movilidad de cadera", "Movilidad toracica", "Estabilidad de core", "Movilidad global"],
  };

  const buildThemedDays = (theme) => routineDays.map((item, index) => {
    const pool = themedExercisePools[theme];
    const focusList = themedFocusVariants[theme];
    const start = (index * 2) % pool.length;
    const exercises = Array.from({ length: 5 }, (_, offset) => pool[(start + offset) % pool.length]);

    return {
      ...item,
      focus: focusList[index % focusList.length],
      exercises,
    };
  });

  const adjustedRoutineDays = routineDays.map((item, index) => {
    if (["lower", "push", "pull", "cardio", "mobility"].includes(requestTheme)) {
      return buildThemedDays(requestTheme)[index];
    }

    if (requestTheme === "cardio") {
      if (index === 0) return { ...item, focus: "Cardio base y core" };
      if (index === 1) return { ...item, focus: "Movilidad y estabilidad" };
    }

    if (requestTheme === "mobility") {
      if (index === 0) return { ...item, focus: "Movilidad articular y activacion" };
      if (index === 1) return { ...item, focus: "Core y control postural" };
    }

    if (requestTheme === "lower") {
      if (index === 0) return { ...item, focus: "Pierna y gluteo" };
      if (index === 1) return { ...item, focus: "Posterior de pierna y core" };
    }

    if (requestTheme === "push") {
      if (index === 0) return { ...item, focus: "Empuje: pecho y triceps" };
      if (index === 1) return { ...item, focus: "Hombro y triceps" };
    }

    if (requestTheme === "pull") {
      if (index === 0) return { ...item, focus: "Traccion: espalda y biceps" };
      if (index === 1) return { ...item, focus: "Espalda media y posterior" };
    }

    if (requestTheme === "strength") {
      return {
        ...item,
        exercises: item.exercises.map(([name, prescription]) => {
          const updatedPrescription = prescription
            .replace(/8-12/g, "4-6")
            .replace(/10-12/g, "4-6")
            .replace(/12-15/g, "6-8");
          return [name, updatedPrescription];
        }),
      };
    }

    return item;
  });

  return [
    "Rutina temporal (modo respaldo)",
    `Objetivo: ${goal}.`,
    `Nivel: ${level}.`,
    `Frecuencia: ${daysPerWeek} dias por semana.`,
    `Duracion por sesion: ${sessionLength} minutos.`,
    `Solicitud libre del usuario: ${customRequest || "sin solicitud adicional"}.`,
    themeNotes[requestTheme] || themeNotes.balanced,
    "",
    "Calentamiento (8-10 min):",
    "- Caminata inclinada o bicicleta suave 5 min",
    "- Movilidad dinamica de cadera, hombro y tobillo 3-5 min",
    "",
    ...adjustedRoutineDays.flatMap((item) => ([
      `${item.day}: ${item.focus}`,
      ...item.exercises.map(([exerciseName, prescription], index) => `${index + 1}. ${exerciseName} - ${prescription}`),
      "",
    ])),
    `Dia extra: ${extraDaysText}`,
    "- 20-30 min de cardio moderado",
    "- Movilidad de cadera, hombro y tobillo",
    "",
    "Parametros base:",
    "- 4-6 ejercicios por sesion",
    "- 3-4 series por ejercicio",
    "- 8-12 repeticiones (fuerza/hipertrofia general)",
    "- Descanso 60-90 segundos",
    "",
    "Recomendaciones de seguridad:",
    `- Considerar limitaciones: ${limitations}`,
    "- Priorizar tecnica antes de subir carga",
    "- Detener si aparece dolor agudo",
    "",
    "Nota: esta rutina se genero en modo respaldo porque Gemini no devolvio una salida valida en este intento.",
  ].join("\n");
};

const tryParseRoutineJsonText = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const unwrapped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!unwrapped.startsWith("{") && !unwrapped.startsWith("[")) {
    return "";
  }

  try {
    const parsed = JSON.parse(unwrapped);
    const days = Array.isArray(parsed?.dias) ? parsed.dias : [];
    if (!days.length) return "";

    const lines = [];
    if (parsed?.objetivo) lines.push(`Objetivo: ${String(parsed.objetivo).trim()}`);
    if (parsed?.frecuencia) lines.push(`Frecuencia: ${String(parsed.frecuencia).trim()}`);
    if (lines.length) lines.push("");

    days.forEach((day, dayIndex) => {
      const title = String(day?.titulo || `Dia ${dayIndex + 1}`).trim();
      lines.push(`${title}:`);

      const exercises = Array.isArray(day?.ejercicios) ? day.ejercicios : [];
      exercises.forEach((exercise, exerciseIndex) => {
        const name = String(exercise?.nombre || "Ejercicio").trim();
        const sets = String(exercise?.series || "3").trim();
        const reps = String(exercise?.repeticiones || "10-12").trim();
        const rest = String(exercise?.descanso || "60-90 seg").trim();
        lines.push(`${exerciseIndex + 1}. ${name} - ${sets} series x ${reps} repeticiones - Descanso ${rest}`);
      });

      lines.push("");
    });

    if (parsed?.recomendaciones) {
      lines.push("Recomendaciones:");
      lines.push(String(parsed.recomendaciones).trim());
    }

    return lines.join("\n").trim();
  } catch {
    return "";
  }
};

const normalizeRoutineInputText = (value = "") => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeRequestedSessionLength = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  return String(Math.max(30, Math.min(180, Math.round(numeric))));
};

const isStructuredRoutineText = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;

  const normalized = normalizeRoutineInputText(text);
  const hasDayHeader = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|dia\s*\d+)\b/.test(normalized);
  const hasNumberedExercises = /(^|\n)\s*\d+\./.test(text);
  const hasWorkoutKeywords = /(series|repeticiones|calentamiento|descanso)/.test(normalized);

  return hasDayHeader && hasNumberedExercises && hasWorkoutKeywords;
};

const countRoutineDaySections = (value = "") => {
  const text = String(value || "");
  const matches = text.match(/(^|\n)\s*(\*\*)?((Lunes|Martes|Miercoles|Jueves|Viernes|Sabado|Domingo)\s*:|(D[ií]a\s*\d+)\s*[:\-])/g);
  return Array.isArray(matches) ? matches.length : 0;
};

const countUniqueRoutineDaySections = (value = "") => {
  const text = String(value || "");
  const regex = /(^|\n)\s*(\*\*)?((Lunes|Martes|Miercoles|Jueves|Viernes|Sabado|Domingo)\s*:|(D[ií]a\s*\d+)\s*[:\-])/g;
  const uniqueDays = new Set();

  let match = regex.exec(text);
  while (match) {
    const weekday = String(match[4] || "").toLowerCase();
    const numberedDay = String(match[6] || "").toLowerCase().replace(/\s+/g, " ").trim();
    uniqueDays.add(weekday || numberedDay);
    match = regex.exec(text);
  }

  return uniqueDays.size;
};

const isCompleteRoutineText = (value = "", daysPerWeek = 4) => {
  const structured = isStructuredRoutineText(value);
  if (!structured) return false;

  const safeDays = Math.max(1, Math.min(6, Number(daysPerWeek || 4) || 4));
  const daySections = countRoutineDaySections(value);
  const uniqueDaySections = countUniqueRoutineDaySections(value);
  return daySections >= safeDays && uniqueDaySections >= safeDays;
};

const applyRequestedRoutineMetadata = (value = "", payload = {}) => {
  const goal = String(payload.goalLabel || payload.goal || "Objetivo general").trim();
  const level = String(payload.levelLabel || payload.level || "principiante").trim();
  const daysPerWeek = Math.max(1, Math.min(6, Number(payload.daysPerWeek || 4) || 4));
  const sessionLength = normalizeRequestedSessionLength(payload.sessionLength);
  const durationLine = sessionLength
    ? `Duracion por sesion: ${sessionLength} minutos.`
    : "Duracion por sesion: no especificada (ajustable segun disponibilidad).";

  const textWithoutMetadata = String(value || "")
    .split("\n")
    .filter((line) => !/^\s*(Objetivo|Nivel|Frecuencia|Duraci[oó]n por sesi[oó]n)\s*:/i.test(String(line || "")))
    .join("\n")
    .trim();

  return [
    `Objetivo: ${goal}.`,
    `Nivel: ${level}.`,
    `Frecuencia: ${daysPerWeek} dias por semana.`,
    durationLine,
    "",
    textWithoutMetadata,
  ].join("\n").trim();
};

const ensureRoutineCompleteness = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return text;

  const normalized = normalizeRoutineInputText(text);
  const hasWarmup = /calentamiento/.test(normalized);
  const hasRest = /descanso/.test(normalized);
  const hasSafety = /recomendaciones\s+de\s+seguridad|recomendaciones/.test(normalized);

  const extraSections = [];

  if (!hasWarmup) {
    extraSections.push(
      "Calentamiento (8-10 min):",
      "- Caminata o bicicleta suave 5 min",
      "- Movilidad de cadera, hombro y tobillo 3-5 min",
      ""
    );
  }

  if (!hasRest) {
    extraSections.push(
      "Descanso recomendado:",
      "- 60 a 90 segundos entre series",
      "- 90 a 120 segundos en ejercicios compuestos pesados",
      ""
    );
  }

  if (!hasSafety) {
    extraSections.push(
      "Recomendaciones de seguridad:",
      "- Priorizar tecnica antes de subir carga",
      "- Mantener hidratacion y buena respiracion",
      "- Detener si aparece dolor agudo",
      ""
    );
  }

  if (!extraSections.length) {
    return text;
  }

  return [text, "", ...extraSections].join("\n").trim();
};

const buildStrictRoutinePrompt = (basePrompt = "", payload = {}) => {
  const safeDays = Math.max(1, Math.min(6, Number(payload.daysPerWeek || 4) || 4));
  const safeSessionLength = normalizeRequestedSessionLength(payload.sessionLength);
  const safeGoal = String(payload.goalLabel || payload.goal || "Objetivo general").trim();
  const safeLevel = String(payload.levelLabel || payload.level || "principiante").trim();
  const durationConstraint = safeSessionLength
    ? `Respeta EXACTAMENTE la duracion por sesion=${safeSessionLength} minutos.`
    : "Si no se especifica duracion, NO inventes una fija; propone una ventana flexible (por ejemplo 45-75 min).";

  return [
    basePrompt,
    "",
    "INSTRUCCION OBLIGATORIA:",
    "Devuelve SOLO la rutina final completa.",
    "No incluyas saludos, motivacion ni explicaciones introductorias.",
    `Incluye EXACTAMENTE ${safeDays} dias de entrenamiento con encabezados por dia y ejercicios numerados.`,
    "No agregues dias extra ni omitas dias.",
    `Respeta EXACTAMENTE estos parametros: Objetivo='${safeGoal}' y Nivel='${safeLevel}'.`,
    durationConstraint,
    "Cada ejercicio debe traer series y repeticiones.",
    "Usa formato compacto para evitar cortes: sin texto largo, solo datos de la rutina.",
    "Si no puedes cumplir el formato, reescribe la respuesta hasta cumplirlo antes de finalizar.",
  ].join("\n");
};

const isGreetingOnlyRoutineRequest = (payload = {}) => {
  const combinedText = [payload.preferences, payload.extraNotes]
    .map((value) => normalizeRoutineInputText(value))
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!combinedText) {
    return false;
  }

  const greetingPhrases = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "saludos"];
  const requestWords = ["rutina", "entrenamiento", "ejercicio", "ejercicios", "pierna", "pecho", "espalda", "gluteo", "abdomen", "cardio", "fuerza", "musculo", "grasa", "objetivo", "quiero", "necesito"];

  const hasGreeting = greetingPhrases.some((phrase) => (
    combinedText === phrase
    || combinedText.startsWith(`${phrase} `)
    || combinedText.includes(` ${phrase} `)
    || combinedText.endsWith(` ${phrase}`)
  ));

  const hasRoutineIntent = requestWords.some((word) => combinedText.includes(word));

  return hasGreeting && !hasRoutineIntent && combinedText.split(" ").length <= 4;
};

const isRoutineRelatedRequest = (payload = {}) => {
  const combinedText = [payload.customRequest, payload.requestText, payload.preferences, payload.extraNotes]
    .map((value) => normalizeRoutineInputText(value))
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!combinedText) {
    return false;
  }

  const routineKeywords = [
    "rutina",
    "entrenamiento",
    "ejercicio",
    "ejercicios",
    "gym",
    "gimnasio",
    "musculo",
    "musculos",
    "fuerza",
    "cardio",
    "hipertrofia",
    "volumen",
    "definicion",
    "recomposicion",
    "bajar grasa",
    "perder grasa",
    "ganar masa",
    "ganar musculo",
    "objetivo",
    "pierna",
    "piernas",
    "pecho",
    "espalda",
    "gluteo",
    "gluteos",
    "abdomen",
    "hombro",
    "biceps",
    "triceps",
    "core",
    "espalda baja",
    "espalda alta",
    "push",
    "pull",
    "legs",
    "plan",
    "entreno",
    "entrenar",
    "hazme",
    "armame",
    "generame",
    "creame",
    "enfocado",
    "enfocada",
  ];

  if (routineKeywords.some((keyword) => combinedText.includes(keyword))) {
    return true;
  }

  const hasActionIntent = /(hazme|armame|genera|generame|crea|creame)/.test(combinedText);
  const hasTrainingContext = /(rutina|plan|entreno|entrenamiento|ejercicio|ejercicios|musculo|grasa|fuerza|cardio)/.test(combinedText);
  return hasActionIntent && hasTrainingContext;
};

const generateClientAiRoutineCore = async ({ uid, payload, authToken = {} }) => {
  const safeUid = String(uid || "").trim();
  if (!safeUid) {
    throw new HttpsError("unauthenticated", "No se pudo identificar al usuario.");
  }

  const safePayload = payload || {};
  const requestedDaysPerWeek = Math.max(1, Math.min(6, Number(safePayload.daysPerWeek || 4) || 4));
  const requestedSessionLength = normalizeRequestedSessionLength(safePayload.sessionLength);
  const normalizedPayload = {
    ...safePayload,
    daysPerWeek: requestedDaysPerWeek,
    sessionLength: requestedSessionLength,
  };
  if (normalizedPayload.messageIntent === "greeting" || isGreetingOnlyRoutineRequest(normalizedPayload)) {
    logger.info("AI routine response", {
      provider: "local",
      model: "greeting-guard",
      uid: safeUid,
    });
    return {
      success: true,
      provider: "local",
      model: "greeting-guard",
      prompt: "",
      routineText: "Hola. Para generarte una rutina necesito tu objetivo, nivel y cuántos días entrenas. Por ejemplo: \"quiero perder grasa, soy principiante y entreno 4 días\".",
      historyEntry: null,
    };
  }

  if (!isRoutineRelatedRequest(normalizedPayload)) {
    logger.info("AI routine response", {
      provider: "local",
      model: "intent-guard",
      uid: safeUid,
    });
    return {
      success: true,
      provider: "local",
      model: "intent-guard",
      prompt: "",
      routineText: "No tengo una función para eso. Solo puedo generar rutinas de entrenamiento. Escribe tu objetivo, nivel o grupo muscular, por ejemplo: \"quiero perder grasa, soy principiante y entreno 4 días\".",
      historyEntry: null,
    };
  }

  const prompt = buildAiRoutinePrompt(normalizedPayload);
  const apiKey = String(GEMINI_API_KEY.value() || process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    const routineText = buildFallbackRoutineText(normalizedPayload);
    const historyEntry = await saveAiRoutineHistory({
      admin,
      uid: safeUid,
      payload: {
        ...normalizedPayload,
        ownerEmail: authToken?.email || safePayload.ownerEmail || null,
        ownerDisplayName: authToken?.name || safePayload.ownerDisplayName || null,
      },
      prompt,
      routineText,
      model: "fallback-template",
      provider: "local",
    });

    logger.info("AI routine response", {
      provider: "local",
      model: "fallback-template",
      uid: safeUid,
      historyId: historyEntry?.id || null,
    });

    return {
      success: true,
      provider: "local",
      model: "fallback-template",
      prompt,
      routineText,
      historyEntry,
    };
  }

  let responseData = {};
  let routineText = "";
  let bestEffortRoutineText = "";
  let selectedModel = GEMINI_MODEL;
  let lastGeminiErrorMessage = "No se pudo generar la rutina con Gemini.";

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Eres un entrenador personal experto en rutinas de gimnasio." }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: 2800,
          },
        }),
      }
    );

    responseData = await response.json().catch(() => ({}));
    if (response.ok) {
      selectedModel = modelName;
      routineText = extractGeminiText(responseData);
      if (routineText) {
        bestEffortRoutineText = routineText;
      }

      if (!isCompleteRoutineText(routineText, requestedDaysPerWeek)) {
        const strictCandidate = tryParseRoutineJsonText(routineText);
        if (strictCandidate) {
          routineText = strictCandidate;
        }
      }

      if (!isCompleteRoutineText(routineText, requestedDaysPerWeek)) {
        const strictResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: "Eres un entrenador personal experto en rutinas de gimnasio." }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: buildStrictRoutinePrompt(prompt, normalizedPayload) }],
                },
              ],
              generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 3200,
              },
            }),
          }
        );

        const strictData = await strictResponse.json().catch(() => ({}));
        if (strictResponse.ok) {
          let strictText = extractGeminiText(strictData);
          if (!isCompleteRoutineText(strictText, requestedDaysPerWeek)) {
            const parsedStrictText = tryParseRoutineJsonText(strictText);
            if (parsedStrictText) {
              strictText = parsedStrictText;
            }
          }
          if (strictText) {
            bestEffortRoutineText = strictText;
          }
          if (isCompleteRoutineText(strictText, requestedDaysPerWeek)) {
            routineText = strictText;
          }
        }
      }

      if (isCompleteRoutineText(routineText, requestedDaysPerWeek)) {
        break;
      }

      logger.warn("Gemini returned routine with invalid day count/structure", {
        model: modelName,
        requestedDaysPerWeek,
        returnedDaySections: countRoutineDaySections(routineText),
        returnedUniqueDaySections: countUniqueRoutineDaySections(routineText),
      });
      routineText = "";
      continue;
    }

    lastGeminiErrorMessage = responseData?.error?.message || responseData?.message || "No se pudo generar la rutina con Gemini.";
    logger.warn("Gemini model attempt failed", {
      model: modelName,
      status: response.status,
      errorMessage: lastGeminiErrorMessage,
    });

    if (response.status !== 404 && response.status !== 400) {
      logger.error("Gemini API error", {
        model: modelName,
        status: response.status,
        errorMessage: lastGeminiErrorMessage,
      });
      throw new HttpsError("internal", lastGeminiErrorMessage);
    }
  }

  if (!routineText && bestEffortRoutineText) {
    const completedBestEffortText = ensureRoutineCompleteness(
      applyRequestedRoutineMetadata(bestEffortRoutineText, normalizedPayload)
    );

    const bestEffortHistoryEntry = await saveAiRoutineHistory({
      admin,
      uid: safeUid,
      payload: {
        ...normalizedPayload,
        ownerEmail: authToken?.email || safePayload.ownerEmail || null,
        ownerDisplayName: authToken?.name || safePayload.ownerDisplayName || null,
      },
      prompt,
      routineText: completedBestEffortText,
      model: selectedModel,
      provider: "gemini",
    });

    logger.warn("Gemini routine accepted as best-effort after strict validation failed", {
      uid: safeUid,
      model: selectedModel,
      historyId: bestEffortHistoryEntry?.id || null,
      errorMessage: lastGeminiErrorMessage,
    });

    return {
      success: true,
      provider: "gemini",
      model: selectedModel,
      prompt,
      routineText: completedBestEffortText,
      historyEntry: bestEffortHistoryEntry,
      bestEffort: true,
    };
  }

  if (!routineText) {
    const fallbackRoutineText = buildFallbackRoutineText(normalizedPayload);
    const fallbackHistoryEntry = await saveAiRoutineHistory({
      admin,
      uid: safeUid,
      payload: {
        ...normalizedPayload,
        ownerEmail: authToken?.email || safePayload.ownerEmail || null,
        ownerDisplayName: authToken?.name || safePayload.ownerDisplayName || null,
      },
      prompt,
      routineText: fallbackRoutineText,
      model: "fallback-template",
      provider: "local",
    });

    logger.warn("Gemini failed to provide structured routine, using fallback", {
      uid: safeUid,
      errorMessage: lastGeminiErrorMessage,
      historyId: fallbackHistoryEntry?.id || null,
    });

    return {
      success: true,
      provider: "local",
      model: "fallback-template",
      prompt,
      routineText: fallbackRoutineText,
      historyEntry: fallbackHistoryEntry,
    };
  }

  routineText = applyRequestedRoutineMetadata(routineText, normalizedPayload);
  routineText = ensureRoutineCompleteness(routineText);

  const historyEntry = await saveAiRoutineHistory({
    admin,
    uid: safeUid,
    payload: {
      ...normalizedPayload,
      ownerEmail: authToken?.email || safePayload.ownerEmail || null,
      ownerDisplayName: authToken?.name || safePayload.ownerDisplayName || null,
    },
    prompt,
    routineText,
    model: selectedModel,
    provider: "gemini",
  });

  logger.info("AI routine response", {
    provider: "gemini",
    model: selectedModel,
    uid: safeUid,
    historyId: historyEntry?.id || null,
  });

  return {
    success: true,
    provider: "gemini",
    model: selectedModel,
    prompt,
    routineText,
    historyEntry,
  };
};

const mapHttpsErrorToStatus = (code = "internal") => {
  const mapping = {
    "invalid-argument": 400,
    unauthenticated: 401,
    "permission-denied": 403,
    "not-found": 404,
    "already-exists": 409,
    aborted: 409,
    "failed-precondition": 412,
    "resource-exhausted": 429,
    internal: 500,
    unavailable: 503,
    "deadline-exceeded": 504,
  };
  return mapping[code] || 500;
};

const applyRoutineCorsHeaders = (req, res) => {
  const origin = String(req.headers.origin || "*");
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Max-Age", "3600");
};

exports.generateClientAiRoutine = onCall(
  { cors: true, invoker: "public", secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para generar una rutina.");
    }

    return generateClientAiRoutineCore({
      uid: request.auth.uid,
      payload: request.data || {},
      authToken: request.auth.token || {},
    });
  }
);

exports.generateClientAiRoutineHttp = onRequest(
  { cors: true, invoker: "public", secrets: ["GEMINI_API_KEY"] },  
  async (req, res) => {
    applyRoutineCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "method-not-allowed", message: "Método no permitido" });
    }

    try {
      const authHeader = String(req.headers.authorization || "");
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!idToken) {
        return res.status(401).json({ error: "unauthenticated", message: "Debes iniciar sesión para generar una rutina." });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const result = await generateClientAiRoutineCore({
        uid: decodedToken.uid,
        payload: req.body || {},
        authToken: decodedToken,
      });

      return res.status(200).json(result);
    } catch (error) {
      const code = error?.code || "internal";
      const message = error?.message || "No se pudo generar la rutina con IA.";
      logger.error("generateClientAiRoutineHttp error", { code, message });

      return res.status(mapHttpsErrorToStatus(code)).json({ error: code, message });
    }
  }
);

exports.obtenerReporteFacturas = onCall({ cors: true, invoker: "public" }, async (request) => {
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

exports.generarFactura = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
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

  const pdfDoc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  pdfDoc.on("data", (chunk) => chunks.push(chunk));

  pdfDoc.fontSize(20).text("FitData GYM - Factura", { align: "left" });
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

  pdfDoc.fillColor("#000").fontSize(12).text("Conceptos", { underline: true });
  pdfDoc.moveDown(0.4);

  detalleItems.forEach((item) => {
    const nombre = String(item?.nombre || item?.name || "Producto");
    const cantidad = Number(item?.cantidad || 1);
    const precio = Number(item?.precio || item?.price || 0);
    const importe = cantidad * precio;
    pdfDoc.fontSize(10).fillColor("#111").text(`${nombre}  x${cantidad}  -  $${importe.toFixed(2)}`);
  });

  pdfDoc.moveDown();
  pdfDoc.fontSize(11).fillColor("#000").text(`Subtotal: $${subtotal.toFixed(2)}`, { align: "right" });
  pdfDoc.text(`IVA: $${iva.toFixed(2)}`, { align: "right" });
  pdfDoc.font("Helvetica-Bold").text(`Total: $${total.toFixed(2)}`, { align: "right" });
  pdfDoc.font("Helvetica");

  pdfDoc.moveDown(1.5);
  pdfDoc.fontSize(9).fillColor("#666").text("Documento generado automáticamente por FitData GYM.", { align: "center" });
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
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawPath = String(req.query.path || "").trim();
    const cleanPath = rawPath.replace(/^\/+/, "");
    const requestedName = sanitizeDownloadName(req.query.name || "dieta_vigente");

    if (!cleanPath) {
      res.status(400).json({ error: "El parámetro path es requerido." });
      return;
    }

    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Falta token de autenticación." });
      return;
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = String(decodedToken.uid || "");
    if (!uid) {
      res.status(401).json({ error: "Token inválido." });
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
        res.status(403).json({ error: "Ruta de archivo no autorizada." });
        return;
      }

      const memberSnap = await admin.firestore().doc(`miembros/${memberId}`).get();
      if (!memberSnap.exists) {
        res.status(404).json({ error: "Miembro no encontrado para este archivo." });
        return;
      }

      const memberData = memberSnap.data() || {};
      const ownerByUserId = String(memberData.userId || "") === uid;
      const ownerByAuthUid = String(memberData.authUid || "") === uid;
      if (!ownerByUserId && !ownerByAuthUid) {
        res.status(403).json({ error: "No tienes permisos para descargar este archivo." });
        return;
      }
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(cleanPath);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Archivo no encontrado en Storage." });
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata?.contentType || "application/octet-stream";

    res.set("Content-Type", contentType);
    res.set("Content-Disposition", `attachment; filename="${requestedName}"`);
    res.set("Cache-Control", "private, max-age=60");

    file.createReadStream()
      .on("error", (error) => {
        logger.error("Error al transmitir archivo de dieta", { error: String(error?.message || error) });
        if (!res.headersSent) {
          res.status(500).json({ error: "No se pudo descargar el archivo." });
        }
      })
      .pipe(res);
  } catch (error) {
    logger.error("downloadDietFile error", { error: String(error?.message || error) });
    res.status(500).json({ error: "No se pudo completar la descarga." });
  }
});

exports.actualizarVisibilidadCliente = onCall(async (request) => {
  const uid = String(request?.auth?.uid || "").trim();
  const email = String(request?.auth?.token?.email || "").trim();
  const memberId = String(request?.data?.memberId || "").trim();
  const archivado = request?.data?.archivado;
  const eliminado = request?.data?.eliminado;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  if (!memberId) {
    throw new HttpsError("invalid-argument", "memberId es requerido.");
  }

  const isAdminUser = await isPrivilegedRequest(request);
  let allowed = isAdminUser;

  if (!allowed) {
    const trainerCheck = await isTrainerForMember(memberId, uid, email);
    allowed = trainerCheck.allowed;
    if (!allowed) {
      throw new HttpsError("permission-denied", trainerCheck.reason || "No tienes permiso para modificar este cliente.");
    }
  }

  const updatePayload = {};
  if (typeof archivado === "boolean") updatePayload.archivado = archivado;
  if (typeof eliminado === "boolean") updatePayload.eliminado = eliminado;

  if (!Object.keys(updatePayload).length) {
    throw new HttpsError("invalid-argument", "Debes enviar archivado o eliminado.");
  }

  updatePayload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await admin.firestore().doc(`miembros/${memberId}`).set(updatePayload, { merge: true });

  return { success: true };
});


// ----------------------------------------------------------------------
// 1. EL TRABAJADOR AUTOMÁTICO DE MARKETING (CRON JOB)
// ----------------------------------------------------------------------
// Se ejecutará automáticamente todos los días a las 8:00 AM (Hora Centro)
exports.trabajadorNocturnoMarketing = onSchedule({
  schedule: "0 8 * * *", 
  timeZone: "America/Mexico_City",
  secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, DEFAULT_FROM_EMAIL]
}, async (event) => {
  const db = admin.firestore();
  
  // 1. Calcular las fechas exactas en el formato de tu base de datos (YYYY-MM-DD)
  const hoy = new Date();
  const mexicoOffset = -6 * 60; // Ajuste CST
  const localHoy = new Date(hoy.getTime() + (hoy.getTimezoneOffset() + mexicoOffset) * 60000);

  const formatoTexto = (fecha) => fecha.toISOString().split('T')[0];

  const hoyStr = formatoTexto(localHoy);
  
  const fecha5Dias = new Date(localHoy);
  fecha5Dias.setDate(fecha5Dias.getDate() + 5);
  const str5Dias = formatoTexto(fecha5Dias);

  const fecha30Dias = new Date(localHoy);
  fecha30Dias.setDate(fecha30Dias.getDate() + 30);
  const str30Dias = formatoTexto(fecha30Dias);

  const loginUrl = 'https://fitdatagym-f347a.web.app/login';

  // Función interna para armar y enviar el diseño HTML
  const enviarHTML = async (toEmail, userName, tipoCampaña, subjectText, mainMessage, subMessage, callToAction) => {
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
          await sendGmailSmtp({
              toEmail,
              subject: subjectText,
              message: `${mainMessage} ${subMessage}`,
              htmlTemplate,
              defaultFrom: DEFAULT_FROM_EMAIL.value() || "FitData GYM <fitdatagym@gmail.com>"
          });
          logger.info(`Campaña [${tipoCampaña}] enviada a ${toEmail}`);
      } catch (error) {
          logger.error(`Error campaña [${tipoCampaña}] a ${toEmail}:`, error);
      }
  };

  // ==========================================
  // BÚSQUEDA Y ENVÍO MASIVO AUTOMÁTICO
  // ==========================================

  // A) CAMPAÑA: VENCEN HOY
  const vencenHoySnap = await db.collection("memberships").where("active", "==", true).where("endDate", "==", hoyStr).get();
  for (const doc of vencenHoySnap.docs) {
      const data = doc.data();
      if (data.userEmail) {
          await enviarHTML(
              data.userEmail, data.userName || "Cliente", 'VENCIMIENTO_HOY',
              '🚨 Tu membresía en FitData GYM vence HOY',
              `¡Hola, ${data.userName || "Cliente"}! Tu membresía llega hoy a su fin.`,
              'No dejes que tu progreso se detenga. Pasa a recepción hoy mismo para no perder tu racha.',
              'Renovar Ahora'
          );
      }
  }

  // B) CAMPAÑA: FALTAN 5 DÍAS
  const faltan5Snap = await db.collection("memberships").where("active", "==", true).where("endDate", "==", str5Dias).get();
  for (const doc of faltan5Snap.docs) {
      const data = doc.data();
      if (data.userEmail) {
          await enviarHTML(
              data.userEmail, data.userName || "Cliente", 'RECORDATORIO_5_DIAS',
              '⏰ Tu membresía está por vencer',
              `¡Hola, ${data.userName || "Cliente"}! Te quedan 5 días de entrenamiento.`,
              'Anticipa tu renovación para que no pierdas ni un solo día. ¡Te esperamos!',
              'Ver Planes'
          );
      }
  }

  // C) CAMPAÑA: VIP RENEWAL (Solo anualidades que vencen en 30 días)
  const vipSnap = await db.collection("memberships").where("active", "==", true).where("endDate", "==", str30Dias).where("durationDays", "==", 365).get();
  for (const doc of vipSnap.docs) {
      const data = doc.data();
      if (data.userEmail) {
          await enviarHTML(
              data.userEmail, data.userName || "Cliente", 'VIP_RENEWAL',
              '⭐ Eres Leyenda en FitData GYM',
              `¡Gracias por tu lealtad, ${data.userName || "Cliente"}!`,
              'Estás a 30 días de cumplir tu anualidad con nosotros. Renueva este mes y obtén un 20% de descuento directo.',
              'Canjear Regalo'
          );
      }
  }

  logger.info("Trabajador automático de Marketing terminó su ronda diaria.");
});
// ----------------------------------------------------------------------


// ============================================================================
// 2. TICKETS ORIGINALES (VENTAS, RENOVACIONES, BIENVENIDAS) - INTACTOS
// ============================================================================

exports.onMembershipCreatedSendEmail = onDocumentCreated({
  document: "memberships/{membershipId}",
  secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, DEFAULT_FROM_EMAIL],
}, async (event) => {
  const membership = event.data?.data();
  if (!membership) return;

  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "membership-email",
      membershipId: event.params.membershipId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) return;
    throw error;
  }

  const recipient = membership.userEmail;
  if (!recipient) return;

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
    logger.info("Correo de renovación enviado exitosamente", { email: recipient });
  } catch (error) {
    logger.error("Error enviando correo de renovación", { error: String(error.message || error) });
  }
});

// ============================================================================
// 2. CORREO DE COMPROBANTE DE VENTA (TICKET)
// ============================================================================
exports.onSaleCreatedSendEmail = onDocumentCreated({
  document: "ventas/{ventaId}",
  secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, DEFAULT_FROM_EMAIL],
}, async (event) => {
  const venta = event.data?.data();
  if (!venta) return;

  // Evitar correos duplicados
  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "sale-email",
      ventaId: event.params.ventaId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) return;
    throw error;
  }

  const recipient = venta.clienteEmail || venta.cliente_email;
  if (!recipient) return;

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

  let productos = [];
  try {
    if (typeof venta.detalle_productos === "string") {
      productos = JSON.parse(venta.detalle_productos);
    } else if (Array.isArray(venta.detalle_productos)) {
      productos = venta.detalle_productos;
    }
  } catch (e) {}

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
    logger.info("Comprobante de venta enviado exitosamente", { email: recipient });
  } catch (error) {
    logger.error("Error enviando comprobante de venta", { error: String(error.message || error) });
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
  secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, DEFAULT_FROM_EMAIL],
}, async (event) => {
  const miembro = event.data?.data();
  if (!miembro) return;

  const eventRef = admin.firestore().collection("_functionEvents").doc(event.id);
  try {
    await eventRef.create({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "member-email",
      memberId: event.params.memberId,
    });
  } catch (error) {
    if (error.code === 6 || String(error.message || "").includes("ALREADY_EXISTS")) return;
    throw error;
  }

  const recipient = miembro.email;
  if (!recipient) return;

  const nombre = miembro.nombre || "Cliente";
  const apellido = miembro.apellido || "";
  const nombreCompleto = `${nombre} ${apellido}`.trim();
  const fechaInscripcion = new Date(miembro.fecha_inscripcion?.toDate?.() || miembro.fecha_inscripcion || new Date());
  const fechaStr = fechaInscripcion.toLocaleDateString("es-MX");

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
    logger.info("Email de bienvenida y pago enviado", { email: recipient });
  } catch (error) {
    logger.error("Error enviando email de bienvenida y pago", { error: String(error.message || error) });
  }
});

exports.createUserAccount = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
  if (!request.auth) {
    throw new Error("No autenticado");
  }

  const { email, password, displayName } = request.data;

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

const normalizeClaimRole = (value = "") => String(value || "").trim().toLowerCase();

const buildCustomClaimsFromUser = (userData = {}) => {
  const role = normalizeClaimRole(
    userData.role ||
    userData.userType ||
    userData.tipo ||
    userData.accountType ||
    ""
  );

  if (userData.admin === true || userData.isAdmin === true || role === "admin") {
    return { admin: true, role: "ADMIN" };
  }

  if (
    userData.isTrainer === true ||
    userData.is_trainer === true ||
    ["trainer", "entrenador", "coach"].includes(role)
  ) {
    return { trainer: true, role: "TRAINER" };
  }

  if (
    userData.isNutritionist === true ||
    userData.is_nutritionist === true ||
    ["nutriologo", "nutritionist", "nutri"].includes(role)
  ) {
    return { nutriologo: true, role: "NUTRIOLOGO" };
  }

  if (role) {
    return { role: role.toUpperCase() };
  }

  return {};
};

exports.ensureUserClaim = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "No autenticado");
  }

  const db = admin.firestore();
  const authUid = String(request.auth.uid || "").trim();
  const authEmail = String(request.auth.token?.email || "").trim().toLowerCase();

  const userCandidates = [];
  const seenIds = new Set();

  const addCandidate = (docSnap) => {
    if (!docSnap?.exists || seenIds.has(docSnap.id)) return;
    seenIds.add(docSnap.id);
    userCandidates.push({ id: docSnap.id, data: docSnap.data() || {} });
  };

  addCandidate(await db.collection("users").doc(authUid).get());

  const byAuthUid = await db.collection("users").where("authUid", "==", authUid).limit(5).get();
  byAuthUid.docs.forEach(addCandidate);

  if (authEmail) {
    const byEmail = await db.collection("users").where("email", "==", authEmail).limit(5).get();
    byEmail.docs.forEach(addCandidate);
  }

  const matchedUser = userCandidates[0]?.data || null;
  if (!matchedUser) {
    return { success: true, synced: false, claims: request.auth.token || {} };
  }

  const desiredClaims = buildCustomClaimsFromUser(matchedUser);
  const currentClaims = request.auth.token || {};
  const claimsChanged = Object.keys(desiredClaims).some((key) => currentClaims[key] !== desiredClaims[key])
    || Object.keys(currentClaims).some((key) => desiredClaims[key] !== currentClaims[key] && ["admin", "trainer", "nutriologo", "role"].includes(key));

  if (claimsChanged && Object.keys(desiredClaims).length > 0) {
    await admin.auth().setCustomUserClaims(authUid, desiredClaims);
  }

  return {
    success: true,
    synced: claimsChanged,
    claims: desiredClaims,
  };
});

exports.registerTrainerByAdmin = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
  const db = admin.firestore();

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    contractType,
    specialty,
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
    const resolvedSpecialty = String(specialty || "").trim() || "General";

    await db.collection("users").doc(authUser.uid).set({
      email,
      username: resolvedUsername,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      role: "trainer",
      specialty: resolvedSpecialty,
      especialidad: resolvedSpecialty,
      contractType: contractType || "Asignación por cliente",
      tipoContrato: contractType || "Asignación por cliente",
      isStaff: true,
      isSuperuser: false,
      isActive: true,
      authUid: authUser.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, { merge: true });

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

exports.deactivateTrainerByAdmin = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
  const db = admin.firestore();

  const { trainerUid, reason = "" } = request.data || {};
  const normalizedTrainerUid = String(trainerUid || "").trim();

  if (!normalizedTrainerUid) {
    throw new HttpsError("invalid-argument", "Falta el identificador del entrenador");
  }

  try {
    await assertAdminRequest(request, db);

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const userRefsByPath = new Map();

    const registerDocSnap = (docSnap) => {
      if (docSnap?.exists) {
        userRefsByPath.set(docSnap.ref.path, docSnap.ref);
      }
    };

    const directRef = db.collection("users").doc(normalizedTrainerUid);
    registerDocSnap(await directRef.get());

    const byAuthUidSnap = await db.collection("users")
      .where("authUid", "==", normalizedTrainerUid)
      .get();
    byAuthUidSnap.docs.forEach(registerDocSnap);

    if (normalizedTrainerUid.includes("@")) {
      const emailCandidate = normalizedTrainerUid.toLowerCase();
      const byEmailSnap = await db.collection("users")
        .where("email", "==", emailCandidate)
        .get();
      byEmailSnap.docs.forEach(registerDocSnap);
    }

    if (userRefsByPath.size === 0) {
      throw new HttpsError("not-found", "Entrenador no encontrado");
    }

    const primarySnap = await directRef.get();
    const authUid = String(
      primarySnap.data()?.authUid ||
      normalizedTrainerUid
    ).trim();

    await Promise.all(Array.from(userRefsByPath.values()).map((userRef) => userRef.set({
      role: "inactive_trainer",
      isTrainer: false,
      is_trainer: false,
      isActive: false,
      trainerActive: false,
      trainerStatus: "inactive",
      contractStatus: "inactive",
      deactivatedAt: timestamp,
      deactivatedReason: reason || null,
      updatedAt: timestamp,
    }, { merge: true })));

    if (authUid) {
      await admin.auth().revokeRefreshTokens(authUid);
      await admin.auth().updateUser(authUid, { disabled: true });
      await admin.auth().setCustomUserClaims(authUid, {
        role: "INACTIVE_TRAINER",
        trainer: false,
        active: false,
      });
    }

    logger.info("Entrenador desactivado", {
      trainerUid: normalizedTrainerUid,
      authUid,
      reason: String(reason || ""),
    });

    return {
      success: true,
      trainerUid: normalizedTrainerUid,
      authUid,
    };
  } catch (error) {
    logger.error("Error en deactivateTrainerByAdmin", {
      trainerUid: normalizedTrainerUid,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "No se pudo desactivar al entrenador");
  }
});

exports.reactivateTrainerByAdmin = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
  const db = admin.firestore();

  const { trainerUid, reason = "" } = request.data || {};
  const normalizedTrainerUid = String(trainerUid || "").trim();

  if (!normalizedTrainerUid) {
    throw new HttpsError("invalid-argument", "Falta el identificador del entrenador");
  }

  try {
    await assertAdminRequest(request, db);

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const userRefsByPath = new Map();

    const registerDocSnap = (docSnap) => {
      if (docSnap?.exists) {
        userRefsByPath.set(docSnap.ref.path, docSnap.ref);
      }
    };

    const directRef = db.collection("users").doc(normalizedTrainerUid);
    registerDocSnap(await directRef.get());

    const byAuthUidSnap = await db.collection("users")
      .where("authUid", "==", normalizedTrainerUid)
      .get();
    byAuthUidSnap.docs.forEach(registerDocSnap);

    if (normalizedTrainerUid.includes("@")) {
      const emailCandidate = normalizedTrainerUid.toLowerCase();
      const byEmailSnap = await db.collection("users")
        .where("email", "==", emailCandidate)
        .get();
      byEmailSnap.docs.forEach(registerDocSnap);
    }

    if (userRefsByPath.size === 0) {
      throw new HttpsError("not-found", "Entrenador no encontrado");
    }

    const primarySnap = await directRef.get();
    const authUid = String(
      primarySnap.data()?.authUid ||
      normalizedTrainerUid
    ).trim();

    await Promise.all(Array.from(userRefsByPath.values()).map((userRef) => userRef.set({
      role: "trainer",
      isTrainer: true,
      is_trainer: true,
      isActive: true,
      trainerActive: true,
      trainerStatus: "active",
      contractStatus: "active",
      reactivatedAt: timestamp,
      reactivatedReason: reason || null,
      updatedAt: timestamp,
    }, { merge: true })));

    if (authUid) {
      await admin.auth().revokeRefreshTokens(authUid);
      await admin.auth().updateUser(authUid, { disabled: false });
      await admin.auth().setCustomUserClaims(authUid, {
        role: "TRAINER",
        trainer: true,
        active: true,
      });
    }

    logger.info("Entrenador reactivado", {
      trainerUid: normalizedTrainerUid,
      authUid,
      reason: String(reason || ""),
    });

    return {
      success: true,
      trainerUid: normalizedTrainerUid,
      authUid,
    };
  } catch (error) {
    logger.error("Error en reactivateTrainerByAdmin", {
      trainerUid: normalizedTrainerUid,
      error: String(error.message || error),
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", error.message || "No se pudo reactivar al entrenador");
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

  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password || !firstName || !lastName) {
    throw new HttpsError("invalid-argument", "Faltan campos requeridos para el registro del nutriólogo");
  }

  let createdAuthUid = null;

  try {
    await assertAdminRequest(request, db);

    const authUser = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });
    createdAuthUid = authUser.uid;

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("users").doc(authUser.uid).set({
      email: normalizedEmail,
      username: buildUsernameFromEmail(normalizedEmail),
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
    }, { merge: true });

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
  { cors: { origin: true }, invoker: "public" },
  registerNutriologoByAdminHandler,
);

// Alias para evitar endpoint legacy con permisos atascados.
exports.registerNutriologoByAdminV2 = onCall(
  { cors: { origin: true }, invoker: "public" },
  registerNutriologoByAdminHandler,
);

exports.registerClientByAdmin = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
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
      }, { merge: true });

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


exports.updateClientEmail = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
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

exports.updateSelfProfile = onCall({ cors: { origin: true }, invoker: "public" }, async (request) => {
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
    edad,
    birthDay,
    birthMonth,
    birthYear,
    birthDate,
  } = request.data || {};

  const normalizedUsername = String(username || "").trim();
  const normalizedEmail = String(email || tokenEmail || "").trim().toLowerCase();
  const normalizedPhone = String(telefono || "").replace(/\D/g, "").slice(0, 10);
  const toInt = (value) => {
    const parsed = Number(String(value ?? "").replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const buildAgeFromBirth = (d, m, y) => {
    if (!d || !m || !y) return null;
    const birth = new Date(y, m - 1, d);
    if (
      birth.getFullYear() !== y ||
      birth.getMonth() !== (m - 1) ||
      birth.getDate() !== d
    ) {
      return null;
    }

    const now = new Date();
    let age = now.getFullYear() - y;
    const hadBirthday =
      now.getMonth() > (m - 1) ||
      (now.getMonth() === (m - 1) && now.getDate() >= d);
    if (!hadBirthday) age -= 1;
    if (age < 0 || age > 120) return null;
    return age;
  };

  const birthDateMatch = String(birthDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const normalizedBirthDay = toInt(birthDay ?? (birthDateMatch ? birthDateMatch[3] : null));
  const normalizedBirthMonth = toInt(birthMonth ?? (birthDateMatch ? birthDateMatch[2] : null));
  const normalizedBirthYear = toInt(birthYear ?? (birthDateMatch ? birthDateMatch[1] : null));

  const hasAnyBirthField = Boolean(normalizedBirthDay || normalizedBirthMonth || normalizedBirthYear);
  const hasFullBirthField = Boolean(normalizedBirthDay && normalizedBirthMonth && normalizedBirthYear);

  if (hasAnyBirthField && !hasFullBirthField) {
    throw new HttpsError("invalid-argument", "Completa día, mes y año de nacimiento");
  }

  const ageFromBirth = hasFullBirthField
    ? buildAgeFromBirth(normalizedBirthDay, normalizedBirthMonth, normalizedBirthYear)
    : null;

  if (hasFullBirthField && ageFromBirth === null) {
    throw new HttpsError("invalid-argument", "Fecha de nacimiento inválida");
  }

  const parsedAge = Number(edad);
  const normalizedAge = ageFromBirth !== null
    ? ageFromBirth
    : (Number.isFinite(parsedAge) && parsedAge > 0
      ? Math.min(100, Math.max(10, Math.trunc(parsedAge)))
      : null);

  const normalizedBirthDate = hasFullBirthField
    ? `${String(normalizedBirthYear).padStart(4, "0")}-${String(normalizedBirthMonth).padStart(2, "0")}-${String(normalizedBirthDay).padStart(2, "0")}`
    : null;

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
      age: normalizedAge,
      edad: normalizedAge,
      birthDay: hasFullBirthField ? String(normalizedBirthDay).padStart(2, "0") : null,
      birthMonth: hasFullBirthField ? String(normalizedBirthMonth).padStart(2, "0") : null,
      birthYear: hasFullBirthField ? String(normalizedBirthYear) : null,
      birthDate: normalizedBirthDate,
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
        age: normalizedAge,
        edad: normalizedAge,
        birthDate: normalizedBirthDate,
        updatedAt: timestamp,
      });
      membersUpdated += 1;
    }

    const healthProfileDocIds = new Set();
    memberTargets.forEach((ref) => healthProfileDocIds.add(ref.id));
    if (userId !== undefined && userId !== null && String(userId).trim()) {
      healthProfileDocIds.add(String(userId).trim());
    }
    healthProfileDocIds.add(authUid);

    let healthProfilesUpdated = 0;
    for (const profileId of healthProfileDocIds) {
      if (!profileId) continue;
      await db.collection("healthProfiles").doc(profileId).set({
        memberId: String(profileId),
        userId: String(authUid),
        userIdDisplay: String(profileId),
        age: normalizedAge,
        edad: normalizedAge,
        birthDate: normalizedBirthDate,
        updatedAt: timestamp,
      }, { merge: true });
      healthProfilesUpdated += 1;
    }

    logger.info("Perfil propio actualizado", {
      authUid,
      usersUpdated,
      membersUpdated,
      healthProfilesUpdated,
    });

    return { success: true, usersUpdated, membersUpdated, healthProfilesUpdated };
  } catch (error) {
    logger.error("Error en updateSelfProfile", {
      authUid,
      error: String(error.message || error),
    });
    throw new HttpsError("internal", error.message || "No se pudo actualizar el perfil");
  }
});

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const React = require("react");
let renderEmail;
let Html, Head, Body, Container, Text, Heading;
try {
  const reactEmail = require("@react-email/components");
  Html = reactEmail.Html;
  Head = reactEmail.Head;
  Body = reactEmail.Body;
  Container = reactEmail.Container;
  Text = reactEmail.Text;
  Heading = reactEmail.Heading;
  renderEmail = require("@react-email/render").render;
} catch (e) {
  logger.warn("No se pudo cargar react-email, se usara HTML crudo", e);
}
const { Resend } = require("resend");

exports.onMessageCreated = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const messageData = snap.data();
    const senderId = messageData.senderId;
    const chatId = event.params.chatId;

    if (!senderId) return;

    try {
      const db = admin.firestore();
      
      const ids = chatId.split("_");
      const recipientId = ids.find(id => id !== senderId);

      if (!recipientId) return;

      const [senderSnap, recipientSnap] = await Promise.all([
        db.collection("users").doc(senderId).get(),
        db.collection("users").doc(recipientId).get()
      ]);

      const senderName = senderSnap.data()?.username || senderSnap.data()?.clienteNombre || "Usuario";
      const recipientEmail = recipientSnap.data()?.email;

      await db.collection(`users/${recipientId}/notifications`).add({
        title: `Nuevo mensaje de ${senderName}`,
        body: messageData.text || "Archivo adjunto",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        type: "chat_message",
        chatId: chatId,
        senderId: senderId
      });

      if (recipientEmail) {
        let resendApiKey;
        try {
           resendApiKey = RESEND_API_KEY.value();
        } catch(e) {
           resendApiKey = process.env.RESEND_API_KEY;
        }
        
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          let htmlContent = `<h2>Tienes un nuevo mensaje de ${senderName}</h2><p>${messageData.text || "Te han enviado un archivo adjunto."}</p><br><small>FitData GYM</small>`;
          
          if (renderEmail && Html) {
            try {
              const emailElement = React.createElement(Html, null,
                React.createElement(Head, null),
                React.createElement(Body, { style: { fontFamily: "sans-serif", padding: "20px" } },
                  React.createElement(Container, null,
                    React.createElement(Heading, null, `Tienes un nuevo mensaje de ${senderName}`),
                    React.createElement(Text, null, messageData.text || "Te han enviado un archivo adjunto."),
                    React.createElement(Text, { style: { color: "#888", fontSize: "12px", marginTop: "20px" } }, "FitData GYM")
                  )
                )
              );
              htmlContent = renderEmail(emailElement);
            } catch(e) {
              logger.warn("Fallo el render de react-email, usando por defecto", e);
            }
          }

          await resend.emails.send({
            from: "FitData GYM <onboarding@resend.dev>",
            to: recipientEmail,
            subject: `Nuevo mensaje de ${senderName}`,
            html: htmlContent
          });
        } else {
             logger.warn("No se encontro API Key de Resend");
        }
      }
    } catch (error) {
      logger.error("Error en onMessageCreated", error);
    }
  }


);exports.pruebaDisenoMarketing = onRequest({ secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD", "DEFAULT_FROM_EMAIL"] }, async (req, res) => {
  const loginUrl = 'https://fitdatagym-f347a.web.app/login';
  
  const htmlTemplate = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #0f172a; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; border-bottom: 3px solid #2dd4bf;">
          <h1 style="color: #2dd4bf; margin: 0; font-size: 28px; letter-spacing: 2px;">FitData GYM</h1>
      </div>
      <div style="padding: 40px 30px; background-color: #1e293b; color: #f8fafc;">
          <h2 style="color: #f1f5f9; font-size: 20px; margin-top: 0;">¡Hola, Joely! Tu membresía llega hoy a su fin.</h2>
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">No dejes que tu progreso se detenga. Pasa a recepción hoy mismo para no perder tu racha.</p>
          <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
              <a href="${loginUrl}" style="background-color: #0d9488; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Iniciar Sesión</a>
          </div>
      </div>
      <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 FitData GYM. Todos los derechos reservados.</p>
      </div>
  </div>
  `;

  try {
      await sendGmailSmtp({
          toEmail: 'reyesjoely448@gmail.com', // Pon tu correo personal aquí
          subject: '🚨 PRUEBA DE DISEÑO: Tu membresía vence HOY',
          message: 'Texto de respaldo',
          htmlTemplate: htmlTemplate,
          defaultFrom: "FitData GYM <fitdatagym@gmail.com>"
      });
      res.send("<h1>¡Magia hecha! Revisa tu bandeja de entrada en tu celular o PC.</h1>");
  } catch (error) {
      res.status(500).send("<h1>Error al enviar:</h1> <p>" + error.message + "</p>");
  }
});