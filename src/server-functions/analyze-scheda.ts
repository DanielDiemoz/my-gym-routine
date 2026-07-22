import { createServerFn } from "@tanstack/react-start";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type ExtractedExercise = {
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string | null;
};

export type AnalyzeSchedaResult = {
  plan_name: string;
  exercises: ExtractedExercise[];
};

const JSON_SCHEMA = `{
  "plan_name": "Nome della scheda se visibile, altrimenti 'Scheda importata'",
  "exercises": [
    {
      "name": "Nome dell'esercizio in italiano",
      "muscle_group": "Petto",
      "sets": 3,
      "reps": 10,
      "weight": 0,
      "notes": null
    }
  ]
}`;

const RULES = `Regole:
- Il campo "notes" puo' essere null se non ci sono note
- Se il peso non e' indicato, usa 0
- Se le serie o ripetizioni non sono chiare, usa 3x10 come default
- Converti i nomi in italiano se scritti in inglese (es. Bench Press -> Panca piana)
- muscle_group DEVE essere uno tra: Petto, Schiena, Gambe, Spalle, Braccia, Core, Glutei, Altro
- Se una riga contiene varianti (es. "panca piana / inclinata"), crea esercizi separati
- Ignora elementi non esercizi (intestazioni, date, firme, logo)
- Ignora il numero della serie se c'e' gia' un numero accanto (es. "1. Panca piana" -> solo "Panca piana")`;

const IMAGE_PROMPT = `Sei un assistente specializzato nell'analisi di schede di allenamento per palestra.

Analizza l'immagine fornita e estrai tutti gli esercizi presenti nella scheda.

Se l'immagine NON contiene una scheda di allenamento (es. e' un selfie, un paesaggio, un oggetto non pertinente), restituisci:
{ "plan_name": "", "exercises": [] }

Restituisci un JSON valido con questa struttura esatta:
${JSON_SCHEMA}

${RULES}`;

const TEXT_PROMPT = `Sei un personal trainer esperto. L'utente ti descrive una scheda di allenamento in testo libero (puo' essere un elenco, una descrizione, copia-incollato da un app, ecc.).

Analizza il testo e crea una scheda di allenamento strutturata.

Se il testo non descrive una scheda di allenamento (es. e' una frase random, una domanda, ecc.), restituisci:
{ "plan_name": "", "exercises": [] }

Restituisci un JSON valido con questa struttura esatta:
${JSON_SCHEMA}

${RULES}

- Se l'utente fornisce solo nomi degli esercizi senza dettagli, usa valori di default ragionevoli (3x10, peso 0)
- Se l'utente descrive un obiettivo (es. "massa per le gambe"), crea una scheda appropriata
- Puoi aggiungere esercizi complementari se la scheda sembra incompleta`;

const VALID_MUSCLES = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia", "Core", "Glutei", "Altro"];

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function humanizeGeminiError(status: number, body: string): string {
  if (status === 429) {
    return "Troppe richieste. Attendi qualche secondo e riprova.";
  }
  if (status === 403) {
    return "Chiave API non valida o disabilitata. Verifica la chiave su Google AI Studio.";
  }
  if (status === 400) {
    if (body.includes("invalid image")) {
      return "Immagine non valida. Prova con un'altra foto in formato JPEG o PNG.";
    }
    if (body.includes("payload")) {
      return "L'immagine e' troppo grande. Prova con una foto di qualita' inferiore.";
    }
    return "Richiesta non valida. Riprova con un'altra foto.";
  }
  if (status === 404) {
    return "Modello AI non disponibile. Riprova tra qualche minuto.";
  }
  if (status >= 500) {
    return "Errore del servizio AI. Riprova tra qualche minuto.";
  }
  return `Errore sconosciuto dall'API (${status}). Riprova.`;
}

export const analyzeScheda = createServerFn({ method: "POST" })
  .validator(
    (
      data:
        | { mode: "image"; imageBase64: string; mimeType: string }
        | { mode: "text"; text: string },
    ) => data,
  )
  .handler(async ({ data }) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error("Chiave API AI non configurata. Contatta l'amministratore.");
    }

    if (data.mode === "image") {
      if (!ALLOWED_MIME.has(data.mimeType)) {
        throw new Error("Formato immagine non supportato. Usa JPEG, PNG o WebP.");
      }
      if (data.imageBase64.length > 20_000_000) {
        throw new Error(
          "L'immagine e' troppo grande (max ~15MB). Prova a scattare una foto con risoluzione inferiore.",
        );
      }
    }

    if (data.mode === "text" && !data.text.trim()) {
      throw new Error("Inserisci una descrizione della scheda di allenamento.");
    }

    const parts: Array<Record<string, unknown>> = [];

    if (data.mode === "image") {
      parts.push({ text: IMAGE_PROMPT });
      parts.push({
        inline_data: { mime_type: data.mimeType, data: data.imageBase64 },
      });
    } else {
      parts.push({
        text: `${TEXT_PROMPT}\n\nDescrizione dell'utente:\n"${data.text}"`,
      });
    }

    let response: Response;
    try {
      response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (err) {
      console.error("[analyze-scheda] Network error:", err);
      throw new Error(
        "Impossibile contattare il servizio AI. Controlla la connessione a internet e riprova.",
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-scheda] Gemini API error:", response.status, errorText);
      throw new Error(humanizeGeminiError(response.status, errorText));
    }

    let json: Record<string, unknown>;
    try {
      json = await response.json();
    } catch {
      console.error("[analyze-scheda] Failed to parse response as JSON");
      throw new Error("Risposta non valida dal servizio AI. Riprova.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = json.candidates as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedback = json.promptFeedback as any;
    const text = candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const blockReason = feedback?.blockReason;
      if (blockReason === "SAFETY") {
        throw new Error(
          "L'immagine e' stata bloccata dai filtri di sicurezza. Prova con un'altra foto.",
        );
      }
      console.error("[analyze-scheda] Empty response:", JSON.stringify(json).slice(0, 500));
      throw new Error(
        "Il servizio AI non ha prodotto una risposta valida. Riprova con un'altra foto o descrizione.",
      );
    }

    return parseAiResponse(text);
  });

function parseAiResponse(content: string): AnalyzeSchedaResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[analyze-scheda] Invalid JSON from AI:", content.slice(0, 300));
    throw new Error("Il servizio AI ha restituito un formato non valido. Riprova.");
  }

  const exercises: ExtractedExercise[] = (
    Array.isArray(parsed.exercises) ? parsed.exercises : []
  ).map((ex: Record<string, unknown>) => ({
    name: String(ex.name ?? "Esercizio sconosciuto"),
    muscle_group: VALID_MUSCLES.includes(String(ex.muscle_group))
      ? String(ex.muscle_group)
      : "Altro",
    sets: Math.max(1, Number(ex.sets) || 3),
    reps: Math.max(1, Number(ex.reps) || 10),
    weight: Math.max(0, Number(ex.weight) || 0),
    notes: ex.notes ? String(ex.notes) : null,
  }));

  if (exercises.length === 0) {
    throw new Error(
      "Nessun esercizio trovato. Assicurati che la foto mostri una scheda di allenamento o descrivi gli esercizi nel testo.",
    );
  }

  return {
    plan_name: String(parsed.plan_name ?? "Scheda importata"),
    exercises,
  };
}
