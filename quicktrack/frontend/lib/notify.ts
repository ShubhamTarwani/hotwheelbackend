// External notifications (Telegram and Twilio WhatsApp)

export async function sendTelegramMessage(botToken: string, chatId: string, message: string) {
  if (!botToken || !chatId) return false;
  
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });
    return res.ok;
  } catch (error) {
    console.error('Telegram error:', error);
    return false;
  }
}

export async function sendTwilioWhatsApp(accountSid: string, authToken: string, fromNumber: string, toNumber: string, message: string) {
  if (!accountSid || !authToken || !fromNumber || !toNumber) return false;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const params = new URLSearchParams();
  params.append('To', `whatsapp:${toNumber.replace('whatsapp:', '')}`);
  params.append('From', `whatsapp:${fromNumber.replace('whatsapp:', '')}`);
  params.append('Body', message);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
      },
      body: params
    });
    return res.ok;
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    return false;
  }
}
