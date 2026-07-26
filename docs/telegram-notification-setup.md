# Notifica Telegram - Nuove Registrazioni

Quando un nuovo utente si registra su GymBro, ricevi un messaggio Telegram.

## Architettura

```
Nuovo utente si registra → supabase.auth.signUp() riuscito
    ↓
Client chiama notifyNewUser() (server function)
    ↓
Server invia messaggio via Telegram Bot API
    ↓
Tu ricevi il messaggio su Telegram 🎉
```

## Setup

### 1. Bot Telegram

1. Apri **Telegram** → cerca **@BotFather**
2. Scrivi `/newbot` → segui le istruzioni
3. Copia il **token** che ricevi
4. Manda un messaggio al tuo bot (qualsiasi cosa, tipo "ciao")
5. Apri nel browser: `https://api.telegram.org/bot<TOKEN>/getUpdates`
6. Cerca `"chat":{"id":` nella risposta → quel numero è il tuo **chat_id**

### 2. Variabili d'ambiente (Vercel)

Le env vars sono già configuarate via CLI. Se volessi aggiornarle:

```bash
vercel env add TELEGRAM_BOT_TOKEN production
vercel env add TELEGRAM_CHAT_ID production
```

oppure manualmente su Vercel Dashboard → Settings → Environment Variables.

### 3. Deploy

```bash
vercel --prod
```

## File coinvolti

| File | Descrizione |
|------|-------------|
| `src/server-functions/notify-telegram.ts` | Server function che invia il messaggio Telegram |
| `src/routes/auth.index.tsx` | Chiama `notifyNewUser()` dopo il signup riuscito |
| `.env.local` | Token e chat_id (gitignored, solo locale) |

## Test

1. Vai su `https://mygymbro.org/auth?mode=signup`
2. Registrati con un nuovo email
3. Dovresti ricevere su Telegram:

```
🏋️ Nuovo utente GymBro!

📧 Email: nuovo@utente.com
🕐 Ora: 26/7/2026, 15:30:00
```

## Troubleshooting

**Non arriva il messaggio?**
- Verifica che le env vars `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` siano impostate su Vercel
- Controlla i log su Vercel Dashboard → Deployments → Logs
- Verifica che il bot Telegram sia attivo (manda un messaggio a @BotFather)
- Testa la server function direttamente dalla console del browser:
  ```js
  // Apri la console su mygymbro.org ed esegui:
  import("@/server-functions/notify-telegram").then(m => 
    m.notifyNewUser({ data: { email: "test@test.com" } })
  )
  ```
