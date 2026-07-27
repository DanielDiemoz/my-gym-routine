import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Fragment } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { Users, Dumbbell, Brain, Calendar, Search, ChevronDown, ChevronUp } from "lucide-react";
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

type Plan = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type Exercise = {
  id: string;
  plan_id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  weight: number;
  position: number | null;
  notes: string | null;
};

type SessionLog = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_name: string;
  muscle_group: string | null;
  set_number: number;
  reps: number;
  weight: number;
  created_at: string;
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
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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

  // Fetch session logs for expanded user
  const sessionIdsForExpanded = expandedUser
    ? sessions.filter((s) => s.user_id === expandedUser).map((s) => s.id)
    : [];

  const sessionLogsQuery = useQuery({
    queryKey: ["admin", "session-logs", expandedUser],
    queryFn: async () => {
      if (sessionIdsForExpanded.length === 0) return [] as SessionLog[];
      const { data, error } = await supabase
        .from("session_logs")
        .select("*")
        .in("session_id", sessionIdsForExpanded)
        .order("set_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionLog[];
    },
    enabled: sessionIdsForExpanded.length > 0,
  });

  // Fetch plans for expanded user
  const plansQuery = useQuery({
    queryKey: ["admin", "plans", expandedUser],
    queryFn: async () => {
      if (!expandedUser) return [] as Plan[];
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", expandedUser)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
    enabled: !!expandedUser,
  });

  // Fetch exercises for plans of expanded user
  const planIds = (plansQuery.data ?? []).map((p) => p.id);
  const exercisesQuery = useQuery({
    queryKey: ["admin", "exercises", expandedUser],
    queryFn: async () => {
      if (planIds.length === 0) return [] as Exercise[];
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .in("plan_id", planIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
    enabled: planIds.length > 0,
  });

  const sessionLogs = sessionLogsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];

  // Calculate KPIs
  const totalUsers = users.length;
  const onboardedUsers = users.filter((u) => u.onboarded).length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed_at).length;
  const activeUsers = new Set(
    sessions.filter((s) => new Date(s.started_at) >= dateFilter).map((s) => s.user_id),
  ).size;
  const geminiCalls = geminiUsage.length;
  const geminiSuccess = geminiUsage.filter((g) => g.success).length;
  const geminiImageCalls = geminiUsage.filter((g) => g.mode === "image").length;
  const geminiTextCalls = geminiUsage.filter((g) => g.mode === "text").length;

  // Filter users by search, then sort by completed workouts descending
  const filteredUsers = users
    .filter(
      (u) =>
        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const aCompleted = sessions.filter((s) => s.user_id === a.id && s.completed_at).length;
      const bCompleted = sessions.filter((s) => s.user_id === b.id && s.completed_at).length;
      return bCompleted - aCompleted;
    });

  // Get user stats
  const getUserStats = (userId: string) => {
    const userSessions = sessions.filter((s) => s.user_id === userId);
    const userGemini = geminiUsage.filter((g) => g.user_id === userId);
    return {
      sessions: userSessions.length,
      completedSessions: userSessions.filter((s) => s.completed_at).length,
      geminiCalls: userGemini.length,
      lastSession: userSessions[0]?.started_at,
    };
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">{onboardedUsers} completati onboarding</p>
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
              {completedSessions} completati · {activeUsers} utenti attivi (
              {dateRange === "all"
                ? "totale"
                : dateRange === "7d"
                  ? "7gg"
                  : dateRange === "30d"
                    ? "30gg"
                    : "90gg"}
              )
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
                    <Fragment key={user.id}>
                      <TableRow>
                        <TableCell>
                          <div className="font-medium">{user.display_name ?? "Senza nome"}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {user.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{stats.sessions}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              stats.completedSessions === stats.sessions ? "default" : "secondary"
                            }
                          >
                            {stats.completedSessions}/{stats.sessions}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{stats.geminiCalls}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setExpandedUser(isExpanded ? null : user.id);
                              setExpandedSession(null);
                              setExpandedPlan(null);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${user.id}-details`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">ID:</span>
                                <code className="font-mono text-xs">{user.id}</code>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">Onboarding:</span>
                                <Badge variant={user.onboarded ? "default" : "destructive"}>
                                  {user.onboarded ? "Completato" : "Non completato"}
                                </Badge>
                              </div>
                              {(() => {
                                const sessionsForUser = sessions
                                  .filter((s) => s.user_id === user.id)
                                  .sort(
                                    (a, b) =>
                                      new Date(b.started_at).getTime() -
                                      new Date(a.started_at).getTime(),
                                  );
                                return (
                                  <div className="space-y-4">
                                    {/* Schede */}
                                    <div>
                                      <p className="font-semibold text-sm mb-2">
                                        Schede ({plans.length})
                                      </p>
                                      {plans.length === 0 ? (
                                        <p className="text-muted-foreground text-xs">
                                          Nessuna scheda.
                                        </p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {plans.map((plan) => {
                                            const isPlanExpanded = expandedPlan === plan.id;
                                            const planExercises = exercises
                                              .filter((e) => e.plan_id === plan.id)
                                              .sort(
                                                (a, b) => (a.position ?? 0) - (b.position ?? 0),
                                              );
                                            return (
                                              <div
                                                key={plan.id}
                                                className="rounded-lg border bg-background"
                                              >
                                                <button
                                                  onClick={() =>
                                                    setExpandedPlan(isPlanExpanded ? null : plan.id)
                                                  }
                                                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                      {plan.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                      {planExercises.length} esercizi
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                      {format(new Date(plan.created_at), "dd MMM", {
                                                        locale: it,
                                                      })}
                                                    </span>
                                                    {isPlanExpanded ? (
                                                      <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                  </div>
                                                </button>
                                                {isPlanExpanded && (
                                                  <div className="border-t px-3 py-2">
                                                    {planExercises.length === 0 ? (
                                                      <p className="text-xs text-muted-foreground py-1">
                                                        Nessun esercizio.
                                                      </p>
                                                    ) : (
                                                      <div className="space-y-1.5">
                                                        {planExercises.map((ex) => (
                                                          <div
                                                            key={ex.id}
                                                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
                                                          >
                                                            <div className="flex items-center gap-2">
                                                              <span className="text-sm font-semibold">
                                                                {ex.name}
                                                              </span>
                                                              {ex.muscle_group && (
                                                                <Badge
                                                                  variant="outline"
                                                                  className="text-[10px]"
                                                                >
                                                                  {ex.muscle_group}
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground">
                                                              {ex.sets}×{ex.reps} @ {ex.weight}kg
                                                            </span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Allenamenti */}
                                    <div>
                                      <p className="font-semibold text-sm mb-2">
                                        Allenamenti ({sessionsForUser.length})
                                      </p>
                                      {sessionsForUser.length === 0 ? (
                                        <p className="text-muted-foreground text-xs">
                                          Nessuna sessione.
                                        </p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {sessionsForUser.map((s) => {
                                            const isSessionExpanded = expandedSession === s.id;
                                            const logs = sessionLogs.filter(
                                              (l) => l.session_id === s.id,
                                            );
                                            const exercisesByName = new Map<string, SessionLog[]>();
                                            for (const log of logs) {
                                              const existing =
                                                exercisesByName.get(log.exercise_name) ?? [];
                                              existing.push(log);
                                              exercisesByName.set(log.exercise_name, existing);
                                            }
                                            return (
                                              <div
                                                key={s.id}
                                                className="rounded-lg border bg-background"
                                              >
                                                <button
                                                  onClick={() =>
                                                    setExpandedSession(
                                                      isSessionExpanded ? null : s.id,
                                                    )
                                                  }
                                                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {s.completed_at ? (
                                                      <Badge
                                                        variant="default"
                                                        className="text-[10px]"
                                                      >
                                                        Completata
                                                      </Badge>
                                                    ) : (
                                                      <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                      >
                                                        In corso
                                                      </Badge>
                                                    )}
                                                    <span className="font-medium text-sm">
                                                      {s.plan_name ?? "Sessione"}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                      {format(
                                                        new Date(s.started_at),
                                                        "dd MMM HH:mm",
                                                        { locale: it },
                                                      )}
                                                    </span>
                                                    {isSessionExpanded ? (
                                                      <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                  </div>
                                                </button>
                                                {isSessionExpanded && (
                                                  <div className="border-t px-3 py-2">
                                                    {exercisesByName.size === 0 ? (
                                                      <p className="text-xs text-muted-foreground py-1">
                                                        Nessun log esercizi.
                                                      </p>
                                                    ) : (
                                                      <div className="space-y-2">
                                                        {Array.from(exercisesByName.entries()).map(
                                                          ([name, exerciseLogs]) => (
                                                            <div
                                                              key={name}
                                                              className="rounded-md bg-muted/50 px-3 py-2"
                                                            >
                                                              <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold">
                                                                  {name}
                                                                </span>
                                                                {exerciseLogs[0]?.muscle_group && (
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-[10px]"
                                                                  >
                                                                    {exerciseLogs[0].muscle_group}
                                                                  </Badge>
                                                                )}
                                                              </div>
                                                              <div className="mt-1 flex flex-wrap gap-1.5">
                                                                {exerciseLogs.map((log) => (
                                                                  <span
                                                                    key={log.id}
                                                                    className="rounded bg-background px-2 py-0.5 text-xs font-mono"
                                                                  >
                                                                    {log.set_number}×{log.reps} @{" "}
                                                                    {log.weight}kg
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
                        <div className="text-xs text-muted-foreground font-mono">
                          {usage.user_id.slice(0, 8)}...
                        </div>
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
