import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export type AppNotification = {
  id: string;
  user_id: string | null;
  sender_id: string | null;
  title: string;
  message: string;
  type: "direct" | "system" | "announcement" | string;
  created_at: string;
  is_read: boolean;
  is_direct: boolean;
  sender_name?: string | null;
};

export function useNotifications(userId?: string | null) {
  const qc = useQueryClient();

  const queryKey = ["notifications", userId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<AppNotification[]> => {
      if (!userId) return [];

      // 1. Preleva le notifiche destinate all'utente o broadcast (user_id IS NULL)
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("created_at", { ascending: false });

      if (notifError) {
        // Se la tabella non esiste ancora o errore DB, fallback pulito
        console.warn("Error fetching notifications:", notifError);
        return [];
      }

      const notifs = notifData ?? [];
      if (notifs.length === 0) return [];

      // 2. Preleva i record di lettura per le notifiche broadcast
      const broadcastIds = notifs.filter((n) => !n.user_id).map((n) => n.id);
      let readSet = new Set<string>();

      if (broadcastIds.length > 0) {
        try {
          const { data: reads } = await supabase
            .from("notification_reads")
            .select("notification_id")
            .eq("user_id", userId)
            .in("notification_id", broadcastIds);

          if (reads) {
            readSet = new Set(reads.map((r) => r.notification_id));
          }
        } catch {
          // ignore if table pending migration
        }
      }

      // 3. Preleva i nomi degli admin mittenti se presenti
      const senderIds = Array.from(
        new Set(notifs.map((n) => n.sender_id).filter((id): id is string => Boolean(id))),
      );

      const senderMap = new Map<string, string>();
      if (senderIds.length > 0) {
        try {
          const { data: senders } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", senderIds);

          senders?.forEach((s) => {
            if (s.display_name) senderMap.set(s.id, s.display_name);
          });
        } catch {
          // ignore
        }
      }

      return notifs.map((n) => {
        const is_direct = Boolean(n.user_id);
        const is_read = is_direct ? Boolean(n.read) : readSet.has(n.id);
        const sender_name = n.sender_id ? senderMap.get(n.sender_id) ?? "Admin" : "Admin";

        return {
          id: n.id,
          user_id: n.user_id,
          sender_id: n.sender_id,
          title: n.title,
          message: n.message,
          type: n.type,
          created_at: n.created_at,
          is_read,
          is_direct,
          sender_name,
        };
      });
    },
    enabled: Boolean(userId),
    refetchInterval: 30000, // Controlla notifiche ogni 30s
    staleTime: 10000,
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const directCount = notifications.filter((n) => n.is_direct).length;
  const unreadDirectCount = notifications.filter((n) => n.is_direct && !n.is_read).length;
  const latestUnreadDirect = notifications.find((n) => n.is_direct && !n.is_read);

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ id, isDirect }: { id: string; isDirect: boolean }) => {
      if (!userId) return;
      if (isDirect) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_reads")
          .upsert({ notification_id: id, user_id: userId }, { onConflict: "notification_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const unreadDirect = notifications.filter((n) => n.is_direct && !n.is_read).map((n) => n.id);
      const unreadBroadcast = notifications
        .filter((n) => !n.is_direct && !n.is_read)
        .map((n) => n.id);

      const promises: Promise<unknown>[] = [];

      if (unreadDirect.length > 0) {
        promises.push(
          supabase
            .from("notifications")
            .update({ read: true })
            .in("id", unreadDirect)
            .eq("user_id", userId),
        );
      }

      if (unreadBroadcast.length > 0) {
        const rows = unreadBroadcast.map((notifId) => ({
          notification_id: notifId,
          user_id: userId,
        }));
        promises.push(
          supabase
            .from("notification_reads")
            .upsert(rows, { onConflict: "notification_id,user_id" }),
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // Delete / Dismiss
  const deleteNotificationMutation = useMutation({
    mutationFn: async ({ id, isDirect }: { id: string; isDirect: boolean }) => {
      if (!userId) return;
      if (isDirect) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_dismissals")
          .upsert({ notification_id: id, user_id: userId }, { onConflict: "notification_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const markAsRead = useCallback(
    (id: string, isDirect: boolean) => markAsReadMutation.mutateAsync({ id, isDirect }),
    [markAsReadMutation],
  );

  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation],
  );

  const deleteNotification = useCallback(
    (id: string, isDirect: boolean) => deleteNotificationMutation.mutateAsync({ id, isDirect }),
    [deleteNotificationMutation],
  );

  return {
    notifications,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    unreadCount,
    directCount,
    unreadDirectCount,
    latestUnreadDirect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingRead: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
}
