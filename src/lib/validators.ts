import { z } from "zod";

// ── Session ────────────────────────────────────────────────────────────────
export const SessionRowSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid().nullable(),
  plan_name: z.string().nullable(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  total_volume: z.number(),
  user_id: z.string().uuid(),
  workout_state: z.any().nullable(),
});

export const SessionInsertSchema = z.object({
  user_id: z.string().uuid(),
  plan_id: z.string().uuid().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  started_at: z.string().datetime().optional(),
  total_volume: z.number().optional(),
  workout_state: z.any().nullable().optional(),
});

export const SessionUpdateSchema = z.object({
  completed_at: z.string().datetime().nullable().optional(),
  total_volume: z.number().optional(),
  workout_state: z.any().nullable().optional(),
});

// ── Session Log ────────────────────────────────────────────────────────────
export const SessionLogInsertSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  exercise_name: z.string().min(1),
  muscle_group: z.string().nullable().optional(),
  set_number: z.number().int().positive(),
  reps: z.number().int().min(0),
  weight: z.number().min(0),
});

// ── Plan ───────────────────────────────────────────────────────────────────
export const PlanInsertSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
});

// ── Exercise ───────────────────────────────────────────────────────────────
export const ExerciseRowSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  muscle_group: z.string().nullable(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number(),
  position: z.number(),
  notes: z.string().nullable(),
  exercise_library_id: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const ExerciseInsertSchema = z.object({
  plan_id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  muscle_group: z.string().nullable().optional(),
  sets: z.number().int().min(1).optional(),
  reps: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  position: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
  exercise_library_id: z.string().nullable().optional(),
});

// ── Profile ────────────────────────────────────────────────────────────────
export const ProfileUpdateSchema = z.object({
  display_name: z.string().max(50).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  weekly_goal: z.number().int().min(1).max(7).nullable().optional(),
  weight_unit: z.enum(["kg"]).optional(),
  onboarded: z.boolean().optional(),
});

// ── Circle ─────────────────────────────────────────────────────────────────
export const CircleInsertSchema = z.object({
  name: z.string().min(1).max(50),
});

export const CircleInviteCodeSchema = z
  .string()
  .length(6)
  .regex(/^[A-Z0-9]{6}$/);

// ── Validation helpers ─────────────────────────────────────────────────────
export function validateSession(data: unknown) {
  return SessionRowSchema.parse(data);
}

export function validateSessions(data: unknown) {
  return z.array(SessionRowSchema).parse(data);
}

export function validateSessionLogs(data: unknown) {
  return z.array(SessionLogInsertSchema).parse(data);
}

export function validateExercise(data: unknown) {
  return ExerciseRowSchema.parse(data);
}

export function validateExercises(data: unknown) {
  return z.array(ExerciseRowSchema).parse(data);
}
