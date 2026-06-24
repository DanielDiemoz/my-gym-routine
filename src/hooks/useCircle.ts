/**
 * useCircle.ts
 * Hook centralizzato per la feature "Cerchie".
 *
 * Espone:
 *   - myCircles     : cerchie di cui l'utente è membro (o owner)
 *   - isCoach       : true se profiles.role === 'coach'
 *   - joinCircle    : entra in una cerchia tramite codice
 *   - createCircle  : crea nuova cerchia (solo coach)
 *   - leaveCircle   : esci da una cerchia
 *   - deleteCircle  : elimina una cerchia (solo owner)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Tipi locali ───────────────────────────────────────────────────────────────
// Usiamo tipi espliciti perché il types.ts generato da Lovable non conosce
// ancora circles/circle_members finché non si rigenera dopo la migration.

export interface Circle {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  created_at: string;
  /** Numero di membri (aggiunto client-side dopo fetch separata o join). */
  member_count?: number;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  joined_at: string;
}

// ── Shortcut ─────────────────────────────────────────────────────────────────
// `as unknown as { from: ... }` perché il types.ts non conosce ancora le nuove
// tabelle e Supabase inferisce SelectQueryError sugli overrides. Mantenere
// il cast qui evita di inquinare ogni chiamata.
const fromCircles = () =>
  (supabase as unknown as { from: (t: string) => any }).from("circles");
const fromCircleMembers = () =>
  (supabase as unknown as { from: (t: string) => any }).from("circle_members");

// ── Query keys ────────────────────────────────────────────────────────────────
const CIRCLES_KEY = (userId: string) => ["circles", userId] as const;
const ROLE_KEY    = (userId: string) => ["profile-role", userId] as const;

