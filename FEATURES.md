# GymBro — Mappa completa delle funzionalità

> Documento di riferimento per contenuti (blog, social, materiale marketing).
> Ogni funzionalità è descritta in termini di **cosa fa**, **quale problema risolve** e con un **angolo narrativo** già pronto da usare.

---

## 1. Panoramica generale

**GymBro** è una web app (installabile come PWA su iPhone, Android, Windows e distribuita anche come APK Android) pensata per chi si allena in palestra e vuole uno strumento **essenziale, veloce e mobile-first** per creare le proprie schede, registrare gli allenamenti serie per serie e vedere i progressi nel tempo. Si rivolge ad appassionati di palestra (dai principianti agli intermedi) che trovano le app blasonate troppo complicate, cariche di funzioni inutili o dietro paywall. Il valore centrale è duplice: da un lato **la registrazione dell'allenamento in tempo reale** (con timer di recupero, storico dell'esercizio "le volte scorse" e ripristino automatico della sessione se chiudi l'app), dall'altro **la dimensione sociale delle "Cerchie"**: gruppi privati con codice invito dove i membri vedono i volumi settimanali, gli streak e le classifiche degli altri, chattano e si tengono a vicenda responsabili. In pratica GymBro unisce il "diario di allenamento" al "gruppo di allenamento", eliminando l'attrito tipico delle app di fitness.

Stack tecnico (solo per contesto): TanStack Start + React 19, Supabase (auth, database Postgres con Row Level Security, RPC), Tailwind. Tutto è in italiano e ottimizzato per l'uso in palestra con una mano sola.

---

## 2. Funzionalità core (principali e distintive)

### 2.1 Creazione ed editing di schede di allenamento

**Cosa fa:** L'utente crea schede con nome personalizzato (es. "Push A", "Full Body Lunedì") e vi aggiunge esercizi indicando gruppo muscolare, serie, ripetizioni target, peso di partenza e note. Gli esercizi si riordinano con **drag & drop** o con frecce su/giù, si modificano e si eliminano. Ogni gruppo muscolare ha un colore-tag dedicato per riconoscere a colpo d'occhio la struttura della scheda.

**Problema che risolve:** Basta appunti sul telefono o fogli di carta in palestra. La scheda è sempre a portata di mano, ordinabile e modificabile in secondi.

**Dettagli rilevanti:** L'ordinamento è persistito nel database (colonna `position`), quindi resta identico su ogni dispositivo. Ogni scheda mostra il conteggio esercizi.

**Angolo narrativo:** Video demo "Crea la tua prima scheda in 30 secondi" — il drag & drop degli esercizi è visivamente soddisfacente e perfetto per un reel.

---

### 2.2 Libreria esercizi con autocompletamento intelligente

**Cosa fa:** Mentre digiti il nome di un esercizio, GymBro suggerisce risultati da una libreria di ~85 esercizi (Squat, Panca piana, Stacco, Lat machine, ecc.). Selezionando un suggerimento, il **gruppo muscolare si compila automaticamente**. Puoi comunque scrivere un nome custom senza vincoli.

**Problema che risolve:** Elimina la frizione della compilazione manuale e gli errori di categorizzazione: non devi ricordarti "a quale muscolo appartiene questo esercizio".

**Dettagli rilevanti:** Ricerca case-insensitive con debounce (nessuna query a ogni tasto premuto), indice univoco per evitare duplicati. La libreria copre gambe, petto, schiena, spalle, braccia, core e glutei.

**Angolo narrativo:** Buon hook social — "L'app compila il gruppo muscolare al posto tuo". Mostra la velocità dell'autocomplete.

---

### 2.3 Modalità allenamento in tempo reale ("Allena")

