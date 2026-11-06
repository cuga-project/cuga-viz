import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FlaskConical,
  GitCompareArrows,
  GitMerge,
  Layers3,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  deleteExperiment,
  downloadExperiment,
  fetchFailedTasks,
  fetchLoggedExperiments,
  fetchUncompletedTasks,
  joinExperiments,
} from "../services/api";
import { comparisonPath, dashboardPath } from "../utils/routes";
import { formatPercent, maxComparisonRuns, type Experiment, type ExperimentPage } from "../utils/results";
import { EmptyState, Metric } from "./Workspace";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

const pageSize = 15;
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
type TaskList = { name: string; label: string; ids: (string | number)[] };

function getStatus(run: Experiment) {
  if (run.error) return ["Unavailable", "red"];
  if (!run.total_tasks) return ["No tasks", "neutral"];
  if (run.completed_tasks < run.total_tasks) return ["In progress", "amber"];
  return ["Complete", "green"];
}

function TraceIllustration() {
  return (
    <svg className="hero-art" viewBox="0 0 480 208" fill="none" aria-hidden="true">
      <defs>
        <pattern id="trace-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#dbe5cf" opacity=".2" />
        </pattern>
        <linearGradient id="trace-wash">
          <stop stopColor="#222a1f" stopOpacity="0" />
          <stop offset="1" stopColor="#8da16c" stopOpacity=".22" />
        </linearGradient>
      </defs>
      <path d="M0 0h480v208H0z" fill="url(#trace-dots)" />
      <path d="M0 0h480v208H0z" fill="url(#trace-wash)" />
      <path
        d="M36 110h55q10 0 10-10V69q0-10 10-10h94q10 0 10 10v38q0 10 10 10h76q10 0 10-10V79q0-10 10-10h90"
        stroke="#d7f18a"
        strokeWidth="2"
      />
      <path
        d="M101 110v30q0 10 10 10h123q10 0 10 10v8q0 10 10 10h115"
        stroke="#9aa889"
        strokeDasharray="4 5"
      />
      <path d="M311 113v30q0 10 10 10h108" stroke="#9aa889" strokeDasharray="4 5" />
      <g fill="#283223" stroke="#d7f18a" strokeWidth="2">
        <circle cx="101" cy="110" r="6" />
        <circle cx="215" cy="59" r="6" />
        <circle cx="311" cy="117" r="6" />
      </g>
      <circle cx="411" cy="69" r="13" fill="#d7f18a" />
      <path
        d="m406 69 3 3 6-6"
        stroke="#273119"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#c5d3b3" fontSize="10" fontFamily="monospace" letterSpacing="1">
        <text x="112" y="91">
          PLAN
        </text>
        <text x="227" y="55">
          ACT
        </text>
        <text x="330" y="57">
          OBSERVE
        </text>
      </g>
    </svg>
  );
}