// ── Hook principale ───────────────────────────────────────────────────────────
export function useCircle(userId: string) {
  const qc = useQueryClient();

  // ── Query: cerchie di cui l'utente è membro ────────────────────────────────
  const circlesQ = useQuery({
    queryKey: CIRCLES_KEY(userId),
    queryFn: async (): Promise<Circle[]> => {
      // 1. Prendo gli id delle cerchie dove sono membro
      const { data: memberRows, error: memberErr } = await fromCircleMembers()
        .select("circle_id")
        .eq("user_id", userId);
      if (memberErr) throw memberErr;
      const ids = ((memberRows ?? []) as unknown as { circle_id: string }[]).map(
        (r) => r.circle_id,
      );
      if (ids.length === 0) return [];

      // 2. Carico i dettagli delle cerchie
      const { data: circleRows, error: circleErr } = await fromCircles()
        .select("id, name, code, owner_id, created_at")
        .in("id", ids);
      if (circleErr) throw circleErr;

      // 3. Per ogni cerchia, conto i membri (N+1 accettabile: pochi cerchie).
      const withCount = await Promise.all(
        ((circleRows ?? []) as unknown as Circle[]).map(async (circle) => {
          const { count } = await fromCircleMembers()
            .select("id", { count: "exact", head: true } as any)
            .eq("circle_id", circle.id);
          return { ...circle, member_count: count ?? 0 };
        }),
      );

      return withCount;
    },
    staleTime: 1000 * 30, // 30 secondi
  });

  // ── Query: ruolo utente ────────────────────────────────────────────────────
  // `role` non è ancora nel Database type finché non si rigenera types.ts.
  const roleQ = useQuery({
    queryKey: ROLE_KEY(userId),
    queryFn: async (): Promise<"user" | "coach"> => {
      const { data } = await supabase
        .from("profiles")
        // Selezioniamo direttamente `role` per non trasferire tutti gli altri
        // campi del profilo via RLS quando ci serve solo il flag coach.
        .select("role" as any)
        .eq("id", userId)
        .maybeSingle();
      const raw = (data as unknown as { role?: string } | null)?.role;
      return raw === "coach" ? "coach" : "user";
    },
    staleTime: 1000 * 60 * 5,
  });

  const invalidateCircles = () =>
    qc.invalidateQueries({ queryKey: CIRCLES_KEY(userId) });

  // ── Mutation: entra in una cerchia ────────────────────────────────────────
  const joinMut = useMutation({
    mutationFn: async (code: string) => {
      // 1. Cerca la cerchia per codice
      const { data: circle, error: circleErr } = await fromCircles()
        .select("id")
        .eq("code", code.toUpperCase().trim())
        .maybeSingle();
      if (circleErr) throw circleErr;
      if (!circle) throw new Error("Codice non trovato. Controlla e riprova.");

      const circleId = (circle as unknown as { id: string }).id;

      // 2. Controlla se è già membro (cache client; il vincolo unique salva
      //    da un race-condition sulla cache stale).
      const existing = circlesQ.data?.find((c) => c.id === circleId);
      if (existing) throw new Error("Sei già membro di questa cerchia.");

      // 3. Inserisci il membro.
      const { error: insertErr } = await fromCircleMembers()
        .insert({ circle_id: circleId, user_id: userId });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      toast.success("Sei entrato nella cerchia!");
      invalidateCircles();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore durante l'accesso");
    },
  });

  // ── Mutation: crea una cerchia (solo coach) ───────────────────────────────
  const createMut = useMutation({
    mutationFn: async (name: string): Promise<Circle> => {
      // 1. Genera il codice via RPC (MAX_RETRIES per evitare collisione unique).
      const MAX_RETRIES = 3;
      let code: string | null = null;
      for (let i = 0; i < MAX_RETRIES; i++) {
        // `as any` sul client: la firma `supabase.rpc` richiede una chiave
        // letterale di `Database['public']['Functions']` (qui è `never`,
        // perché il types.ts non è ancora stato rigenerato).
        const { data: codeData, error: codeErr } = await (supabase as any).rpc(
          "generate_circle_code",
        );
        if (codeErr) throw codeErr;
        code = codeData as string;
        const { data: existing } = await fromCircles()
          .select("id")
          .eq("code", code)
          .maybeSingle();
        if (!existing) break;
        code = null;
      }
      if (!code) throw new Error("Impossibile generare un codice univoco, riprova.");

      // 2. Crea la cerchia
      const { data: newCircle, error: circleErr } = await fromCircles()
        .insert({ name: name.trim(), code, owner_id: userId })
        .select("id, name, code, owner_id, created_at")
        .single();
      if (circleErr) throw circleErr;
      if (!newCircle) throw new Error("Creazione cerchia fallita");
      const created = newCircle as unknown as Circle;

      // 3. Aggiunge automaticamente il coach come primo membro.
      //    Se fallisce qui, abbiamo un "cerchio orfano" → rollback.
      const { error: memberErr } = await fromCircleMembers()
        .insert({ circle_id: created.id, user_id: userId });
      if (memberErr) {
        await fromCircles().delete().eq("id", created.id);
        throw memberErr;
      }

      return created;
    },
    onSuccess: () => {
      invalidateCircles();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore durante la creazione");
    },
  });

  // ── Mutation: esci dalla cerchia ─────────────────────────────────────────
  const leaveMut = useMutation({
    mutationFn: async (circleId: string) => {
      const { error } = await fromCircleMembers()
        .delete()
        .eq("circle_id", circleId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hai lasciato la cerchia.");
      invalidateCircles();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore");
    },
  });

  // ── Mutation: elimina la cerchia (solo owner) ─────────────────────────────
  const deleteMut = useMutation({
    mutationFn: async (circleId: string) => {
      const { error } = await fromCircles().delete().eq("id", circleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cerchia eliminata.");
      invalidateCircles();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    },
  });

  return {
    /** Cerchie di cui l'utente è membro o owner */
    myCircles: circlesQ.data ?? [],
    isLoadingCircles: circlesQ.isLoading,
    /** true se l'utente ha ruolo coach */
    isCoach: roleQ.data === "coach",
    isLoadingRole: roleQ.isLoading,
    /** Entra in una cerchia tramite codice di 6 caratteri */
    joinCircle: (code: string) => joinMut.mutateAsync(code),
    isJoining: joinMut.isPending,
    /** Crea una nuova cerchia (solo coach). Restituisce la cerchia creata. */
    createCircle: (name: string) => createMut.mutateAsync(name),
    isCreating: createMut.isPending,
    /** Esci da una cerchia */
    leaveCircle: (circleId: string) => leaveMut.mutateAsync(circleId),
    isLeaving: leaveMut.isPending,
    /** Elimina una cerchia (solo owner) */
    deleteCircle: (circleId: string) => deleteMut.mutateAsync(circleId),
    isDeleting: deleteMut.isPending,
  };
}
