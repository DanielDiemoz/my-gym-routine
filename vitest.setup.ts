import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

Object.defineProperty(window, "sessionStorage", {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

window.navigator.clipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(""),
};

HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: vi.fn(() => ({ component: () => null })),
  Link: ({ children }: { children: React.ReactNode }) => children,
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  Outlet: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("date-fns", () => ({
  format: vi.fn((d, f, o) => d.toISOString()),
  startOfWeek: vi.fn((d) => d),
  endOfWeek: vi.fn((d) => d),
  subWeeks: vi.fn((d) => d),
  subDays: vi.fn((d) => d),
  eachDayOfInterval: vi.fn(() => []),
  isSameDay: vi.fn(() => false),
  startOfMonth: vi.fn((d) => d),
  endOfMonth: vi.fn((d) => d),
  subMonths: vi.fn((d) => d),
  isSameMonth: vi.fn(() => false),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    t: (it: string, en: string) => it,
    language: "it",
    dateLocale: { code: "it" },
  }),
}));

vi.mock("@/hooks/useWeightUnit", () => ({
  useWeightUnit: () => ({
    display: (val: number) => `${val} kg`,
    unit: "kg",
  }),
}));
