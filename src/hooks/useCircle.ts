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
  // Usa la RPC SECURITY DEFINER `get_my_circles` che:
  //   - aggrega tutto server-side in UN solo round-trip (no N+1);
  //   - bypassa completamente RLS (giriamo come postgres, BYPASSRLS);
  //   - ritorna cerchie + member_count già pronto all'uso.
  // Nessuna policy RLS viene valutata, quindi nessun rischio di
  // recursion o di righe filtrate silenziosamente.
  const circlesQ = useQuery({
    queryKey: CIRCLES_KEY(userId),
    queryFn: async (): Promise<Circle[]> => {
      const { data, error } = await (supabase as any).rpc("get_my_circles");
      if (error) {
        throw new Error(error.message || "Errore nel caricamento delle cerchie");
      }
      return ((data ?? []) as unknown as Circle[]);
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
  // Usa la RPC SECURITY DEFINER `join_circle_by_code` perché la policy
  // `circles_select` non permette a un NON-membro di SELECT una cerchia.
  // La RPC gira come owner: vede tutte le cerchie per codice e poi inserisce
  // il membro (idempotente via ON CONFLICT DO NOTHING).
  const joinMut = useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data: circleId, error } = await (supabase as any).rpc(
        "join_circle_by_code",
        { invite_code: code },
      );
      if (error) {
        // Il messaggio Postgres (`'Codice non trovato...'`) viene propagato
        // tale e quale → lo mostriamo direttamente come toast.
        throw new Error(error.message || "Errore durante l'accesso");
      }
      if (!circleId) throw new Error("Risposta RPC non valida.");
      return circleId as string;
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
  // Usa la RPC SECURITY DEFINER `create_circle_as_coach` che esegue tutto
  // atomicamente lato DB:
  //   - valida il ruolo coach (bypassando l'overhead della subquery in RLS);
  //   - genera un codice univoco (controllo collisioni NON soggetto a RLS,
  //     quindi non può "perdere" cerchie altrui come faceva la query client);
  //   - INSERT cerchia + INSERT membro con rollback automatico in caso di errore.
  // Il client deve solo passare il nome: niente più corse RLS o rollback manuali.
  const createMut = useMutation({
    mutationFn: async (name: string): Promise<Circle> => {
      const { data: newCircle, error } = await (supabase as any).rpc(
        "create_circle_as_coach",
        { circle_name: name },
      );
      if (error) {
        throw new Error(error.message || "Errore durante la creazione");
      }
      if (!newCircle) throw new Error("Creazione cerchia fallita");
      return newCircle as unknown as Circle;
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
