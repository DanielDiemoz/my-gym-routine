/**
 * useCircle.ts
 * Hook centralizzato per la feature "Cerchie".
 *
 * Espone:
 *   - myCircles     : cerchie di cui l'utente è membro (o owner)
 *   - joinCircle    : entra in una cerchia tramite codice
 *   - createCircle  : crea nuova cerchia (chiunque può crearla; il creatore
 *                     diventa owner e ottiene i privilegi di gestione)
 *   - leaveCircle   : esci da una cerchia
 *   - deleteCircle  : elimina una cerchia (solo owner)
 *   - chat functions: messages, sendMessage, unreadCount, markAsRead
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

export interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

const fromCircles = () => supabase.from("circles");
const fromCircleMembers = () => supabase.from("circle_members");

// ── Query keys ────────────────────────────────────────────────────────────────
const CIRCLES_KEY = (userId: string) => ["circles", userId] as const;

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
      const { data, error } = await supabase.rpc("get_my_circles");
      if (error) {
        throw new Error(error.message || "Errore nel caricamento delle cerchie");
      }
      return (data ?? []) as Circle[];
    },
    staleTime: 1000 * 30, // 30 secondi
  });

  const invalidateCircles = () => qc.invalidateQueries({ queryKey: CIRCLES_KEY(userId) });

  // ── Mutation: entra in una cerchia ────────────────────────────────────────
  // Usa la RPC SECURITY DEFINER `join_circle_by_code` perché la policy
  // `circles_select` non permette a un NON-membro di SELECT una cerchia.
  // La RPC gira come owner: vede tutte le cerchie per codice e poi inserisce
  // il membro (idempotente via ON CONFLICT DO NOTHING).
  const joinMut = useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data: circleId, error } = await supabase.rpc("join_circle_by_code", {
        invite_code: code,
      });
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

  // ── Mutation: crea una cerchia ─────────────────────────────────────────────
  // Usa la RPC SECURITY DEFINER `create_circle` che esegue tutto atomicamente
  // lato DB ed è aperta a qualsiasi utente autenticato:
  //   - genera un codice univoco (controllo collisioni NON soggetto a RLS,
  //     quindi non può "perdere" cerchie altrui come faceva la query client);
  //   - INSERT cerchia con owner_id = auth.uid() + INSERT membro con rollback
  //     automatico in caso di errore; il creatore diventa owner e ottiene i
  //     privilegi di gestione (elimina, rimuovi membri, modifica nickname).
  // Il client deve solo passare il nome: niente più corse RLS o rollback manuali.
  const createMut = useMutation({
    mutationFn: async (name: string): Promise<Circle> => {
      const { data: newCircle, error } = await supabase.rpc("create_circle", {
        circle_name: name,
      });
      if (error) {
        throw new Error(error.message || "Errore durante la creazione");
      }
      if (!newCircle) throw new Error("Creazione cerchia fallita");
      return newCircle as Circle;
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

  // ── Mutation: rimuovi un membro (solo owner) ──────────────────────────────
  // Usa la RPC SECURITY DEFINER `remove_circle_member` che bypassa RLS,
  // come tutte le altre operazioni sulle cerchie.
  const removeMemberMut = useMutation({
    mutationFn: async ({ circleId, memberId }: { circleId: string; memberId: string }) => {
      const { error } = await supabase.rpc("remove_circle_member", {
        p_circle_id: circleId,
        p_member_id: memberId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidateCircles();
      qc.invalidateQueries({ queryKey: ["circle-detail", variables.circleId] });
      toast.success("Membro rimosso.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore durante la rimozione");
    },
  });

  // ── Mutation: aggiorna nickname di un membro (solo owner) ──────────────
  const updateNicknameMut = useMutation({
    mutationFn: async ({
      circleId,
      memberId,
      nickname,
    }: {
      circleId: string;
      memberId: string;
      nickname: string;
    }) => {
      const { error } = await supabase.rpc("update_circle_member_nickname", {
        p_circle_id: circleId,
        p_member_id: memberId,
        p_nickname: nickname,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["circle-detail", variables.circleId] });
      toast.success("Nickname aggiornato.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore durante l'aggiornamento");
    },
  });

  // ── Query: messaggi di una cerchia ─────────────────────────────────────
  const MESSAGES_KEY = (circleId: string) => ["circle-messages", circleId] as const;

  function useMessages(circleId: string) {
    return useQuery({
      queryKey: MESSAGES_KEY(circleId),
      queryFn: async (): Promise<CircleMessage[]> => {
        const { data, error } = await supabase.rpc("get_circle_messages", {
          p_circle_id: circleId,
        });
        if (error) throw error;
        return (data ?? []) as CircleMessage[];
      },
      staleTime: 1000 * 10,
      refetchInterval: 5_000,
    });
  }

  // ── Mutation: invia un messaggio ──────────────────────────────────────
  const sendMut = useMutation({
    mutationFn: async ({
      circleId,
      content,
    }: {
      circleId: string;
      content: string;
    }): Promise<CircleMessage> => {
      const { data, error } = await supabase.rpc("send_circle_message", {
        p_circle_id: circleId,
        p_content: content,
      });
      if (error) throw new Error(error.message);
      const msgs = (data ?? []) as CircleMessage[];
      return msgs[0];
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY(variables.circleId) });
      qc.invalidateQueries({
        queryKey: ["circle-unread", variables.circleId],
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Errore nell'invio del messaggio");
    },
  });

  // ── Query: conteggio messaggi non letti per una cerchia ──────────────
  function useUnreadCount(circleId: string) {
    return useQuery({
      queryKey: ["circle-unread", circleId] as const,
      queryFn: async (): Promise<number> => {
        const { data, error } = await supabase.rpc("get_unread_count", {
          p_circle_id: circleId,
        });
        if (error) throw error;
        return (data ?? 0) as number;
      },
      staleTime: 1000 * 10,
      refetchInterval: 10_000,
    });
  }

  // ── Mutation: segna una cerchia come letta ────────────────────────────
  const markReadMut = useMutation({
    mutationFn: async (circleId: string) => {
      const { error } = await supabase.rpc("mark_circle_read", {
        p_circle_id: circleId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, circleId) => {
      qc.invalidateQueries({ queryKey: ["circle-unread", circleId] });
    },
  });

  // ── Query: conteggi non letti per TUTTE le cerchie dell'utente ────────
  function useAllUnreadCounts() {
    const circleIds = circlesQ.data?.map((c) => c.id) ?? [];
    return useQuery({
      queryKey: ["circle-all-unread", userId] as const,
      queryFn: async (): Promise<Record<string, number>> => {
        const counts: Record<string, number> = {};
        for (const id of circleIds) {
          const { data, error } = await supabase.rpc("get_unread_count", {
            p_circle_id: id,
          });
          if (!error) counts[id] = (data ?? 0) as number;
        }
        return counts;
      },
      enabled: circleIds.length > 0,
      staleTime: 1000 * 10,
      refetchInterval: 15_000,
    });
  }

  return {
    /** Cerchie di cui l'utente è membro o owner */
    myCircles: circlesQ.data ?? [],
    isLoadingCircles: circlesQ.isLoading,
    /** Entra in una cerchia tramite codice di 6 caratteri */
    joinCircle: (code: string) => joinMut.mutateAsync(code),
    isJoining: joinMut.isPending,
    /** Crea una nuova cerchia (chiunque). Restituisce la cerchia creata. */
    createCircle: (name: string) => createMut.mutateAsync(name),
    isCreating: createMut.isPending,
    /** Esci da una cerchia */
    leaveCircle: (circleId: string) => leaveMut.mutateAsync(circleId),
    isLeaving: leaveMut.isPending,
    /** Elimina una cerchia (solo owner) */
    deleteCircle: (circleId: string) => deleteMut.mutateAsync(circleId),
    isDeleting: deleteMut.isPending,
    /** Rimuove un membro dalla cerchia (solo owner) */
    removeMember: (circleId: string, memberId: string) =>
      removeMemberMut.mutateAsync({ circleId, memberId }),
    isRemovingMember: removeMemberMut.isPending,
    /** Aggiorna il nickname di un membro (solo owner) */
    updateNickname: (circleId: string, memberId: string, nickname: string) =>
      updateNicknameMut.mutateAsync({ circleId, memberId, nickname }),
    isUpdatingNickname: updateNicknameMut.isPending,
    /** Recupera i messaggi di una cerchia */
    useMessages,
    /** Invia un messaggio in una cerchia */
    sendMessage: (circleId: string, content: string) => sendMut.mutateAsync({ circleId, content }),
    isSending: sendMut.isPending,
    /** Recupera il conteggio dei messaggi non letti per una cerchia */
    useUnreadCount,
    /** Segna una cerchia come letta */
    markAsRead: (circleId: string) => markReadMut.mutateAsync(circleId),
    /** Recupera i conteggi non letti per tutte le cerchie */
    useAllUnreadCounts,
  };
}
