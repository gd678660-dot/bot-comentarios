const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const SONG_LINK = process.env.SONG_LINK || "";
const API = process.env.GRAPH_BASE || "https://graph.instagram.com/v23.0";

// IDs de los videos donde debe responder (separados por coma). Vacío = todos.
const VIDEOS = (process.env.MEDIA_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Mensajes (se pueden cambiar desde Vercel sin tocar el código)
const MENSAJE_DM =
  process.env.MENSAJE_DM ||
  "¡Hola {nombre}! 🙏🏻 Gracias por tu comentario. Aquí puedes escuchar la canción: {link}";
const MENSAJE_COMENTARIO =
  process.env.MENSAJE_COMENTARIO ||
  "¡Saludos {nombre}! Te acabo de mandar el link por mensaje directo 🎶🙏🏻";

const llenar = (plantilla, nombre) =>
  plantilla.split("{nombre}").join(nombre).split("{link}").join(SONG_LINK);

const quiereEscuchar = (texto = "") => {
  const t = texto.toLowerCase();
  return t.includes("quiero escucharla") || t.includes("🙏");
};

async function enviarDM(commentId, nombre) {
  const r = await fetch(`${API}/${IG_USER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${IG_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: llenar(MENSAJE_DM, nombre) },
    }),
  });
  console.log("DM:", r.status, await r.text());
}

async function responderComentario(commentId, nombre) {
  const r = await fetch(`${API}/${commentId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${IG_TOKEN}`,
    },
    body: JSON.stringify({ message: llenar(MENSAJE_COMENTARIO, nombre) }),
  });
  console.log("Reply:", r.status, await r.text());
}

module.exports = async (req, res) => {
  // Verificación del webhook
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // Eventos de comentarios
  if (req.method === "POST") {
    try {
      console.log("Evento recibido:", JSON.stringify(req.body));
      for (const entry of req.body?.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "comments") continue;
          const c = change.value;
          if (!c?.id || !c?.text) continue;
          if (c.from?.id === IG_USER_ID) continue; // no responderse a sí mismo

          console.log("Comentario en el video:", c.media?.id, "| texto:", c.text);
          if (VIDEOS.length && !VIDEOS.includes(c.media?.id)) continue;
          if (!quiereEscuchar(c.text)) continue;

          const nombre = c.from?.username ? `@${c.from.username}` : "";
          await enviarDM(c.id, nombre);
          await responderComentario(c.id, nombre);
        }
      }
    } catch (e) {
      console.error("Error:", e);
    }
    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Method Not Allowed");
};