**Cosa fa:** È il cuore dell'app. Avvii una scheda ed entri in una schermata dedicata, un esercizio alla volta, con barra di avanzamento (es. "3 / 8"). Per ogni serie inserisci ripetizioni e peso con **stepper +/−** (peso a step di 2,5 kg, comodo per i dischi reali) e segni la serie come completata con una spunta. Puoi aggiungere serie extra, rimuovere serie, e navigare avanti/indietro tra gli esercizi.

**Problema che risolve:** Registrare l'allenamento mentre lo fai, senza perdere il segno e con un'interfaccia grande, tap-friendly, usabile con le mani sudate tra una serie e l'altra.

**Dettagli rilevanti:** Al termine vengono salvate **solo le serie effettivamente completate**, e viene calcolato automaticamente il **volume totale** (ripetizioni × peso). L'utente può "Terminare" in anticipo o completare fino all'ultimo esercizio.

**Angolo narrativo:** Video demo principale dell'app: "Come registro un allenamento con GymBro" — mostra lo stepper del peso e la spunta verde di serie completata.

---

### 2.4 Ripristino automatico della sessione interrotta (crash-proof)

**Cosa fa:** Se chiudi la scheda, cambi app, ti squilla il telefono o il browser si chiude durante l'allenamento, GymBro **non perde nulla**. Al rientro rileva la "sessione orfana" e ti chiede: *"Hai una sessione interrotta iniziata il [data]. Vuoi riprenderla o iniziarne una nuova?"*.

**Problema che risolve:** La paura numero uno di chi traccia gli allenamenti: perdere i dati a metà workout. Qui è praticamente impossibile.

**Dettagli rilevanti:** Lo stato viene salvato con **triplo livello di ridondanza** — in memoria, in `localStorage` (anche su chiusura improvvisa via `beforeunload`/`pagehide`) e sul database (colonna `workout_state` JSONB con salvataggio in debounce). Questo permette anche una forma di ripresa cross-device.

**Angolo narrativo:** Ottimo per un post "problema/soluzione": *"Ti è mai crollata l'app a metà allenamento perdendo tutte le serie? Con GymBro non succede."* Angolo affidabilità/ingegneria.

---

### 2.5 Timer di recupero con vibrazione, suono e notifiche

**Cosa fa:** Dentro l'allenamento c'è un timer di recupero con preset rapidi (60 / 90 / 120 / 180 secondi). Al termine **vibra**, riproduce un **suono** (disattivabile) e mostra una **notifica push** anche se hai messo l'app in background.

**Problema che risolve:** Il classico "quanti secondi di pausa ho fatto?". Standardizza i tempi di recupero senza dover guardare l'orologio, e ti avvisa anche se nel frattempo stai chattando o guardando i social.

**Dettagli rilevanti:** Usa `navigator.vibrate`, l'API Notification tramite service worker e un file audio. La preferenza audio on/off è ricordata tra le sessioni.

**Angolo narrativo:** Reel "Il recupero perfetto" — inquadra il timer che parte, la vibrazione al termine, e riparti. Sottolinea la notifica in background come chicca.

---

### 2.6 Storico dell'esercizio "Le volte scorse"

**Cosa fa:** Durante l'allenamento, sotto ogni esercizio, GymBro mostra **come hai fatto le ultime volte** quello stesso esercizio (ripetizioni × peso per ogni serie, con "2 giorni fa", "una settimana fa"...). Espandibile per vedere ancora più indietro.

**Problema che risolve:** Il progressive overload richiede di sapere cosa hai fatto la volta prima. Qui ce l'hai davanti mentre decidi il peso della serie successiva, senza aprire altri menu.

**Dettagli rilevanti:** Aggrega i log delle sessioni passate per nome esercizio, indipendentemente dalla scheda.

**Angolo narrativo:** Post educativo sul **sovraccarico progressivo**: "Come sapere se stai davvero migliorando" — GymBro te lo mostra automaticamente.

---

### 2.7 Cerchie (gruppi social privati con codice invito)

