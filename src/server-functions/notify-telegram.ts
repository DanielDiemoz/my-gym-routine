import { createServerFn } from "@tanstack/react-start";

export interface NewUserData {
  email: string;
  userId: string;
  userAgent: string;
  platform: string;
  language: string;
  screen: string;
  referrer: string;
}

export const notifyNewUser = createServerFn({ method: "POST" })
  .validator((data: NewUserData) => data)
  .handler(async ({ data }) => {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    console.log("notifyNewUser called with:", JSON.stringify(data));
    console.log("Token exists:", !!TELEGRAM_BOT_TOKEN, "length:", TELEGRAM_BOT_TOKEN?.length);
    console.log("ChatId:", TELEGRAM_CHAT_ID);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Telegram env vars not configured");
      return { success: false, error: "Telegram not configured" };
    }

    const createdAt = new Date().toLocaleString("it-IT", {
      timeZone: "Europe/Rome",
    });

    const ua = data.userAgent;
    let browser = "Sconosciuto";
    let os = "Sconosciuto";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    const message = [
      `🏋️ Nuovo utente GymBro!`,
      ``,
      `📧 Email: ${data.email}`,
      `🆔 ID: ${data.userId}`,
      `🕐 Ora: ${createdAt}`,
      ``,
      `📱 Dispositivo: ${os} - ${browser}`,
      `🗣️ Lingua: ${data.language}`,
      `📐 Schermo: ${data.screen}`,
      `🔗 Referrer: ${data.referrer || "Direct"}`,
    ].join("\n");

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Telegram API error:", error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error("Telegram notification error:", error);
      return { success: false, error: (error as Error).message };
    }
  });
