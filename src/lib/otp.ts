// Lunghezza del codice OTP inviato via email da Supabase (GOTRUE_MAILER_OTP_LENGTH).
// Deve restare allineata alla configurazione del progetto Supabase: se il backend
// invia codici di 8 cifre, la UI deve accettarne 8. Usare questa costante come
// unica fonte di verità per maxLength, validazione e numero di slot.
export const OTP_LENGTH = 8;
