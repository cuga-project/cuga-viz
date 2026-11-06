export const dashboardPath = (experiment?: string) =>
  experiment ? `/dashboard?${new URLSearchParams({ experiment })}` : "/dashboard";

export const tracePath = (task: string, experiment?: string) =>
  `/trajectories/${experiment ? `${encodeURIComponent(experiment)}/` : ""}${encodeURIComponent(task)}`;

export const comparisonPath = (names: string[]) => {
  const params = new URLSearchParams();
  names.forEach((name) => params.append("run", name));
  return names.length ? `/compare?${params}` : "/compare";
};