**Cosa fa:** Crei una "Cerchia" (es. i tuoi amici di palestra, il tuo team) e ottieni un **codice invito di 6 caratteri**. Chi ha il codice entra. Puoi far parte di più cerchie contemporaneamente. Dentro la cerchia vedi la lista dei membri **ordinata per volume settimanale** (una vera classifica), con avatar, anello di progresso rispetto all'obiettivo, e statistiche aggregate del gruppo (kg totali della settimana, allenamenti fatti vs obiettivo).

**Problema che risolve:** L'allenamento in solitaria uccide la costanza. Le Cerchie portano **accountability sociale** e sana competizione: vedere che il tuo amico ha già fatto 3 allenamenti questa settimana ti spinge in palestra.

**Dettagli rilevanti:** L'owner della cerchia può rimuovere membri, assegnare nickname personalizzati ai membri, ed eliminare la cerchia. Tutte le operazioni sensibili passano da funzioni server-side sicure (RPC) con Row Level Security, quindi vedi solo le cerchie di cui fai parte. Tapping su un membro apri lo storico completo dei suoi allenamenti.

**Angolo narrativo:** Feature "wow" per il lancio. Thread/carosello: *"La palestra è meglio con gli amici. Crea una Cerchia, condividi un codice, e sfidatevi ogni settimana."* Mostra la classifica per volume.

---

### 2.8 Chat di gruppo nelle Cerchie

**Cosa fa:** Ogni cerchia ha una **chat integrata**. Messaggi in tempo quasi-reale (polling), badge con **conteggio messaggi non letti** sia sulla card della cerchia sia sull'icona chat, con marcatura automatica come "letto" all'apertura.

**Problema che risolve:** Niente serve un gruppo WhatsApp separato per organizzarsi. Motivazione, sfide e organizzazione stanno dentro l'app, accanto ai dati di allenamento.

**Dettagli rilevanti:** I messaggi mostrano nome/iniziali dell'autore; solo i membri della cerchia possono leggere e scrivere (garantito lato database).

**Angolo narrativo:** "Tutto in un posto solo": mostra il badge dei non letti che appare quando un amico scrive "Chi c'è oggi in palestra?".

---

### 2.9 Dashboard settimanale con streak e obiettivi

**Cosa fa:** La home ti accoglie con il tuo nome, il conteggio degli allenamenti **di questa settimana** visualizzato come griglia dei 7 giorni (giorni allenati evidenziati), il gruppo muscolare più allenato, e il volume totale. C'è una **card Streak** con: streak attuale (giorni consecutivi), record personale, e barra di progresso verso l'**obiettivo settimanale** (impostabile da 1 a 7 allenamenti).

**Problema che risolve:** Dà un feedback immediato e motivante sulla costanza, il fattore numero uno per i risultati. Lo streak trasforma l'abitudine in un gioco.

**Dettagli rilevanti:** Lo streak considera "oggi o ieri" per non spezzarsi ingiustamente; il record personale scansiona fino a 365 giorni. Messaggi contestuali tipo "🏆 Nuovo record!" o "Allena oggi per ricostruire lo streak".

**Angolo narrativo:** Angolo "gamification/abitudini": *"Non rompere la catena."* Screenshot della card streak con record personale. Ottimo per contenuti motivazionali di inizio settimana.

---

### 2.10 Storico allenamenti mensile

**Cosa fa:** Una sezione "Storico" con navigazione mese per mese, che elenca tutti gli allenamenti completati. Ogni allenamento è una card espandibile che mostra **il dettaglio completo**: esercizi, serie, ripetizioni e pesi, più data e volume.

**Problema che risolve:** Il diario di allenamento consultabile: rivedere cosa hai fatto, quando, con quali carichi. Utile per pianificare i cicli e vedere la progressione.

**Dettagli rilevanti:** Raggruppa i log per esercizio all'interno della sessione; contatore allenamenti per mese.

**Angolo narrativo:** "Il tuo diario di allenamento, per sempre" — mostra lo scroll di un mese pieno di allenamenti tracciati.

