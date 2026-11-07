import {
  Activity,
  ArrowLeft,
  ChevronRight,
  FlaskConical,
  GitCompareArrows,
  LayoutList,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useMatch, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { maxComparisonRuns } from "../utils/results";
import { dashboardPath, comparisonPath } from "../utils/routes";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function Workspace({ selected }: { selected: string[] }) {
  const { search } = useLocation();
  const isHome = Boolean(useMatch("/"));
  const isDashboard = Boolean(useMatch("/dashboard"));
  const isComparison = Boolean(useMatch("/compare"));
  const experimentTrace = useMatch("/trajectories/:experiment/:taskId");
  const standaloneTrace = useMatch("/trajectories/:taskId");
  const trace = experimentTrace ?? standaloneTrace;
  const [params] = useSearchParams();
  const experiment = experimentTrace?.params.experiment ?? params.get("experiment") ?? undefined;
  const compareSelection = selected.length <= maxComparisonRuns ? selected : [];
  const isStandalone = (isDashboard || trace) && !experiment;

  return (
    <div className="workspace">
      <aside className="rail">
        <Link to={isStandalone ? "/dashboard" : "/"} className="brand">
          <span className="brand-mark">
            <Activity size={20} strokeWidth={2.4} />
          </span>
          <span>
            Cuga<span className="brand-accent">Viz</span>
            <small>Agent observability</small>
          </span>
        </Link>
        <nav aria-label="Workspace" className="rail-nav">
          <p className="eyebrow">WORKSPACE</p>
          {isStandalone ? (
            <NavLink to="/dashboard" className={trace ? "active" : undefined}>
              <LayoutList /> Results
            </NavLink>
          ) : (
            <>
              <NavLink to="/" end className={experiment ? "active" : undefined}>
                <FlaskConical /> Experiments
              </NavLink>
              <NavLink to={isComparison ? `/compare${search}` : comparisonPath(compareSelection)}>
                <GitCompareArrows /> Compare{" "}
                {compareSelection.length > 0 && <span>{compareSelection.length}</span>}
              </NavLink>
            </>
          )}
        </nav>
        <div className="rail-footer">
          <span /> Local workspace
        </div>
      </aside>

      <div className="workspace-body">
        <header className="topbar">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            {isStandalone ? (
              trace ? (
                <Link to="/dashboard">Results</Link>
              ) : (
                <span aria-current="page">Results</span>
              )
            ) : isHome ? (
              <span aria-current="page">Experiments</span>
            ) : (
              <Link to="/">Experiments</Link>
            )}
            {isComparison && (
              <>
                <ChevronRight />
                <span aria-current="page">Compare</span>
              </>
            )}
            {experiment && (
              <>
                <ChevronRight />
                {trace ? (
                  <Link to={dashboardPath(experiment)} title={experiment}>
                    {experiment}
                  </Link>
                ) : (
                  <span aria-current="page" title={experiment}>
                    {experiment}
                  </span>
                )}
              </>
            )}
            {trace && (
              <>
                <ChevronRight />
                <span aria-current="page">Task {trace.params.taskId}</span>
              </>
            )}
          </nav>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeading({
  label,
  title,
  description,
  actions,
}: {
  label: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

export function Metric({
  icon: Icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <Card className="metric">
      <div className="metric-top">
        <span className={`metric-icon ${tone}`}>
          <Icon size={17} />
        </span>
        {label}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="metric-icon blue">
        <Icon size={20} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export function BackLink({ to, state, children }: { to: string; state?: unknown; children: ReactNode }) {
  return (
    <Button asChild variant="outline">
      <Link to={to} state={state}>
        <ArrowLeft />
        {children}
      </Link>
    </Button>
  );
}
