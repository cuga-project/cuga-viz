import { useLocation } from "react-router-dom";

export const dashboardPath = (experiment?: string) =>
  experiment ? `/dashboard?${new URLSearchParams({ experiment })}` : "/dashboard";

export function tracePath(task: string, experiment?: string) {
  // Browsers normalize dot segments before React Router can read them.
  if (task === "." || task === "..") {
    const params = new URLSearchParams({ task });
    if (experiment) params.set("experiment", experiment);
    return `/trajectories?${params}`;
  }
  return `/trajectories/${experiment ? `${encodeURIComponent(experiment)}/` : ""}${encodeURIComponent(task)}`;
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function useTraceAddress() {
  const { pathname, search } = useLocation();
  if (!/^\/trajectories(?:\/|$)/i.test(pathname)) return;

  // Decode raw segments once. React Router treats literal "%2F" in params as a slash.
  const segments = pathname.replace(/\/+$/, "").split("/").slice(2);
  if (segments.length === 2) {
    return { experiment: decodeSegment(segments[0]), taskId: decodeSegment(segments[1]) };
  }
  if (segments.length === 1) return { taskId: decodeSegment(segments[0]) };
  if (segments.length === 0) {
    const params = new URLSearchParams(search);
    return { taskId: params.get("task") ?? "", experiment: params.get("experiment") || undefined };
  }
}

export const comparisonPath = (names: string[]) => {
  const params = new URLSearchParams();
  names.forEach((name) => params.append("run", name));
  return names.length ? `/compare?${params}` : "/compare";
};
