import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GitBranch,
  ListFilter,
  ListOrdered,
  ScrollText,
  Terminal,
} from "lucide-react";
import { fetchConfig, fetchTrajectoryData } from "../services/api";
import { parseJsonSafely } from "../utils/renderHelpers";
import { dashboardPath } from "../utils/routes";
import { numberValue, outcome, outcomeTone } from "../utils/results";
import { defaultStepConfigs } from "../utils/stepConfig";
import { BackLink, EmptyState, PageHeading } from "./Workspace";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const StepView = lazy(() => import("./StepView"));

interface TraceStep {
  name?: string | null;
  data?: unknown;
  current_url?: string;
  action_formatted?: string;
  observation_before?: string;
}

interface Trace {
  intent?: string;
  dataset_name?: string;
  score?: number | string | null;
  eval?: unknown;
  agent_answer?: string;
  steps?: TraceStep[];
  light_version?: boolean;
}

interface TraceConfig {
  stepsConfig?: Record<string, object>;
  processConfig?: Record<string, string[]>;
}

function stepSummary(step: TraceStep, keys: string[] = []) {
  const payload: unknown = parseJsonSafely(step.data);
  if (typeof payload === "string") return payload.trim();
  const configuredValue = (value: unknown, path = ""): string | undefined => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, item] of Object.entries(value)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (typeof item === "string" && item.trim() && (keys.includes(key) || keys.includes(fullPath)))
        return item.trim();
      const nested = configuredValue(item, fullPath);
      if (nested) return nested;
    }
  };
  const configured = keys.length ? configuredValue(payload) : undefined;
  if (configured) return configured;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const fields = payload as Record<string, unknown>;
    for (const key of ["summary", "tool_name", "action", "name", "task_description", "message", "error"]) {
      const value = fields[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return step.action_formatted || step.current_url || "";
}

function stepStyle(name: string) {
  if (/plan|decompos|analyz|reason/i.test(name)) return { icon: GitBranch, tone: "blue" };
  if (/tool|api|code|action/i.test(name)) return { icon: Terminal, tone: "neutral" };
  if (/answer|final/i.test(name)) return { icon: ScrollText, tone: "neutral" };
  return { icon: Braces, tone: "neutral" };
}

export default function TrajectoryViewer() {
  const { taskId = "", experiment } = useParams();
  const { state } = useLocation();
  const back = state?.comparisonPath
    ? { to: state.comparisonPath, label: "Back to comparison" }
    : { to: state?.resultsPath ?? dashboardPath(experiment), label: "Back to results" };
  const [params, setParams] = useSearchParams();
  const [trace, setTrace] = useState<Trace>();
  const [config, setConfig] = useState<TraceConfig>({});
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [expandedImages, setExpandedImages] = useState(new Set<string>());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const configuration = fetchConfig().catch(() => ({}));
    void Promise.all([fetchTrajectoryData(taskId, experiment, controller.signal), configuration])
      .then(([data, settings]) => {
        if (controller.signal.aborted) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          setError("The recorded trajectory is invalid.");
          return;
        }
        setTrace(data);
        setConfig(settings);
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [taskId, experiment, version]);

  const steps = Array.isArray(trace?.steps)
    ? trace.steps.map((step) => ({
        ...step,
        name: typeof step?.name === "string" && step.name.trim() ? step.name : "Unnamed step",
      }))
    : [];
  const score = numberValue(trace?.score);
  const stepTypes = [...new Set(steps.map((step) => step.name))];
  const visible = steps.flatMap((step, index) => (!filter || step.name === filter ? [{ step, index }] : []));
  const requested = Number.parseInt(params.get("step") ?? "1", 10) - 1;
  const active = visible.find(({ index }) => index === requested) ?? visible[0];
  const position = active ? visible.indexOf(active) : -1;
  const tab = params.get("view") === "flow" ? "flow" : "timeline";

  function update(step?: number, nextView = tab) {
    const next = new URLSearchParams(params);
    if (step != null) {
      if (step === 0) next.delete("step");
      else next.set("step", String(step + 1));
    }
    if (nextView === "flow") next.set("view", "flow");
    else next.delete("view");
    setParams(next, { state });
  }

  function toggleImage(id: string) {
    setExpandedImages((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeading
        label="TRACE INSPECTOR"
        title={`Task ${taskId}`}
        description="Follow the agent’s recorded actions, inputs, and observations."
        actions={
          <BackLink to={back.to} state={state?.resultsState}>
            {back.label}
          </BackLink>
        }
      />
      {error ? (
        <Card>
          <EmptyState icon={CircleAlert} title="Trajectory unavailable">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setVersion((value) => value + 1)}>
              Try again
            </Button>
          </EmptyState>
        </Card>
      ) : !trace ? (
        <p className="loading-state" role="status">
          Loading trajectory…
        </p>
      ) : (
        <>
          <Card className="trace-intent">
            <div>
              <p className="eyebrow">TASK INTENT</p>
              <h2>{trace.intent || "No intent recorded"}</h2>
            </div>
            <div className="trace-badges">
              <Badge variant="secondary">
                <ListOrdered /> {steps.length} {steps.length === 1 ? "step" : "steps"}
              </Badge>
              {!trace.light_version && trace.score != null && (
                <Badge
                  className={`status-pill ${score === null ? "neutral" : outcomeTone[outcome({ score })]}`}
                >
                  <Activity /> Score {trace.score}
                </Badge>
              )}
            </div>
          </Card>
          <Tabs value={tab} onValueChange={(value) => update(undefined, value)} className="results-tabs">
            <TabsList aria-label="Trace views" variant="line">
              <TabsTrigger value="timeline">
                <ListOrdered /> Timeline
              </TabsTrigger>
              <TabsTrigger value="flow">
                <GitBranch /> Process summary
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              {active ? (
                <div className="trace-grid">
                  <Card className="trace-timeline">
                    <div className="trace-panel-heading">
                      <div>
                        <h2>Execution steps</h2>
                        <p>
                          {visible.length} of {steps.length} steps
                        </p>
                      </div>
                    </div>
                    <label className="select-field trace-filter">
                      <ListFilter size={15} aria-hidden="true" />
                      <select
                        value={filter}
                        aria-label="Filter by step type"
                        onChange={(event) => setFilter(event.target.value)}
                      >
                        <option value="">All step types</option>
                        {stepTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <ol aria-label="Execution steps" className="timeline-list">
                      {visible.map(({ step, index }) => {
                        const { icon: Icon, tone } = stepStyle(step.name);
                        const summary = stepSummary(step, config.processConfig?.[step.name]);
                        return (
                          <li key={index}>
                            <button
                              type="button"
                              aria-current={active.index === index ? "step" : undefined}
                              onClick={() => update(index)}
                            >
                              <span className={`timeline-icon ${tone}`}>
                                <Icon size={15} />
                              </span>
                              <span className="timeline-label">
                                <strong>{step.name}</strong>
                                {summary && <small title={summary}>{summary}</small>}
                              </span>
                              <span className="timeline-step-position">
                                <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
                                {active.index === index && <span className="timeline-step-state">Selected</span>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </Card>
                  <Card className="trace-detail">
                    <div className="trace-panel-heading">
                      <div>
                        <p className="eyebrow">
                          STEP {String(active.index + 1).padStart(2, "0")} /{" "}
                          {String(steps.length).padStart(2, "0")}
                        </p>
                        <h2>Step details</h2>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Previous step"
                          disabled={position <= 0}
                          onClick={() => update(visible[position - 1].index)}
                        >
                          <ChevronLeft />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Next step"
                          disabled={position >= visible.length - 1}
                          onClick={() => update(visible[position + 1].index)}
                        >
                          <ChevronRight />
                        </Button>
                      </div>
                    </div>
                    <Suspense
                      fallback={
                        <p role="status" className="loading-state">
                          Loading step details…
                        </p>
                      }
                    >
                      <StepView
                        key={active.index}
                        step={active.step}
                        index={active.index}
                        config={config.stepsConfig ?? defaultStepConfigs}
                        expandedImages={expandedImages}
                        toggleImage={toggleImage}
                      />
                    </Suspense>
                  </Card>
                </div>
              ) : (
                <Card>
                  <EmptyState icon={ListOrdered} title="No steps recorded">
                    <p>This trace contains no execution steps.</p>
                  </EmptyState>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="flow">
              <Card className="process-summary">
                <div className="trace-panel-heading">
                  <div>
                    <h2>Process summary</h2>
                    <p>Recorded in execution order. Select a step to inspect its details.</p>
                  </div>
                </div>
                {steps.length ? (
                  <ol>
                    {steps.map((step, index) => {
                      const { icon: Icon, tone } = stepStyle(step.name);
                      const summary = stepSummary(step, config.processConfig?.[step.name]);
                      return (
                        <li key={index}>
                          <button
                            type="button"
                            onClick={() => {
                              setFilter("");
                              update(index, "timeline");
                            }}
                          >
                            <span className={`timeline-icon ${tone}`}>
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>
                                {index + 1}. {step.name}
                              </strong>
                              {summary && <small>{summary}</small>}
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="px-5 pb-5 text-sm text-muted-foreground">No steps recorded.</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
          {(trace.eval != null || trace.agent_answer) && (
            <Card className="trace-evaluation">
              <h2>Recorded outcome</h2>
              {trace.agent_answer && <p>{trace.agent_answer}</p>}
              {trace.eval != null && (
                <pre>{typeof trace.eval === "string" ? trace.eval : JSON.stringify(trace.eval, null, 2)}</pre>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
