import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  Users,
  Dumbbell,
  Activity,
  Brain,
  Calendar,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type UserProfile = {
  id: string;
  display_name: string | null;
  created_at: string;
  onboarded: boolean;
};

type Session = {
  id: string;
  user_id: string;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
};

type GeminiUsage = {
  id: string;
  user_id: string;
  mode: "image" | "text";
  exercise_count: number;
  plan_name: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const dateFilter = (() => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return subDays(now, 7);
      case "30d":
        return subDays(now, 30);
      case "90d":
        return subDays(now, 90);
      default:
        return new Date(0);
    }
  })();

  // Fetch all users
  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at, onboarded")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as UserProfile[];
    },
  });

  // Fetch sessions for stats
  const sessionsQuery = useQuery({
    queryKey: ["admin", "sessions", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, user_id, plan_name, started_at, completed_at, total_volume")
        .gte("started_at", dateFilter.toISOString())
        .order("started_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  // Fetch Gemini usage
  const geminiQuery = useQuery({
    queryKey: ["admin", "gemini", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_usage")
        .select("*")
        .gte("created_at", dateFilter.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as GeminiUsage[];
    },
  });

  const users = usersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const geminiUsage = geminiQuery.data ?? [];

  // Calculate KPIs
  const totalUsers = users.length;
  const onboardedUsers = users.filter((u) => u.onboarded).length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed_at).length;
  const totalVolume = sessions.reduce((sum, s) => sum + (s.total_volume ?? 0), 0);
  const activeUsersThisWeek = new Set(
    sessions
      .filter((s) => subDays(new Date(), 7) <= new Date(s.started_at))
      .map((s) => s.user_id)
  ).size;
  const geminiCalls = geminiUsage.length;
  const geminiSuccess = geminiUsage.filter((g) => g.success).length;
  const geminiImageCalls = geminiUsage.filter((g) => g.mode === "image").length;
  const geminiTextCalls = geminiUsage.filter((g) => g.mode === "text").length;

  // Filter users by search
  const filteredUsers = users.filter((u) =>
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get user stats
  const getUserStats = (userId: string) => {
    const userSessions = sessions.filter((s) => s.user_id === userId);
    const userGemini = geminiUsage.filter((g) => g.user_id === userId);
    return {
      sessions: userSessions.length,
      completedSessions: userSessions.filter((s) => s.completed_at).length,
      totalVolume: userSessions.reduce((sum, s) => sum + (s.total_volume ?? 0), 0),
      geminiCalls: userGemini.length,
      lastSession: userSessions[0]?.started_at,
    };
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {onboardedUsers} completati onboarding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allenamenti</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {completedSessions} completati · {activeUsersThisWeek} utenti attivi (7gg)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Totale</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalVolume.toLocaleString("it-IT")} kg
            </div>
            <p className="text-xs text-muted-foreground">
              {dateRange === "all" ? "Totale" : `Ultimi ${dateRange}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiamate Gemini</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{geminiCalls}</div>
            <p className="text-xs text-muted-foreground">
              {geminiSuccess} successi · {geminiImageCalls} img · {geminiTextCalls} testo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="gemini" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Gemini
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca utente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
                <SelectItem value="all">Tutto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead className="text-center">Allenamenti</TableHead>
                  <TableHead className="text-center">Completati</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                  <TableHead className="text-center">Gemini</TableHead>
                  <TableHead>Registrato</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const stats = getUserStats(user.id);
                  const isExpanded = expandedUser === user.id;
                  return (
                    <>
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.display_name ?? "Senza nome"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}...</div>
                        </TableCell>
                        <TableCell className="text-center">{stats.sessions}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stats.completedSessions === stats.sessions ? "default" : "secondary"}>
                            {stats.completedSessions}/{stats.sessions}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.totalVolume.toLocaleString("it-IT")} kg
                        </TableCell>
                        <TableCell className="text-center">{stats.geminiCalls}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${user.id}-details`}>
                          <TableCell colSpan={7} className="bg-muted/50">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">ID:</span>
                                <code className="font-mono text-xs">{user.id}</code>
                              </div>
                              {stats.lastSession && (
                                <div className="flex items-center gap-4">
                                  <span className="text-muted-foreground">Ultimo allenamento:</span>
                                  <span>{format(new Date(stats.lastSession), "dd MMM yyyy HH:mm", { locale: it })}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">Onboarding:</span>
                                <Badge variant={user.onboarded ? "default" : "destructive"}>
                                  {user.onboarded ? "Completato" : "Non completato"}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Gemini Tab */}
        <TabsContent value="gemini" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
                <SelectItem value="all">Tutto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Modalita</TableHead>
                  <TableHead className="text-center">Esercizi</TableHead>
                  <TableHead>Scheda</TableHead>
                  <TableHead>Esito</TableHead>
                  <TableHead>Errore</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geminiUsage.map((usage) => {
                  const user = users.find((u) => u.id === usage.user_id);
                  return (
                    <TableRow key={usage.id}>
                      <TableCell>
                        {format(new Date(usage.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{user?.display_name ?? "Sconosciuto"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{usage.user_id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usage.mode === "image" ? "default" : "secondary"}>
                          {usage.mode === "image" ? "📷 Immagine" : "📝 Testo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{usage.exercise_count}</TableCell>
                      <TableCell>{usage.plan_name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={usage.success ? "default" : "destructive"}>
                          {usage.success ? "Successo" : "Errore"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {usage.error_message ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
