# Piano: collegare email agli account legacy (username-only)

## Contesto

- Account legacy: email fittizia `username@gymbro.local` in Supabase Auth (`src/routes/auth.tsx:157`).
- Il reset password (`src/routes/auth.reset.tsx`) usa `resetPasswordForEmail`, che richiede un'email reale confermata → non funziona per gli account legacy.
- `src/routes/_authenticated/profilo.tsx:79` ha già un "Aggiungi una email" ma si mostra solo se `user.email` è vuoto; gli utenti legacy hanno `@gymbro.local`, quindi il bottone non appare mai.
- Decisioni utente:
  - Flusso in-app: full-screen banner, senza email reale non si può usare l'app.
  - Obbligo: blocca finché non aggiungono l'email.
  - Tab legacy: resta per ora (solo login), la registrazione legacy (senza email) va rimossa. I nuovi clienti si registrano col tab Email (già richiede email).

## Approccio

Usare il flusso nativo Supabase: `supabase.auth.updateUser({ email })` invia un link di conferma all'email reale. Una volta confermato, l'account diventa email-based e il reset password funziona. Nessuna migration DB: il rilevamento usa il dominio `@gymbro.local`.

## Modifiche

### 1. NUOVO file `src/components/EmailMigrationGate.tsx`

Componente full-screen che blocca l'app per gli utenti legacy.

- Esporta `isLegacyEmail(email?: string|null)` → `!!email && email.endsWith("@gymbro.local")`.
- Props: `{ user: { id, email? } }`.
- Stato locale: `email`, `saving`, `sent`.
- Se `!sent`: schermata con spiegazione + input email + bottone "Invia link di conferma".
  - `handleSubmit`: `await supabase.auth.updateUser({ email: email.trim() })`; on success `setSent(true)` + toast; on error toast.
- Se `sent`: schermata "Controlla la tua email" con l'indirizzo e bottone "Ho già confermato? Ricarica" → `handleReload` (`supabase.auth.getUser()` + `navigate({ to: "/" })`).
- `useEffect` con `supabase.auth.onAuthStateChange`: su evento `USER_UPDATED`, se `session.user.email` non è più legacy → `navigate({ to: "/" })` (sblocca l'app).
- Styling coerente con il resto (container-app, rounded-2xl, bg-primary, ecc.).

### 2. `src/routes/_authenticated/route.tsx`

In `AuthLayout`:

- Calcolare `const isLegacy = isLegacyEmail(user.email)` (import da `EmailMigrationGate`).
- PRIMA del check `needsOnboarding`, se `isLegacy` → `return <EmailMigrationGate user={user} />;` (blocca tutte le rotte autenticate: home, schede, storico, cerchia, profilo, onboarding).

### 3. `src/routes/auth.tsx`

- `UsernameForm`: rimuovere la modalità `signup`. Tenere solo login (`username` + `password` → `username@gymbro.local`).
  - Rimuovere il ramo `if (mode === "signup")` e il toggle interno "Registrati".
  - La prop `mode`/`setMode` non serve più per UsernameForm (rimuovere o fissare a "login").
- Nel `AuthPage`, il toggle in basso "Non hai un account? Registrati": quando il tab è `username`, deve portare al tab **Email** in modalità signup (es. `setTab("email"); setMode("signup")`) invece di attivare la signup legacy. Oppure nascondere il toggle sul tab legacy.
- Il tab **Email** resta invariato (`emailSchema` richiede email) → i nuovi clienti si registrano con email obbligatoria.

### 4. `src/routes/_authenticated/profilo.tsx` (piccolo tweak, coerenza)

- A profilo.tsx:79 cambiare la condizione da `user.email ?` a `!isLegacyEmail(user.email) ?` (import `isLegacyEmail`) così il bottone "Aggiungi una email" considera `@gymbro.local` come "nessuna email reale". (Gli utenti legacy saranno comunque bloccati dal gate, ma così è coerente.)

## Verifica

- `npm run build` / `npm run lint` / `npm run typecheck` (se presenti in package.json) devono passare.
- Test manuale: login con un account legacy → compare il gate full-screen; inserire email reale → arriva link; confermare → al ritorno l'app è sbloccata e il reset password funziona con la nuova email.
- Nuovo cliente: tab Email → registrazione con email ok; tab Username → solo login, nessuna registrazione senza email.

## Note

- Quando tutti gli amici avranno confermato, rimuovere il tab "Username (legacy)" (step successivo a parte).
