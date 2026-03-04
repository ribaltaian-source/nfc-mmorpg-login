require("dotenv").config();
const { NFC } = require("nfc-pcsc");
const crypto = require("crypto");

// 🔐 Clave AES de 32 bytes (64 hex chars)
const AES_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

// ===================== Funciones de encriptar/desencriptar =====================
function encryptData(obj, key) {
  const text = JSON.stringify(obj);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptData(encryptedData, key) {
  const [ivHex, encryptedHex] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
}

// ===================== Datos de ejemplo del jugador =====================
let examplePlayer = {
  nick: "Jugador_1234",
  level: 10,
  classType: "Espadachín",
  armor: "Armadura Épica",
  inventory: [
    { item: "Espada Legendaria", qty: 1 },
    { item: "Poción", qty: 5 }
  ]
};

// ===================== Inicializar NFC =====================
const nfc = new NFC();

nfc.on("reader", reader => {
  console.log(`📡 Lector detectado: ${reader.reader.name}`);

  reader.on("card", async card => {
    console.log(`🎴 Tarjeta detectada UID: ${card.uid}`);

    try {
      // 1️⃣ Encriptar datos del jugador
      const encryptedData = encryptData(examplePlayer, AES_KEY);

      // 2️⃣ Escribir datos en tarjeta (ejemplo bloque 4)
      const dataBuffer = Buffer.from(encryptedData, "utf8");
      await reader.write(4, dataBuffer); // Ajustar bloque según tarjeta
      console.log("💾 Datos encriptados guardados en tarjeta");

      // 3️⃣ Leer datos de tarjeta
      const readBuffer = await reader.read(4, dataBuffer.length); 
      const readEncrypted = readBuffer.toString("utf8");

      // 4️⃣ Desencriptar datos
      const playerData = decryptData(readEncrypted, AES_KEY);
      console.log("📖 Datos leídos y desencriptados:", playerData);

      // ===================== Ejemplo: modificar inventario =====================
      playerData.inventory.push({ item: "Escudo Legendario", qty: 1 });
      const updatedEncrypted = encryptData(playerData, AES_KEY);
      await reader.write(4, Buffer.from(updatedEncrypted, "utf8"));
      console.log("🔄 Inventario actualizado en la tarjeta:", playerData.inventory);

    } catch (err) {
      console.error("❌ Error NFC:", err);
    }
  });

  reader.on("error", err => console.error("Reader error:", err));
});

console.log("📡 Esperando tarjeta NFC...");