---

## 3. Funzionalità secondarie / di supporto

### 3.1 Autenticazione con email + verifica OTP
Registrazione con email/password (requisiti password in tempo reale: 6+ caratteri, un numero, un carattere speciale), login, e **verifica dell'account tramite codice OTP** inviato via email. Recupero password dedicato. **Angolo:** onboarding sicuro e senza attriti; buono per un post "quanto è facile iniziare".

### 3.2 Protezione anti-abuso sull'OTP
Il flusso di verifica include **cooldown di 60s** tra invii, massimo 3 reinvii per sessione, e **lockout di 60 secondi dopo 5 codici errati**. **Angolo (tecnico/trust):** sicurezza pensata bene, senza infastidire l'utente onesto.

### 3.3 Onboarding minimale
Al primo accesso ti viene chiesto solo il nome, poi sei subito operativo. Nessun questionario infinito. **Angolo:** "Dall'iscrizione al primo allenamento in meno di un minuto".

### 3.4 Installazione come app (PWA) + APK Android
Bottone di installazione nativo quando disponibile, istruzioni passo-passo per iPhone (Safari → Aggiungi a Home) e Android/Windows (Chrome/Edge), rilevamento se l'app è già installata, e **download diretto dell'APK Android**. Funziona a schermo intero, in modalità portrait, con icona sulla home. **Angolo:** "Installala come un'app vera, senza store" — mostra l'icona che appare sulla home dello smartphone.

### 3.5 Sostituzione esercizio al volo durante l'allenamento
Se un macchinario è occupato, durante la sessione puoi **sostituire l'esercizio corrente** cercando nella libreria (o scrivendone uno custom) senza modificare la scheda originale. **Angolo:** situazione reale in palestra — "Panca occupata? Sostituisci in 2 tap e continua."

### 3.6 Riordino esercizi anche durante la sessione
Non solo in fase di editing: anche mentre ti alleni puoi spostare l'esercizio corrente su/giù nell'ordine. **Angolo:** flessibilità reale ("l'allenamento si adatta a te, non il contrario").

### 3.7 Gestione profilo e collegamento email
Pagina profilo con nome, email, logout, e possibilità di aggiungere/modificare l'email. **Angolo:** controllo dei propri dati.

### 3.8 Continua allenamento / sessione attiva evidenziata
Se hai una sessione in corso, sia la home sia la lista schede mostrano un banner "Allenamento in corso / Continua", così riprendi con un tap da qualsiasi punto. **Angolo:** zero fatica per riprendere.

### 3.9 Conferme di sicurezza sulle azioni distruttive
Eliminare una scheda, un allenamento, una serie, annullare una sessione o rimuovere un membro richiede sempre una conferma. **Angolo:** "Non cancellerai mai nulla per sbaglio".

### 3.10 Gestione errori e stati di caricamento curati
Skeleton di caricamento su tutte le schermate principali, pagina 404, error boundary con "Riprova", messaggi di errore locali (es. storico non caricato → bottone Riprova invece di crash). **Angolo (qualità):** un'app che non ti lascia mai davanti a una schermata bianca.

---

## 4. Funzionalità "nascoste" o meno ovvie

Queste sono chicche che l'utente scopre usando l'app e che fanno un ottimo effetto "sorpresa" nei contenuti.

