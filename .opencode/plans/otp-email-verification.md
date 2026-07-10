# Piano: conferma via codice OTP (signup + aggiunta email legacy)

## Obiettivo
Sostituire il link di conferma email con un **codice a 6 cifre** da inserire nell'app, sia per:
1. La registrazione col tab **Email** (`auth.tsx`).
2. L'aggiunta dell'email nel gate legacy (`EmailMigrationGate.tsx`).

Questo risolve anche il problema del link che apriva `localhost:3000` (con l'OTP non serve alcun link).

## Prerequisito (Supabase Dashboard, 1 volta)
Supabase manda codice OTP (invece del link) se il template email contiene `{{ .Token }}`.
Modificare in **Authentication → Email Templates**:
- **Confirm sign up**: includere `{{ .Token }}` (es. `Il tuo codice di conferma: {{ .Token }}`), rimuovendo `{{ .ConfirmationURL }}`.
- **Change email address**: includere `{{ .Token }}`.
- **Reset password**: includere `{{ .Token }}` (il reset diventa OTP, vedi punto 4).
> Alternativa: configurare `mailer.templates.*` in `supabase/config.toml` e fare `supabase db push`. La via dashboard è più semplice.

## Modifiche al codice

### 1. Nuova rotta `/auth/verify` — `src/routes/auth.verify.tsx`
Schermata di inserimento codice per la conferma della registrazione.
- `createFileRoute("/auth/verify")` con `validateSearch` per leggere `{ email: string }` (persiste su refresh).
- `beforeLoad`: se `supabase.auth.getUser()` ha utente → redirect `"/"`.
- UI: titolo "Inserisci il codice", `InputOTP` (maxLength 6, da `@/components/ui/input-otp`) per il codice, bottone "Verifica".
- `onSubmit`: `supabase.auth.verifyOtp({ email, token: code, type: "signup" })`.
  - Success → `navigate({ to: "/" })`.
  - Error → toast ("Codice non valido o scaduto").
- "Reinvia codice": `supabase.auth.resend({ type: "signup", email })`.
- Se `email` manca nello search (refresh senza stato): messaggio "ricomincia dalla registrazione" + link a `/auth`.

### 2. `src/routes/auth.tsx` — EmailForm (signup)
- Nel ramo `signUp`, se `!data.user?.email_confirmed_at`:
  - Non fare più `signOut` né toast "Controlla la tua email".
  - `navigate({ to: "/auth/verify", search: { email: values.email } })`.
  - Toast: "Codice di conferma inviato alla tua email."
- (Il ramo login resta invariato.)

### 3. `src/components/EmailMigrationGate.tsx` — gate legacy
- Dopo `updateUser({ email: value, options: { emailRedirectTo: window.location.origin } })`:
  - Invece dello stato "Controlla la tua email" (link), passare a uno stato **code-entry**:
    - `InputOTP` (maxLength 6) per il codice + bottone "Conferma".
    - `onSubmit`: `supabase.auth.verifyOtp({ email: value, token: code, type: "email_change" })`.
      - Success → il cambio email è confermato → `navigate({ to: "/" })` (il gate si sblocca perché `user.email` non è più `@gymbro.local`).
      - Error → toast ("Codice non valido o scaduto").
    - "Reinvia codice": `supabase.auth.resend({ type: "email_change", email: value })`.
  - Rimuovere il bottone "Ho già confermato? Ricarica" (non serve più con OTP).
- Tenere `useEffect` su `onAuthStateChange` (`USER_UPDATED`) come sicurezza aggiuntiva.
- Mantenere `emailRedirectTo` in `updateUser` (innocuo per OTP, utile se in futuro si torna ai link).

### 4. `src/routes/auth.reset.tsx` — reset password a OTP (riscrittura)
Flusso in 2 step, niente più link/URL hash.
- **Step 1 (email)**: al submit chiama `supabase.auth.resetPasswordForEmail(email)` (invia il codice OTP al nuovo template "Reset password"). Poi passa a step 2.
- **Step 2 (codice + nuova password)**:
  - `InputOTP` (maxLength 6) per il codice.
  - Campi "Nuova password" + "Conferma".
  - Al submit: `supabase.auth.verifyOtp({ email, token: code, type: "recovery" })`.
    - Success → `supabase.auth.updateUser({ password })` → `signOut()` → `navigate({ to: "/auth" })` con toast "Password aggiornata".
    - Error → toast ("Codice non valido o scaduto").
  - "Reinvia codice": `supabase.auth.resend({ type: "recovery", email })`.
- Rimuovere la logica `getSession()` / `type=recovery` dall'hash (non serve più).
- `beforeLoad`: se già autenticato si può comunque permettere il reset, ma per sicurezza se c'è sessione valida si può proseguire comunque (il recovery OTP crea la propria sessione).

## Note / verifica
- `npm run lint`, `npm run typecheck` (tsc) e `npm run build` devono passare.
- Test manuale:
  - **Signup**: registrarsi con email → arriva codice a 6 cifre → `/auth/verify` → inserire codice → sessione attiva → home.
  - **Legacy**: login con username → gate → inserire email reale → arriva codice → inserirlo nel gate → email confermata → app sbloccata; il reset password ora funziona con la nuova email.
  - **Reset**: "Password dimenticata" → email → arriva codice → schermata codice + nuova password → `verifyOtp({ type: "recovery" })` → `updateUser({ password })`.
- `verifyOtp` type: `signup` per conferma registrazione, `email_change` per il cambio email, `recovery` per il reset (tutti richiedono `email` = indirizzo che ha ricevuto il codice).
- Nessun link di conferma → il problema `localhost:3000` sparisce ovunque.

## File toccati
- NUOVO: `src/routes/auth.verify.tsx`
- `src/routes/auth.tsx` (signup + forgot)
- `src/routes/auth.reset.tsx` (riscritto in flusso OTP)
- `src/components/EmailMigrationGate.tsx`
- (Dashboard) template "Confirm sign up", "Change email address", "Reset password"
