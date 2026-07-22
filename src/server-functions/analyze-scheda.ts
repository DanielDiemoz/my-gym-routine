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

const SYSTEM_PROMPT = `Sei un assistente specializzato nell'analisi di schede di allenamento per palestra.

Analizza l'immagine fornita e estrai tutti gli esercizi presenti nella scheda.

Restituisci un JSON valido con questa struttura esatta:
{
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
}

Regole:
- Il campo "notes" puo' essere null se non ci sono note
- Se il peso non e' indicato, usa 0
- Se le serie o ripetizioni non sono chiare, usa 3x10 come default
- Converti i nomi in italiano se scritti in inglese (es. Bench Press -> Panca piana)
- muscle_group DEVE essere uno tra: Petto, Schiena, Gambe, Spalle, Braccia, Core, Glutei, Altro
- Se una riga contiene varianti (es. "panca piana / inclinata"), crea esercizi separati
- Ignora elementi non esercizi (intestazioni, date, firme, logo)
- Ignora il numero della serie se c'e' gia' un numero accanto (es. "1. Panca piana" -> solo "Panca piana")`;

const VALID_MUSCLES = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia", "Core", "Glutei", "Altro"];

export const analyzeScheda = createServerFn({ method: "POST" })
  .validator((data: { imageBase64: string; mimeType: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY non configurata. Aggiungila nel file .env");
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: data.mimeType,
                  data: data.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini API]", response.status, errorText);
      throw new Error(`Errore dall'API Gemini: ${response.status}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
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