- **Ripresa cross-device dell'allenamento in corso:** lo stato della sessione è salvato anche sul database (non solo sul telefono). Inizi in palestra, e la sessione può essere ripresa. *Hook: "Il tuo allenamento ti segue ovunque".*
- **Notifica del timer in background:** anche se esci dall'app durante il recupero, ricevi la notifica "Riposo terminato! Prossima serie 💪". Molti non si aspettano che una web app lo faccia.
- **Anello di progresso per ogni membro della cerchia:** l'avatar di ogni compagno ha un ring colorato che si riempie in base a quanti allenamenti ha fatto verso il suo obiettivo. Colpo d'occhio sociale immediato.
- **Nickname per membro (assegnati dall'owner):** l'owner può ribattezzare i membri della cerchia (es. soprannomi da palestra). Dettaglio divertente e community-building.
- **Serie extra e serie personalizzate al volo:** puoi aggiungere serie oltre a quelle previste dalla scheda, o rimuoverne, mentre ti alleni — il tracking si adatta alla realtà.
- **Streak "clemente":** conta oggi o ieri come base, così non perdi lo streak per un'ora di differenza. Piccolo ma psicologicamente importante.
- **Statistiche aggregate della cerchia:** "kg totali sollevati dal gruppo questa settimana" — un numero collettivo che crea senso di squadra.
- **Rilevazione "app già installata":** il profilo riconosce se stai usando GymBro come app installata e te lo conferma.
- **Persistenza a prova di chiusura brutale:** salvataggio agganciato agli eventi `beforeunload`, `pagehide` e `visibilitychange` — copre anche lo swipe-to-close su mobile.
- **Toast e micro-feedback ovunque:** ogni azione (obiettivo impostato, codice copiato, allenamento salvato) dà un feedback immediato. Sensazione di app "viva".

---

## 5. Idee di contenuti (post, thread, video)

1. **Reel demo — "Registra un allenamento in tempo reale"** (core 2.3 + 2.5): mostra stepper del peso, spunta serie completata e timer di recupero che vibra. Il montaggio ritmato tra una serie e l'altra funziona benissimo su Reels/TikTok.

2. **Post problema/soluzione — "Ti è mai crashata l'app a metà workout?"** (core 2.4): racconta la frustrazione universale e mostra il popup "Vuoi riprendere la sessione interrotta?". Angolo affidabilità, alto potenziale di commenti ("a me è successo mille volte").

3. **Carosello — "La palestra è meglio in gruppo"** (core 2.7 + 2.8): spiega le Cerchie con screenshot della classifica per volume e della chat. CTA: "Crea la tua cerchia e sfida i tuoi amici". Ottimo per crescita virale (inviti = nuovi utenti).

4. **Thread motivazionale — "Non rompere la catena"** (core 2.9): educa sul potere degli streak e degli obiettivi settimanali, screenshot della card streak con "🏆 Nuovo record". Perfetto per il lunedì.

5. **Post educativo — "Come sapere se stai davvero progredendo"** (core 2.6): spiega il sovraccarico progressivo e mostra la sezione "Le volte scorse" che ti dà i dati sotto l'esercizio. Valore reale + product placement naturale.

6. **Video how-to — "Installa GymBro come un'app vera (senza App Store)"** (secondaria 3.4): tutorial rapido iPhone e Android, con il momento "e ora hai l'icona sulla home". Abbassa la barriera all'ingresso.

7. **Short — "Panca occupata? Nessun problema"** (secondaria 3.5): situazione da palestra reale, sostituzione esercizio al volo in 2 tap. Relatable e concreto.

8. **Post "dietro le quinte / trust"** (secondaria 3.2 + 3.9 + 3.10): per un pubblico più tech o per rassicurare — sicurezza OTP, conferme sulle azioni, niente perdita dati. Angolo "fatta bene, con cura".

9. **Reel chicca — "Anche in background ti avvisa"** (nascosta, timer + notifiche): mostra di uscire dall'app durante il recupero e ricevere la notifica "Riposo terminato!". Effetto "non pensavo lo facesse".

10. **UGC / testimonianza — "La mia settimana su GymBro"** (dashboard + storico): un utente mostra la home con la griglia dei giorni allenati e scorre lo storico mensile pieno. Prova sociale + panoramica prodotto in un colpo solo.

---

*Documento generato dall'analisi della codebase (frontend TanStack/React, backend Supabase con RLS e RPC, schema dati e migrazioni). Le descrizioni riflettono il comportamento reale del codice, non solo le etichette delle route.*
