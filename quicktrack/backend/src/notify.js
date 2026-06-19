const axios = require('axios');
const twilio = require('twilio');

async function sendTelegramAlert(slot, result) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram not configured, skipping');
    return;
  }

  const message = `FOUND: ${result.productName} is IN STOCK on ${slot.platform}!\nPrice: ${result.price}\nPincode: ${slot.pincode}`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message
    });
    console.log('Telegram alert sent');
  } catch (err) {
    console.error('Telegram send failed:', err.response?.data || err.message);
  }
}

async function sendWhatsAppAlert(slot, result) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  if (!sid || !authToken || !from || !to) {
    console.warn('WhatsApp not configured, skipping');
    return;
  }

  const client = twilio(sid, authToken);
  const message = `FOUND: ${result.productName} is IN STOCK on ${slot.platform}! Price: ${result.price} | Pincode: ${slot.pincode}`;

  try {
    await client.messages.create({ from, to, body: message });
    console.log('WhatsApp alert sent');
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
  }
}

async function sendAllAlerts(slot, result) {
  await Promise.all([
    sendTelegramAlert(slot, result),
    sendWhatsAppAlert(slot, result)
  ]);
}

module.exports = { sendTelegramAlert, sendWhatsAppAlert, sendAllAlerts };
