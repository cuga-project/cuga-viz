export interface Experiment {
  path: string;
  total_tasks: number;
  completed_tasks: number;
  tasks_passed: number;
  tasks_failed_score_0: string[];
  errored_tasks: number;
  created_at: number;
  error?: string;
}

export interface ExperimentPage {
  experiments: Record<string, Experiment>;
  pagination: { current_page: number; total_pages: number; total_items: number; per_page: number };
}

export type ResultRow = Record<string, string | number | boolean | null | undefined>;
export type Outcome = "Passed" | "Failed" | "Error" | "Scored" | "Unscored";

export const maxComparisonRuns = 4;

export function numberValue(value: ResultRow[string]): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function outcome(row: ResultRow): Outcome {
  if (row.exception === true || String(row.exception).toLowerCase() === "true") return "Error";
  const score = numberValue(row.score);
  if (score === 1) return "Passed";
  if (score === 0) return "Failed";
  return score === null ? "Unscored" : "Scored";
}

export const outcomeTone = {
  Passed: "green",
  Failed: "red",
  Error: "red",
  Scored: "amber",
  Unscored: "neutral",
} satisfies Record<Outcome, string>;

export function formatPercent(numerator: number, denominator: number) {
  return denominator
    ? `${((numerator / denominator) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
    : "—";
}

export function average(values: (number | null)[]) {
  const numbers = values.filter((value) => value !== null);
  if (!numbers.length) return "—";
  return (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}
