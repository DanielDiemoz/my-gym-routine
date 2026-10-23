import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Users, User, Mail, Megaphone } from "lucide-react";

export type AdminUserOption = {
  id: string;
  display_name: string | null;
};

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUserOption[];
  preselectedUserId?: string | null;
  onSuccess?: () => void;
}

export function SendNotificationDialog({
  open,
  onOpenChange,
  users,
  preselectedUserId,
  onSuccess,
}: SendNotificationDialogProps) {
  const [recipient, setRecipient] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"direct" | "system" | "announcement">("direct");
  const [isSending, setIsSending] = useState(false);

  // When dialog opens or preselectedUserId changes
  useEffect(() => {
    if (open) {
      if (preselectedUserId) {
        setRecipient(preselectedUserId);
        setType("direct");
      } else {
        setRecipient("all");
        setType("system");
      }
      setTitle("");
      setMessage("");
    }
  }, [open, preselectedUserId]);

  // Adjust type when recipient changes
  const handleRecipientChange = (val: string) => {
    setRecipient(val);
    if (val === "all") {
      setType("system");
    } else {
      setType("direct");
    }
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error("Inserisci un titolo per il messaggio");
      return;
    }
    if (!message.trim()) {
      toast.error("Inserisci il contenuto del messaggio");
      return;
    }

    setIsSending(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const isBroadcast = recipient === "all";
      const targetUserId = isBroadcast ? null : recipient;

      const { error } = await supabase.from("notifications").insert({
        user_id: targetUserId,
        sender_id: currentUser?.id ?? null,
        title: title.trim(),
        message: message.trim(),
        type: type,
        read: false,
      });

      if (error) throw error;

      toast.success(
        isBroadcast
          ? "Notifica di sistema inviata a tutti gli utenti!"
          : "Messaggio diretto inviato con successo all'utente!",
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      console.error("Error sending notification:", err);
      const msg = err instanceof Error ? err.message : "Errore durante l'invio";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const selectedUserObj = users.find((u) => u.id === recipient);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Invia Notifica / Messaggio
          </DialogTitle>
          <DialogDescription>
            Invia un messaggio personale diretto a un utente oppure una notifica broadcast a tutta
            la community di GymBro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatario</Label>
            <Select value={recipient} onValueChange={handleRecipientChange}>
              <SelectTrigger id="recipient" className="w-full">
                <SelectValue placeholder="Seleziona destinatario" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-medium text-primary">
                    <Users className="h-4 w-4" />
                    <span>Tutti gli utenti (Notifica di sistema broadcast)</span>
                  </div>
                </SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{u.display_name || "Senza nome"}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        ({u.id.slice(0, 8)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipologia</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "direct" | "system" | "announcement")}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>Messaggio Diretto (Personale)</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-3.5 w-3.5 text-blue-500" />
                    <span>Notifica di Sistema</span>
                  </div>
                </SelectItem>
                <SelectItem value="announcement">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      INFO
                    </Badge>
                    <span>Annuncio / Novità</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              placeholder="es. Feedback sulla tua scheda / Benvenuto in GymBro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="message">Messaggio</Label>
            <Textarea
              id="message"
              placeholder="Scrivi qui il messaggio per l'utente..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {message.length}/2000 caratteri
            </div>
          </div>

          {/* Anteprima Live */}
          {(title || message) && (
            <div className="rounded-xl border border-dashed border-border p-3 bg-muted/30">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Anteprima vista utente
              </span>
              <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant={recipient === "all" ? "secondary" : "default"} className="text-[10px] h-4.5">
                    {recipient === "all" ? "Sistema" : "Messaggio Diretto"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Adesso</span>
                </div>
                {title && <p className="text-xs font-bold text-foreground">{title}</p>}
                {message && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/40 p-2 rounded border border-border/40">
                    {message}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Destinato a:{" "}
                  <span className="font-medium text-foreground">
                    {recipient === "all"
                      ? "Tutti gli utenti (Broadcast)"
                      : selectedUserObj?.display_name || "Utente selezionato"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending}>
            Annulla
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-1.5">
            <Send className="h-4 w-4" />
            <span>{isSending ? "Invio in corso..." : "Invia Messaggio"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
