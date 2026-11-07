import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  GitCompareArrows,
  Layers3,
  ListFilter,
  Search,
  TriangleAlert,
} from "lucide-react";
import { fetchDataTable } from "../services/api";
import { average, numberValue, outcome, outcomeTone, type Outcome } from "../utils/results";
import { comparisonPath, tracePath } from "../utils/routes";
import { BackLink, EmptyState, Metric, PageHeading } from "./Workspace";
import ResultsTable from "./dashboard/ResultsTable";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const outcomes: Outcome[] = ["Passed", "Failed", "Error", "Scored", "Unscored"];
const pageSize = 30;

function RunResults({ experiment }: { experiment?: string }) {
  const [response, setResponse] = useState<Awaited<ReturnType<typeof fetchDataTable>>>();
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const back = state?.comparisonPath
    ? { to: state.comparisonPath, label: "Back to comparison" }
    : { to: state?.experimentsPath ?? "/", label: "Experiments" };
  const search = params.get("q") ?? "";
  const filter = params.get("outcome") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "", 10) || 1);
  const resultsPath = `/dashboard${params.size ? `?${params}` : ""}`;
  const view = params.get("view") === "fields" ? "fields" : "tasks";

  useEffect(() => {
    const controller = new AbortController();
    setResponse(undefined);
    setError(false);
    fetchDataTable(experiment, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResponse(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [experiment, version]);

  function update(changes: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace, state });
  }

  const rows = response?.data ?? [];
  const visible = rows.filter(
    (row) =>
      (!filter || outcome(row) === filter) &&
      [row.task_id, row.intent, row.site].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const shown = visible.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <>
      <PageHeading
        label={experiment ? "EXPERIMENT RESULTS" : "TRAJECTORY LOGS"}
        title={experiment ?? "Task results"}
        description="Review recorded outcomes and open a task to inspect the agent’s decisions."
        actions={
          experiment && (
            <>
              <BackLink to={back.to}>{back.label}</BackLink>
              <Button asChild>
                <Link to={comparisonPath([experiment])}>
                  <GitCompareArrows /> Compare run
                </Link>
              </Button>
            </>
          )
        }
      />

      {error ? (
        <Card>
          <EmptyState icon={CircleAlert} title="Results unavailable">
            <p>Could not load results.csv for this run.</p>
            <Button variant="outline" onClick={() => setVersion((value) => value + 1)}>
              Try again
            </Button>
          </EmptyState>
        </Card>
      ) : !response ? (
        <p role="status" className="loading-state">
          Loading results…
        </p>
      ) : (
        <>
          <div className="metric-grid">
            <Metric
              icon={Layers3}
              tone="blue"
              label="Recorded tasks"
              value={rows.length}
              detail="Rows in this result set"
            />
            <Metric
              icon={CheckCircle2}
              tone="green"
              label="Passed"
              value={rows.filter((row) => outcome(row) === "Passed").length}
              detail="Score 1 without an exception"
            />
            <Metric
              icon={TriangleAlert}
              tone="red"
              label="Exceptions"
              value={rows.filter((row) => outcome(row) === "Error").length}
              detail="Tasks with a recorded exception"
            />
            <Metric
              icon={Activity}
              tone="neutral"
              label="Avg. steps"
              value={average(rows.map((row) => numberValue(row.num_steps)))}
              detail="Across tasks with step counts"
            />
          </div>
          <Tabs
            value={view}
            onValueChange={(value) => update({ view: value === "fields" ? "fields" : "" }, true)}
            className="results-tabs"
          >
            <TabsList aria-label="Result views" variant="line">
              <TabsTrigger value="tasks">Task overview</TabsTrigger>
              <TabsTrigger value="fields">Recorded fields</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
              <Card className="run-library">
                <div className="library-heading">
                  <div>
                    <h2>Tasks</h2>
                    <p>Search by task ID, intent, or site.</p>
                  </div>
                  <Badge variant="secondary">{visible.length} results</Badge>
                </div>
                <div className="library-tools">
                  <div className="search-field">
                    <Search size={16} aria-hidden="true" />
                    <Input
                      aria-label="Search tasks"
                      placeholder="Search tasks…"
                      value={search}
                      onChange={(event) => update({ q: event.target.value, page: "" }, true)}
                    />
                  </div>
                  <label className="select-field">
                    <ListFilter size={16} aria-hidden="true" />
                    <select
                      aria-label="Filter by outcome"
                      value={filter}
                      onChange={(event) => update({ outcome: event.target.value, page: "" }, true)}
                    >
                      <option value="">All outcomes</option>
                      {outcomes.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {shown.length ? (
                  <Table className="task-results-table" aria-label="Task results">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>
                          <span className="sr-only">Inspect</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((row, index) => {
                        const id = row.task_id == null ? null : String(row.task_id);
                        const status = outcome(row);
                        return (
                          <TableRow key={`${id ?? "task"}-${index}`}>
                            <TableCell className="font-mono">
                              {id ? (
                                <Link
                                  className="table-link"
                                  to={tracePath(id, experiment)}
                                  state={{ resultsPath, resultsState: state }}
                                >
                                  {id}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="task-intent">{row.intent || "—"}</TableCell>
                            <TableCell>{row.site || "—"}</TableCell>
                            <TableCell>
                              <Badge className={`status-pill ${outcomeTone[status]}`}>
                                <i />
                                {status === "Scored" ? `Score ${row.score}` : status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{row.num_steps ?? "—"}</TableCell>
                            <TableCell>
                              {id && (
                                <Button asChild variant="ghost" size="icon-sm">
                                  <Link
                                    aria-label={`Inspect task ${id}`}
                                    to={tracePath(id, experiment)}
                                    state={{ resultsPath, resultsState: state }}
                                  >
                                    <ArrowRight />
                                  </Link>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={ListFilter}
                    title={rows.length ? "No matching tasks" : "No tasks recorded"}
                  >
                    {rows.length ? (
                      <Button variant="outline" onClick={() => update({ q: "", outcome: "", page: "" })}>
                        Clear filters
                      </Button>
                    ) : (
                      <p>Task results will appear when they are recorded.</p>
                    )}
                  </EmptyState>
                )}
                {totalPages > 1 && (
                  <div className="library-footer">
                    <span>
                      Page {activePage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage <= 1}
                        onClick={() => update({ page: String(activePage - 1) })}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage >= totalPages}
                        onClick={() => update({ page: String(activePage + 1) })}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="fields">
              <Card className="recorded-fields">
                <ResultsTable
                  data={rows}
                  columns={response.columns}
                  columnConfig={response.columnConfig}
                  experimentName={experiment}
                  resultsPath={resultsPath}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
}

export default function Dashboard() {
  const [params] = useSearchParams();
  const experiment = params.get("experiment") || undefined;
  return <RunResults key={experiment ?? ""} experiment={experiment} />;
}
