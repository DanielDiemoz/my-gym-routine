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

Restituisci un JSON valido con questa struttura esatta:
${JSON_SCHEMA}

${RULES}`;

const TEXT_PROMPT = `Sei un personal trainer esperto. L'utente ti descrive una scheda di allenamento in testo libero (puo' essere un elenco, una descrizione, copia-incollato da un app, ecc.).

Analizza il testo e crea una scheda di allenamento strutturata.

Restituisci un JSON valido con questa struttura esatta:
${JSON_SCHEMA}

${RULES}

- Se l'utente fornisce solo nomi degli esercizi senza dettagli, usa valori di default ragionevoli (3x10, peso 0)
- Se l'utente descrive un obiettivo (es. "massa per le gambe"), crea una scheda appropriata
- Puoi aggiungere esercizi complementari se la scheda sembra incompleta`;

const VALID_MUSCLES = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia", "Core", "Glutei", "Altro"];

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
      throw new Error("GEMINI_API_KEY non configurata. Aggiungila nel file .env");
    }

    const parts: Array<Record<string, unknown>> = [];

    if (data.mode === "image") {
      parts.push({ text: IMAGE_PROMPT });
      parts.push({
        inline_data: { mime_type: data.mimeType, data: data.imageBase64 },
      });
    } else {
      parts.push({ text: `${TEXT_PROMPT}\n\nDescrizione dell'utente:\n"${data.text}"` });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-scheda] Gemini API error:", response.status, errorText);
      throw new Error(`Errore dall'API Gemini: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[analyze-scheda] Empty response:", JSON.stringify(json).slice(0, 500));
      throw new Error("Risposta vuota dall'API Gemini");
    }

    return parseAiResponse(text);
  });

function parseAiResponse(content: string): AnalyzeSchedaResult {
  const parsed = JSON.parse(content);

  const exercises: ExtractedExercise[] = (parsed.exercises ?? []).map(
    (ex: Record<string, unknown>) => ({
      name: String(ex.name ?? "Esercizio sconosciuto"),
      muscle_group: VALID_MUSCLES.includes(String(ex.muscle_group))
        ? String(ex.muscle_group)
        : "Altro",
      sets: Math.max(1, Number(ex.sets) || 3),
      reps: Math.max(1, Number(ex.reps) || 10),
      weight: Math.max(0, Number(ex.weight) || 0),
      notes: ex.notes ? String(ex.notes) : null,
    }),
  );

  return {
    plan_name: String(parsed.plan_name ?? "Scheda importata"),
    exercises,
  };
}