function TaskExport({ list, close }: { list: TaskList; close: () => void }) {
  const [parts, setParts] = useState(1);
  const [copyState, setCopyState] = useState("");
  const chunkSize = Math.max(1, Math.ceil(list.ids.length / parts));
  const cleanName = list.name.replace(/_\d{2}-\d{2}--\d{2}h\d{2}m\d{2}s\d{3}ms$/, "");
  const chunks =
    parts === 1 || !list.ids.length
      ? [list.ids]
      : Array.from({ length: Math.ceil(list.ids.length / chunkSize) }, (_, index) =>
          list.ids.slice(index * chunkSize, (index + 1) * chunkSize),
        );
  const code = chunks
    .map(
      (ids, index) =>
        `${cleanName}${parts > 1 ? `_${String.fromCharCode(97 + index)}` : ""} = ${JSON.stringify(ids)}`,
    )
    .join("\n\n");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{list.label}</DialogTitle>
          <DialogDescription>
            {list.name} · {list.ids.length} task IDs
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-3 text-sm">
          Split into
          <Input
            className="w-20"
            type="number"
            min={1}
            max={26}
            value={parts}
            onChange={(event) => {
              setParts(Math.min(26, Math.max(1, Number.parseInt(event.target.value) || 1)));
              setCopyState("");
            }}
          />
          parts
        </label>
        <pre className="max-h-72 overflow-auto">{code}</pre>
        <DialogFooter>
          <span role="status" className="self-center text-sm text-muted-foreground">
            {copyState}
          </span>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopyState("Copied");
              } catch {
                setCopyState("Copy failed. Select and copy the text above.");
              }
            }}
          >
            Copy task IDs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExperimentManager({
  selected,
  setSelected,
}: {
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
}) {
  const [params, setParams] = useSearchParams();
  const experimentsPath = params.size ? `/?${params}` : "/";
  const search = params.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "", 10) || 1);
  const [data, setData] = useState<ExperimentPage>();
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [action, setAction] = useState<"join" | "delete">();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [taskList, setTaskList] = useState<TaskList>();

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const result = await fetchLoggedExperiments(page, pageSize, search, controller.signal);
        if (controller.signal.aborted) return;
        setData(result);
        setError("");
        if (page > result.pagination.total_pages) {
          setParams(
            (current) => {
              const next = new URLSearchParams(current);
              next.delete("page");
              return next;
            },
            { replace: true },
          );
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Could not load experiments. Check the local CugaViz server and try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    let timer: number;
    const poll = async (showLoading: boolean) => {
      await refresh(showLoading);
      if (!controller.signal.aborted) timer = window.setTimeout(() => void poll(false), 30_000);
    };
    void poll(true);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [page, search, version, setParams]);

  function updateList(nextSearch: string, nextPage: number, replace = false) {
    const next = new URLSearchParams();
    if (nextSearch) next.set("q", nextSearch);
    if (nextPage > 1) next.set("page", String(nextPage));
    setParams(next, { replace });
  }

  async function manageRuns() {
    setBusy(true);
    setActionError("");
    try {
      if (action === "join") await joinExperiments(selected, name.trim());
      if (action === "delete") {
        const result = await deleteExperiment(selected);
        if (result.failed_deletions?.length) setActionError(result.message);
      }
      setSelected([]);
      setAction(undefined);
      if (action === "join") updateList("", 1);
      setVersion((value) => value + 1);
    } catch {
      setActionError(
        action === "join"
          ? "Could not join the selected experiments."
          : "Could not delete the selected experiments.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadTaskList(run: string, failed: boolean) {
    setActionError("");
    try {
      const result = failed ? await fetchFailedTasks(run) : await fetchUncompletedTasks(run);
      setTaskList({
        name: run,
        label: failed ? "Failed tasks" : "Uncompleted tasks",
        ids: (failed ? result.failed_tasks : result.uncompleted_tasks) ?? [],
      });
    } catch {
      setActionError(`Could not load the task IDs for ${run}.`);
    }
  }

  async function download(run: string) {
    setActionError("");
    try {
      const blob = await downloadExperiment(run);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${run}.zip`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setActionError(`Could not download ${run}.`);
    }
  }

  const runs = Object.entries(data?.experiments ?? {});
  const visibleNames = runs.map(([runName]) => runName);
  const visibleSelection = visibleNames.filter((runName) => selected.includes(runName)).length;
  const canCompare = selected.length <= maxComparisonRuns;
  const valid = runs.map(([, run]) => run).filter((run) => !run.error);
  const total = valid.reduce((sum, run) => sum + run.total_tasks, 0);
  const passed = valid.reduce((sum, run) => sum + run.tasks_passed, 0);
  const errors = valid.reduce((sum, run) => sum + run.errored_tasks, 0);

  return (
    <>
      <div className="workspace-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Activity size={14} /> AGENT WORKSPACE
          </p>
          <h1>Experiments</h1>
          <p>Inspect agent runs, compare outcomes, and follow every step.</p>
        </div>
        <TraceIllustration />
      </div>

      <div className="metric-grid">
        <Metric
          icon={FlaskConical}
          tone="amber"
          label="Experiments"
          value={data?.pagination.total_items ?? "—"}
          detail={search ? "Matching your search" : "Recorded in this workspace"}
        />
        <Metric
          icon={Layers3}
          tone="neutral"
          label="Tasks"
          value={data && valid.length ? total.toLocaleString() : "—"}
          detail="Planned across visible runs"
        />
        <Metric
          icon={CheckCircle2}
          tone="green"
          label="Pass rate"
          value={formatPercent(passed, total)}
          detail="Passed / planned in visible runs"
        />
        <Metric
          icon={TriangleAlert}
          tone="red"
          label="Exceptions"
          value={data && valid.length ? errors.toLocaleString() : "—"}
          detail="Reported in visible runs"
        />
      </div>

      <Card className="run-library">
        <div className="library-heading">
          <div>
            <h2>Run library</h2>
            <p>Open a run to inspect its tasks, or select up to {maxComparisonRuns} to compare.</p>
          </div>
          {canCompare ? (
            <Button asChild className="compare-cta">
              <Link to={comparisonPath(selected)}>
                <GitCompareArrows /> Compare runs {selected.length > 0 && <span>{selected.length}</span>}
              </Link>
            </Button>
          ) : (
            <Button disabled>
              <GitCompareArrows /> Compare up to {maxComparisonRuns} runs
            </Button>
          )}
        </div>
        <div className="library-tools">
          <div className="search-field">
            <Search size={16} aria-hidden="true" />
            <Input
              aria-label="Search experiments"
              placeholder="Search experiments…"
              value={search}
              onChange={(event) => updateList(event.target.value, 1, true)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <X /> Clear {selected.length}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setVersion((value) => value + 1)}
            >
              <RefreshCw /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Run management">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={selected.length < 2}
                  onSelect={() => {
                    setActionError("");
                    setName("");
                    setAction("join");
                  }}
                >
                  <GitMerge /> Join selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!selected.length}
                  onSelect={() => {
                    setActionError("");
                    setAction("delete");
                  }}
                >
                  <Trash2 /> Delete selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!action && actionError && (
          <p role="alert" className="inline-error">
            {actionError}
          </p>
        )}
        {error ? (
          <EmptyState icon={CircleAlert} title="Experiments unavailable">
            <p>{error}</p>
          </EmptyState>
        ) : loading && !data ? (
          <p role="status" className="loading-state">
            Loading experiments…
          </p>
        ) : runs.length ? (
          <Table className="runs-table" aria-label="Experiments" aria-busy={loading}>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    aria-label="Select all visible experiments"
                    checked={
                      visibleSelection === runs.length ? true : visibleSelection > 0 ? "indeterminate" : false
                    }
                    onCheckedChange={(on) =>
                      setSelected((current) =>
                        on
                          ? [...new Set([...current, ...visibleNames])]
                          : current.filter((value) => !visibleNames.includes(value)),
                      )
                    }
                  />
                </TableHead>
                <TableHead>Experiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Pass rate</TableHead>
                <TableHead>Exceptions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(([runName, run]) => {
                const [status, tone] = getStatus(run);
                const checked = selected.includes(runName);
                const complete = run.total_tasks
                  ? Math.min(100, (run.completed_tasks / run.total_tasks) * 100)
                  : 0;
                return (
                  <TableRow key={runName} data-state={checked ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${runName}`}
                        checked={checked}
                        onCheckedChange={(on) =>
                          setSelected((current) =>
                            on ? [...current, runName] : current.filter((value) => value !== runName),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="run-name">
                      <Link to={dashboardPath(runName)} state={{ experimentsPath }}>
                        {runName}
                        <ArrowUpRight size={13} />
                      </Link>
                      {run.error && <small className="block text-destructive">{run.error}</small>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`status-pill ${tone}`}>
                        <i />
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="completion-cell">
                      {run.error ? (
                        "—"
                      ) : (
                        <div>
                          <span>
                            {run.completed_tasks}{" "}
                            <span className="text-muted-foreground">/ {run.total_tasks}</span>
                          </span>
                          <Progress aria-label="Task completion" value={complete} className="h-1.5 w-19" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {run.error ? "—" : formatPercent(run.tasks_passed, run.total_tasks)}
                    </TableCell>
                    <TableCell>{run.error ? "—" : run.errored_tasks}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.created_at ? dateFormat.format(run.created_at * 1000) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link
                            to={dashboardPath(runName)}
                            state={{ experimentsPath }}
                            aria-label={`Open ${runName}`}
                          >
                            <ArrowRight />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${runName}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => void download(runName)}>
                              <Download /> Download ZIP
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => void loadTaskList(runName, true)}>
                              Failed tasks {!run.error && `(${run.tasks_failed_score_0.length})`}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void loadTaskList(runName, false)}>
                              Uncompleted tasks
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : loading ? (
          <p role="status" className="loading-state">
            Loading experiments…
          </p>
        ) : (
          <EmptyState
            icon={FlaskConical}
            title={search ? "No matching experiments" : "No experiments recorded"}
          >
            {search ? (
              <Button variant="outline" onClick={() => updateList("", 1)}>
                Clear search
              </Button>
            ) : (
              <p>
                Point <code>cuga-viz run</code> at a directory of recorded experiments.
              </p>
            )}
          </EmptyState>
        )}
        {data && !error && runs.length > 0 && (
          <div className="library-footer">
            <span>
              {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + runs.length} of{" "}
              {data.pagination.total_items} experiments
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1 || loading}
                onClick={() => updateList(search, page - 1)}
              >
                <ChevronLeft />
              </Button>
              <span>
                Page {page} of {data.pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= data.pagination.total_pages || loading}
                onClick={() => updateList(search, page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {taskList && <TaskExport list={taskList} close={() => setTaskList(undefined)} />}
      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setAction(undefined);
            setActionError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "join" ? "Join experiments" : "Delete experiments"}</DialogTitle>
            <DialogDescription>
              {action === "join"
                ? "Combine the selected runs into a new experiment."
                : "The selected experiment logs will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-32 list-disc overflow-auto pl-5 text-sm">
            {selected.map((run) => (
              <li key={run}>{run}</li>
            ))}
          </ul>
          {action === "join" && (
            <Input
              aria-label="New experiment name"
              placeholder="New experiment name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setAction(undefined);
                setActionError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={action === "delete" ? "destructive" : "default"}
              disabled={busy || (action === "join" && !name.trim())}
              onClick={() => void manageRuns()}
            >
              {busy ? "Working…" : action === "join" ? "Join experiments" : "Delete experiments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
