import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GitCompareArrows,
  Plus,
  Search,
  X,
} from "lucide-react";
import { fetchDataTable, fetchLoggedExperiments } from "../services/api";
import {
  average,
  formatPercent,
  maxComparisonRuns,
  numberValue,
  outcome,
  outcomeTone,
  type Experiment,
  type ResultRow,
} from "../utils/results";
import { dashboardPath, tracePath } from "../utils/routes";
import { BackLink, EmptyState, PageHeading } from "./Workspace";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

function RunPicker({ names, onPick }: { names: string[]; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ names: string[]; totalPages: number }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setList(undefined);
    setError(false);
    fetchLoggedExperiments(page, 8, query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setList({ names: Object.keys(data.experiments), totalPages: data.pagination.total_pages });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, page, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={names.length >= maxComparisonRuns}>
          <Plus /> Add run
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an experiment</DialogTitle>
          <DialogDescription>Select up to {maxComparisonRuns} runs for this comparison.</DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Find a run to compare"
          placeholder="Search experiments…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load experiments.
          </p>
        ) : list ? (
          <div className="grid gap-1">
            {list.names.map((name) => (
              <Button
                key={name}
                variant="ghost"
                className="h-auto justify-between whitespace-normal text-left wrap-anywhere"
                disabled={names.includes(name)}
                onClick={() => {
                  onPick(name);
                  setOpen(false);
                }}
              >
                {name}
                {names.includes(name) ? <Badge variant="secondary">Added</Badge> : <Plus />}
              </Button>
            ))}
            {!list.names.length && <p className="text-sm text-muted-foreground">No matching experiments.</p>}
          </div>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Loading experiments…
          </p>
        )}
        {list && list.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Previous run page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm">
              Page {page} of {list.totalPages}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Next run page"
              disabled={page >= list.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RunComparison {
  name: string;
  summary?: Experiment;
  tasks?: Map<string, ResultRow>;
}

function RunCard({
  run,
  index,
  comparisonPath,
  remove,
}: {
  run: RunComparison;
  index: number;
  comparisonPath: string;
  remove: () => void;
}) {
  const { name, summary, tasks } = run;
  const valid = summary && !summary.error ? summary : undefined;
  const pass = valid ? formatPercent(valid.tasks_passed, valid.total_tasks) : "—";
  const barWidth = valid?.total_tasks ? Math.min(100, (valid.tasks_passed / valid.total_tasks) * 100) : 0;
  const completed = valid ? formatPercent(valid.completed_tasks, valid.total_tasks) : "—";
  return (
    <Card className="compare-run" style={{ "--run-color": `var(--run-${index + 1})` } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          <i /> RUN {String(index + 1).padStart(2, "0")}
        </p>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} onClick={remove}>
          <X />
        </Button>
      </div>
      <h2>
        <Link to={dashboardPath(name)} state={{ comparisonPath }}>
          {name}
          <ArrowRight size={15} />
        </Link>
      </h2>
      {summary?.error && <p className="text-sm text-destructive">{summary.error}</p>}
      {!summary && <p className="text-sm text-muted-foreground">Run summary unavailable.</p>}
      <div className="compare-rate">
        <strong>{pass}</strong>
        <span>Pass rate</span>
      </div>
      <div className="compare-bar" aria-hidden="true">
        <span style={{ width: `${barWidth}%` }} />
      </div>
      <dl>
        <div>
          <dt>Completed</dt>
          <dd>
            {valid ? `${valid.completed_tasks} / ${valid.total_tasks}` : "—"} <small>({completed})</small>
          </dd>
        </div>
        <div>
          <dt>Score 0</dt>
          <dd>{valid?.tasks_failed_score_0.length ?? "—"}</dd>
        </div>
        <div>
          <dt>Exceptions</dt>
          <dd>{valid?.errored_tasks ?? "—"}</dd>
        </div>
        <div>
          <dt>Avg. steps</dt>
          <dd>{tasks ? average([...tasks.values()].map((row) => numberValue(row.num_steps))) : "—"}</dd>
        </div>
      </dl>
      {!tasks && <p className="text-sm text-muted-foreground">Task results unavailable.</p>}
    </Card>
  );
}

export default function CompareExperiments() {
  const [params, setParams] = useSearchParams();
  const key = JSON.stringify([...new Set(params.getAll("run").filter(Boolean))].slice(0, maxComparisonRuns));
  const names: string[] = useMemo(() => JSON.parse(key), [key]);
  const [loaded, setLoaded] = useState<{ key: string; runs: RunComparison[] }>();
  const comparisonPath = `/compare?${params}`;
  const query = params.get("q") ?? "";
  const changedOnly = params.get("changed") === "1";
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    if (!names.length) return;
    const controller = new AbortController();
    const summary = fetchLoggedExperiments(1, maxComparisonRuns, "", controller.signal, names).catch(
      () => undefined,
    );
    const tables = Promise.allSettled(names.map((name) => fetchDataTable(name, controller.signal)));
    void Promise.all([summary, tables]).then(([metadata, results]) => {
      if (controller.signal.aborted) return;
      setLoaded({
        key,
        runs: names.map((name, index) => {
          const result = results[index];
          return {
            name,
            summary:
              metadata && Object.hasOwn(metadata.experiments, name) ? metadata.experiments[name] : undefined,
            tasks:
              result.status === "fulfilled"
                ? new Map(
                    result.value.data
                      .filter((row) => row.task_id != null && String(row.task_id) !== "")
                      .map((row) => [String(row.task_id), row]),
                  )
                : undefined,
          };
        }),
      });
    });
    return () => controller.abort();
  }, [key, names]);

  function update(next: string[]) {
    const values = new URLSearchParams(params);
    values.delete("run");
    next.forEach((name) => values.append("run", name));
    setParams(values);
    setLimit(30);
  }

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(30);
  }

  const runs = loaded?.key === key ? loaded.runs : undefined;
  const allTasks = [...new Set(runs?.flatMap((run) => (run.tasks ? [...run.tasks.keys()] : [])))];
  const tasks = allTasks.map((id) => {
    const rows = runs!.map((run) => run.tasks?.get(id));
    const intent = rows.find((row) => row?.intent)?.intent;
    const outcomes = rows
      .filter((row) => row != null)
      .map((row) => {
        const status = outcome(row);
        return status === "Scored" ? `Score ${numberValue(row.score)}` : status;
      });
    const changed = new Set(outcomes).size > 1;
    return { id, rows, intent, changed };
  });
  const filtered = tasks.filter(
    (task) =>
      (!changedOnly || task.changed) &&
      `${task.id} ${task.intent ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <PageHeading
        label="RUN ANALYSIS"
        title="Compare experiments"
        description="See how outcomes and step counts change across runs of the same tasks."
        actions={
          <>
            <BackLink to="/">Experiments</BackLink>
            <RunPicker names={names} onPick={(name) => update([...names, name])} />
          </>
        }
      />

      {!names.length ? (
        <Card>
          <EmptyState icon={GitCompareArrows} title="Choose runs to compare">
            <p>Add at least two experiments to see their results side by side.</p>
          </EmptyState>
        </Card>
      ) : !runs ? (
        <p role="status" className="loading-state">
          Loading comparison…
        </p>
      ) : (
        <>
          <div className="compare-grid">
            {runs.map((run, index) => (
              <RunCard
                key={run.name}
                run={run}
                index={index}
                comparisonPath={comparisonPath}
                remove={() => update(names.filter((name) => name !== run.name))}
              />
            ))}
          </div>
          <p className="comparison-note">
            Pass rate is score-1 tasks divided by planned tasks. Score 0 and exceptions can overlap.
          </p>
          {runs.length < 2 ? (
            <Card>
              <EmptyState icon={GitCompareArrows} title="Add a second run">
                <p>Task-by-task comparison is available once two runs are selected.</p>
              </EmptyState>
            </Card>
          ) : (
            <Card className="run-library">
              <div className="library-heading">
                <div>
                  <h2>Task comparison</h2>
                  <p>Matched by task ID. Open a result to inspect its trace.</p>
                </div>
                <Badge variant="secondary">
                  {tasks.filter((task) => task.changed).length} outcome changes
                </Badge>
              </div>
              <div className="library-tools">
                <div className="search-field">
                  <Search size={16} aria-hidden="true" />
                  <Input
                    aria-label="Search compared tasks"
                    placeholder="Search task ID or intent…"
                    value={query}
                    onChange={(event) => setFilter("q", event.target.value)}
                  />
                </div>
                <Button
                  variant={changedOnly ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={changedOnly}
                  onClick={() => setFilter("changed", changedOnly ? "" : "1")}
                >
                  Changed outcomes only
                </Button>
              </div>
              {filtered.length ? (
                <>
                  <Table className="matrix-table" aria-label="Task comparison">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        {runs.map(({ name }) => (
                          <TableHead key={name}>{name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.slice(0, limit).map((task) => (
                        <TableRow key={task.id} data-changed={task.changed || undefined}>
                          <TableCell>
                            <strong className="font-mono">{task.id}</strong>
                            {task.intent && <small title={String(task.intent)}>{task.intent}</small>}
                          </TableCell>
                          {task.rows.map((row, index) => {
                            const status = row && outcome(row);
                            const steps = row && numberValue(row.num_steps);
                            return (
                              <TableCell key={runs[index].name}>
                                {row && status ? (
                                  <Link
                                    to={tracePath(task.id, runs[index].name)}
                                    state={{ comparisonPath }}
                                    className="matrix-result"
                                  >
                                    <Badge className={`status-pill ${outcomeTone[status]}`}>
                                      <i />
                                      {status === "Scored" ? `Score ${row.score}` : status}
                                    </Badge>
                                    {steps != null && <span>{steps} steps</span>}
                                    <ArrowRight size={14} />
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {runs[index].tasks ? "No result" : "Unavailable"}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="library-footer">
                    <span>
                      Showing {Math.min(limit, filtered.length)} of {filtered.length} tasks
                    </span>
                    {limit < filtered.length && (
                      <Button variant="outline" size="sm" onClick={() => setLimit(limit + 30)}>
                        Show more
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={CircleAlert}
                  title={allTasks.length ? "No matching tasks" : "No task results to compare"}
                >
                  <p>
                    {allTasks.length
                      ? "Adjust the search or outcome filter."
                      : "Results will appear when recorded task data is available."}
                  </p>
                </EmptyState>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
