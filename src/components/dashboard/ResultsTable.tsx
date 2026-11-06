import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Braces, ListFilter } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { tracePath } from "../../utils/routes";
import { type ResultRow } from "../../utils/results";
import { EmptyState } from "../Workspace";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type Value = ResultRow[string];

interface ColumnConfig {
  hidden?: boolean;
  position?: number;
  filterable?: boolean;
  isCategorical?: boolean;
  maxTextLength?: number;
  valueTransform?: string | ((value: Value) => Value);
  backgroundColorConfig?:
    | { type: "range"; ranges: { min: number; max: number; color: string }[] }
    | { type: "categorical"; categories: Record<string, string> }
    | null;
}

function transformedValue(value: Value, config?: ColumnConfig) {
  const transform = config?.valueTransform;
  if (!transform) return value;
  try {
    // Column transforms are supplied by the local server's column configuration.
    const callback = typeof transform === "string" ? new Function(`return (${transform})`)() : transform;
    return callback(value);
  } catch {
    return value;
  }
}

function backgroundColor(value: Value, config?: ColumnConfig) {
  const colors = config?.backgroundColorConfig;
  if (colors?.type === "range" && typeof value === "number") {
    return colors.ranges.find((range) => value >= range.min && value <= range.max)?.color;
  }
  if (colors?.type === "categorical") return colors.categories[String(value)];
}

function RecordedValue({
  value,
  column,
  maxLength = 100,
}: {
  value: Value;
  column: string;
  maxLength?: number;
}) {
  if (value == null || value === "") return "—";
  const text = String(value);
  if (text.length <= maxLength) return text;
  let fullText = text;
  let json = false;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      fullText = JSON.stringify(parsed, null, 2);
      json = true;
    }
  } catch {
    /* Plain text */
  }
  return (
    <div className="max-w-[42ch] min-w-32 whitespace-normal wrap-anywhere">
      {text.slice(0, maxLength)}…
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            {json && <Braces />}
            {json ? "View JSON" : "Read more"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{column}</DialogTitle>
            <DialogDescription>Recorded field value</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[65vh] overflow-auto">{fullText}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResultsTable({
  data,
  columns,
  columnConfig,
  experimentName,
  resultsPath,
}: {
  data: ResultRow[];
  columns: string[];
  columnConfig: Record<string, unknown>;
  experimentName?: string;
  resultsPath?: string;
}) {
  const config = columnConfig as Record<string, ColumnConfig>;
  const { state } = useLocation();
  const [params, setParams] = useSearchParams();
  const sorting = params.get("field-sort");
  const [limit, setLimit] = useState(40);
  const visible = columns
    .filter((column) => !config[column]?.hidden)
    .sort((a, b) => (config[a]?.position ?? Infinity) - (config[b]?.position ?? Infinity));
  const taskColumn = columns.includes("task_id") ? "task_id" : visible[0];
  const filterable = visible.filter((column) => config[column]?.filterable);
  const ascending = params.get("field-order") !== "desc";
  const filtered = data.filter((row) =>
    filterable.every((column) => {
      const value = String(row[column] ?? "");
      if (config[column]?.isCategorical) {
        const selections = params.getAll(`category.${column}`);
        return !selections.length || selections.includes(value);
      }
      return value.toLowerCase().includes((params.get(`field.${column}`) ?? "").toLowerCase());
    }),
  );
  if (sorting && visible.includes(sorting)) {
    const column = sorting;
    filtered.sort((a, b) => {
      const left = a[column];
      const right = b[column];
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left ?? "").localeCompare(String(right ?? ""), undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return ascending ? order : -order;
    });
  }

  function updateParams(update: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    update(next);
    setLimit(40);
    setParams(next, { replace: true, state });
  }

  return (
    <>
      <div className="library-heading">
        <div>
          <h2>Recorded fields</h2>
          <p>Inspect the original result columns, including evaluation and agent answers.</p>
        </div>
      </div>
      <div className="recorded-filters">
        {filterable.map((column) => {
          const settings = config[column];
          const category = `category.${column}`;
          const field = `field.${column}`;
          const selected = params.getAll(category);
          const values = settings.isCategorical
            ? [...new Set(data.map((row) => row[column]))].filter((value) => value != null)
            : [];
          return (
            <div key={column}>
              <p className="eyebrow">{column}</p>
              {settings.isCategorical ? (
                <div className="flex flex-wrap gap-1">
                  {values.map((value) => {
                    const text = String(value);
                    const active = selected.includes(text);
                    return (
                      <Button
                        key={text}
                        size="sm"
                        variant={active ? "secondary" : "outline"}
                        aria-pressed={active}
                        onClick={() =>
                          updateParams((next) => {
                            if (active) next.delete(category, text);
                            else next.append(category, text);
                          })
                        }
                      >
                        {String(transformedValue(value, settings))}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  aria-label={`Filter ${column}`}
                  placeholder={`Filter ${column}…`}
                  value={params.get(field) ?? ""}
                  onChange={(event) =>
                    updateParams((next) => {
                      if (event.target.value) next.set(field, event.target.value);
                      else next.delete(field);
                    })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
      {filtered.length ? (
        <>
          <Table className="recorded-table" aria-label="Recorded result fields">
            <TableHeader>
              <TableRow>
                {visible.map((column) => {
                  const active = sorting === column;
                  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <TableHead
                      key={column}
                      aria-sort={active ? (ascending ? "ascending" : "descending") : undefined}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateParams((next) => {
                            next.set("field-sort", column);
                            next.set("field-order", active && ascending ? "desc" : "asc");
                          })
                        }
                      >
                        {column}
                        <Icon />
                      </Button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, limit).map((row, index) => (
                <TableRow key={index}>
                  {visible.map((column) => {
                    const value = row[column];
                    const settings = config[column];
                    const color = backgroundColor(value, settings);
                    return (
                      <TableCell key={column} style={color ? { backgroundColor: color } : undefined}>
                        {column === taskColumn && value != null && value !== "" ? (
                          <Link
                            className="table-link font-mono"
                            to={tracePath(String(value), experimentName)}
                            state={{ resultsPath, resultsState: state }}
                          >
                            {String(value)}
                          </Link>
                        ) : (
                          <RecordedValue
                            value={transformedValue(value, settings)}
                            column={column}
                            maxLength={settings?.maxTextLength}
                          />
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
              Showing {Math.min(limit, filtered.length)} of {filtered.length} results
            </span>
            {limit < filtered.length && (
              <Button variant="outline" size="sm" onClick={() => setLimit(limit + 40)}>
                Show more
              </Button>
            )}
          </div>
        </>
      ) : (
        <EmptyState icon={ListFilter} title={data.length ? "No matching results" : "No recorded results"}>
          {data.length ? (
            <Button
              variant="outline"
              onClick={() =>
                updateParams((next) => {
                  for (const column of filterable) {
                    next.delete(`category.${column}`);
                    next.delete(`field.${column}`);
                  }
                })
              }
            >
              Clear filters
            </Button>
          ) : (
            <p>Result fields will appear here when data is recorded.</p>
          )}
        </EmptyState>
      )}
    </>
  );
}
