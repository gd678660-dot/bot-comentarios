const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const API = process.env.GRAPH_BASE || "https://graph.instagram.com/v23.0";

module.exports = async (req, res) => {
  try {
    const r = await fetch(
      `${API}/${IG_USER_ID}/subscribed_apps?subscribed_fields=comments,messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${IG_TOKEN}` },
      }
    );
    const texto = await r.text();
    return res.status(200).send(`Estado: ${r.status}\n${texto}`);
  } catch (e) {
    return res.status(500).send("Error: " + e.message);
  }
};
