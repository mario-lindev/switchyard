import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  AudioLines,
  Blocks,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CircleStop,
  Clock3,
  Cloud,
  Code2,
  Command,
  Copy,
  Database,
  ExternalLink,
  FileJson,
  Flag,
  FlaskConical,
  Gauge,
  GitBranch,
  Github,
  History,
  Layers,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Maximize2,
  Network,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutUpRight,
  Terminal,
  Timer,
  Unplug,
  Users,
  Workflow,
  X,
  Zap,
  AlertTriangle,
  CreditCard,
  ShoppingBag,
  Box,
  Fingerprint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  COHORTS,
  SCENARIOS,
  addEvent,
  completeRollback,
  evidence,
  failRollback,
  initialState,
  injectFailure,
  quantile,
  runHeadless,
  setFlag,
  startRun,
  step,
  summarizeCohorts,
} from "./engine";
import type {
  FlagKey,
  FlagSet,
  Guardrails,
  LabState,
  ScenarioId,
} from "./engine";

type Page =
  | "lab"
  | "replays"
  | "flags"
  | "guardrails"
  | "integrations"
  | "docs";
type Connection = {
  mode: "sandbox" | "flagsmith";
  configured?: boolean;
  environment?: string;
  endpoint?: string;
  message?: string;
  flags?: FlagSet;
  version?: string;
};
type SavedRun = { id: string; name: string; savedAt: string; state: LabState };
const FLAG_INFO: {
  key: FlagKey;
  name: string;
  description: string;
  icon: LucideIcon;
  tag: string;
}[] = [
  {
    key: "checkout_v2",
    name: "Checkout v2",
    description: "The new, faster checkout experience",
    icon: ShoppingBag,
    tag: "release",
  },
  {
    key: "smart_cache",
    name: "Smart cache",
    description: "Protect the database from traffic spikes",
    icon: Database,
    tag: "performance",
  },
  {
    key: "payment_retry",
    name: "Payment retry",
    description: "Retry a failed payment before giving up",
    icon: CreditCard,
    tag: "resilience",
  },
];
const PAGES: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "lab", label: "Release lab", icon: FlaskConical },
  { id: "replays", label: "Replays", icon: History },
  { id: "flags", label: "Feature flags", icon: Flag },
  { id: "guardrails", label: "Guardrails", icon: ShieldCheck },
];
const format = (n: number) => n.toLocaleString();
const seconds = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
const storageKey = "switchyard-runs-v1";
function readRuns(): SavedRun[] {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (r) =>
              r.state?.points &&
              r.state?.requests &&
              typeof r.state?.seed === "number",
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
function download(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} />
    </button>
  );
}
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function LineChart({
  values,
  secondValues,
  color = "#e65e36",
  threshold,
  height = 100,
  label = "Telemetry",
  empty = false,
  maxValue,
}: {
  values: number[];
  secondValues?: number[];
  color?: string;
  threshold?: number;
  height?: number;
  label?: string;
  empty?: boolean;
  maxValue?: number;
}) {
  const max =
    maxValue ??
    Math.max(...values, ...(secondValues ?? []), threshold ?? 0, 1) * 1.2;
  const path = (v: number[]) =>
    v
      .map(
        (n, i) =>
          `${i ? "L" : "M"}${(i / Math.max(v.length - 1, 1)) * 600},${height - 10 - (n / max) * (height - 24)}`,
      )
      .join(" ");
  const line = path(values);
  return (
    <svg
      className="line-chart"
      viewBox={`0 0 600 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      {[0.25, 0.5, 0.75, 1].map((y) => (
        <line
          key={y}
          x1="0"
          x2="600"
          y1={y * (height - 12)}
          y2={y * (height - 12)}
          stroke="var(--line)"
          strokeDasharray="3 5"
        />
      ))}
      {threshold !== undefined && (
        <line
          x1="0"
          x2="600"
          y1={height - 10 - (threshold / max) * (height - 24)}
          y2={height - 10 - (threshold / max) * (height - 24)}
          stroke="#d54e4e"
          strokeDasharray="5 5"
          opacity=".55"
        />
      )}
      {!empty && values.length > 1 && (
        <>
          <path
            d={`${line} L600,${height} L0,${height}Z`}
            fill={color}
            opacity=".065"
          />
          <path
            d={line}
            stroke={color}
            strokeWidth="2"
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {secondValues && (
            <path
              d={path(secondValues)}
              stroke="#7f8c9d"
              strokeWidth="2"
              strokeDasharray="5 4"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      )}
    </svg>
  );
}

function Topology({
  state,
  selected,
  onSelect,
  large,
  onExpand,
}: {
  state: LabState;
  selected: string | null;
  onSelect: (id: string) => void;
  large: boolean;
  onExpand: () => void;
}) {
  const latest = state.points.at(-1);
  const active = state.phase === "running";
  const failing =
    state.chaos &&
    ((state.scenario === "checkout-regression" && state.flags.checkout_v2) ||
      (state.scenario === "payment-outage" && !state.flags.payment_retry) ||
      (state.scenario === "cache-stampede" && !state.flags.smart_cache));
  const faultService =
    state.scenario === "payment-outage"
      ? "payments"
      : state.scenario === "cache-stampede"
        ? "database"
        : "checkout";
  const nodes: {
    id: string;
    label: string;
    kind: string;
    icon: LucideIcon;
    x: number;
    y: number;
    latency: number;
  }[] = [
    {
      id: "gateway",
      label: "API Gateway",
      kind: "entrypoint",
      icon: Network,
      x: 70,
      y: 180,
      latency: 12,
    },
    {
      id: "auth",
      label: "Auth",
      kind: "service",
      icon: Fingerprint,
      x: 280,
      y: 80,
      latency: 18,
    },
    {
      id: "catalog",
      label: "Catalog",
      kind: "service",
      icon: Box,
      x: 280,
      y: 280,
      latency: 34,
    },
    {
      id: "checkout",
      label: "Checkout",
      kind: "checkout_v2",
      icon: ShoppingBag,
      x: 490,
      y: 180,
      latency: state.flags.checkout_v2 ? 47 : 62,
    },
    {
      id: "payments",
      label: "Payments",
      kind: "payment_retry",
      icon: CreditCard,
      x: 700,
      y: 80,
      latency: 85,
    },
    {
      id: "orders",
      label: "Orders",
      kind: "service",
      icon: Layers,
      x: 700,
      y: 280,
      latency: 26,
    },
    {
      id: "database",
      label: "Postgres",
      kind: "smart_cache",
      icon: Database,
      x: 910,
      y: 180,
      latency: 16,
    },
  ];
  const paths = [
    { id: "gateway-auth", d: "M140 215 C210 215 210 115 280 115", bad: false },
    {
      id: "gateway-catalog",
      d: "M140 215 C210 215 210 315 280 315",
      bad: false,
    },
    {
      id: "auth-checkout",
      d: "M420 115 C455 115 455 215 490 215",
      bad: failing && faultService === "checkout",
    },
    {
      id: "catalog-checkout",
      d: "M420 315 C455 315 455 215 490 215",
      bad: failing && faultService === "checkout",
    },
    {
      id: "checkout-payments",
      d: "M630 215 C665 215 665 115 700 115",
      bad:
        failing && (faultService === "checkout" || faultService === "payments"),
    },
    {
      id: "checkout-orders",
      d: "M630 215 C665 215 665 315 700 315",
      bad: failing && faultService === "checkout",
    },
    {
      id: "payments-database",
      d: "M840 115 C875 115 875 215 910 215",
      bad:
        failing && (faultService === "payments" || faultService === "database"),
    },
    {
      id: "orders-database",
      d: "M840 315 C875 315 875 215 910 215",
      bad: failing && faultService === "database",
    },
  ];
  return (
    <section className={`panel topology-panel ${large ? "expanded" : ""}`}>
      <div className="panel-heading">
        <div className="panel-title">
          <Workflow size={17} />
          <h2>Service topology</h2>
          <span className="count">7</span>
        </div>
        <div className="heading-actions">
          <span className="small-muted">Synthetic storefront</span>
          <IconButton
            icon={large ? X : Maximize2}
            label={large ? "Close expanded topology" : "Expand topology"}
            onClick={onExpand}
          />
        </div>
      </div>
      <div
        className={`topology-canvas ${active ? "is-running" : ""} ${failing ? "has-failure" : ""}`}
      >
        <div className="map-annotation">
          <span className={`status-dot ${active ? "green" : "slate"}`} />
          {active
            ? "Traffic flowing"
            : state.phase === "completed"
              ? "Rehearsal complete"
              : state.elapsed
                ? "Rehearsal paused"
                : "Ready for traffic"}
          <span className="annotation-rule" />
          <span>{state.rollout}% candidate</span>
        </div>
        <div
          className={`mobile-request-path ${active ? "flowing" : ""}`}
          aria-label="Synthetic request path"
        >
          {[
            { id: "gateway", label: "Gateway", icon: Network },
            { id: "checkout", label: "Checkout", icon: ShoppingBag },
            { id: "payments", label: "Payments", icon: CreditCard },
            { id: "database", label: "Postgres", icon: Database },
          ].map((node, index) => (
            <div
              key={node.id}
              className={`mobile-path-step ${failing && node.id === faultService ? "degraded" : ""}`}
            >
              <node.icon size={13} />
              <span>{node.label}</span>
              {index < 3 && (
                <span className="mobile-path-connector">
                  <ChevronRight size={12} />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="topology-drawing">
          <svg
            viewBox="0 0 1100 420"
            className="connections"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="dots"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r=".7" fill="#ced4dd" />
              </pattern>
            </defs>
            <rect width="1100" height="420" fill="url(#dots)" />
            {paths.map((p, i) => (
              <g key={p.id}>
                <path
                  id={p.id}
                  d={p.d}
                  fill="none"
                  stroke={p.bad ? "#e4a6a1" : "#cbd3dc"}
                  strokeWidth="1.5"
                />
                {active && (
                  <>
                    <circle r="3" fill={p.bad ? "#d54e4e" : "#e87850"}>
                      <animateMotion
                        dur={`${1.7 + i * 0.13}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.18}s`}
                        path={p.d}
                      />
                    </circle>
                    <circle
                      r="2"
                      fill={p.bad ? "#d54e4e" : "#e87850"}
                      opacity=".6"
                    >
                      <animateMotion
                        dur={`${1.7 + i * 0.13}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.18 + 0.9}s`}
                        path={p.d}
                      />
                    </circle>
                  </>
                )}
              </g>
            ))}
          </svg>
          {nodes.map((n) => {
            const bad = failing && n.id === faultService;
            const warmed = state.chaos && n.id === faultService && !bad;
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                className={`service-node ${bad ? "unhealthy" : ""} ${selected === n.id ? "selected" : ""}`}
                style={{
                  left: `${(n.x / 1100) * 100}%`,
                  top: `${(n.y / 420) * 100}%`,
                  width: `${(140 / 1100) * 100}%`,
                }}
                onClick={() => onSelect(n.id)}
                aria-label={`Inspect ${n.label}`}
              >
                <div className="node-top">
                  <Icon size={18} />
                  <span
                    className={`status-dot ${bad ? "red" : warmed ? "orange" : "green"}`}
                  />
                </div>
                <strong>{n.label}</strong>
                <span className="node-kind">{n.kind}</span>
                <div className="node-bottom">
                  <span>
                    {bad ? Math.round((latest?.p95 ?? 800) * 0.8) : n.latency}
                    <small> ms</small>
                  </span>
                  <span className={bad ? "bad-text" : "good-text"}>
                    {bad ? "degraded" : "healthy"}
                  </span>
                </div>
              </button>
            );
          })}
          <div className="edge-label edge-label-1">HTTPS</div>
          <div className="edge-label edge-label-2">flag evaluation</div>
          <div className="edge-label edge-label-3">SQL</div>
        </div>
        {selected ? (
          <div className="node-inspector">
            <span>
              <strong>{nodes.find((n) => n.id === selected)?.label}</strong> ·{" "}
              {selected === faultService && failing
                ? "Failure detected in synthetic traffic."
                : "Synthetic service responding normally."}
            </span>
            <IconButton
              icon={X}
              label="Close service details"
              onClick={() => onSelect("")}
            />
          </div>
        ) : (
          <div className="map-hint">Select a service to inspect its health</div>
        )}
        <div className="map-legend">
          <span>
            <i className="legend-line" />
            Request path
          </span>
          <span>
            <i className="legend-dot" />
            Healthy
          </span>
          <span>
            <i className="legend-dot red" />
            Degraded
          </span>
        </div>
      </div>
      <div className="topology-footer">
        <span>
          <ShieldCheck size={14} /> Isolated from production
        </span>
        <span>
          <Code2 size={14} /> Deterministic · seed {state.seed}
        </span>
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("lab");
  const [state, setState] = useState<LabState>(() => initialState());
  const [connection, setConnection] = useState<Connection>({ mode: "sandbox" });
  const [busy, setBusy] = useState(false);
  const [flagBusy, setFlagBusy] = useState<FlagKey | null>(null);
  const [toast, setToast] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>(readRuns);
  const [speed, setSpeed] = useState(1);
  const [telemetryTab, setTelemetryTab] = useState<"latency" | "errors">(
    "latency",
  );
  const [compare, setCompare] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rollbackInFlight = useRef(false);
  const commandRef = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const checkConnection = useCallback(async () => {
    setConnectionLoading(true);
    try {
      const res = await fetch("/api/connection", {
        signal: AbortSignal.timeout(10000),
      });
      if (
        !res.ok ||
        !res.headers.get("content-type")?.includes("application/json")
      )
        throw new Error("No local adapter");
      const data: Connection = await res.json();
      setConnection(data);
      if (data.mode === "flagsmith" && data.flags) {
        setState((s) => ({
          ...s,
          flags: data.flags!,
          flagSource: "flagsmith",
        }));
      }
      return data;
    } catch {
      setConnection({
        mode: "sandbox",
        message:
          "The browser sandbox is ready. Run the Node adapter to connect self-hosted Flagsmith.",
      });
      return null;
    } finally {
      setConnectionLoading(false);
    }
  }, []);
  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);
  useEffect(() => {
    if (state.phase !== "running") return;
    const t = setInterval(() => setState((s) => step(s)), 1000 / speed);
    return () => clearInterval(t);
  }, [state.phase, speed]);
  useEffect(() => {
    if (!state.rollbackPending || rollbackInFlight.current) return;
    rollbackInFlight.current = true;
    const rollback = async () => {
      try {
        if (state.flagSource === "flagsmith") {
          const res = await fetch("/api/flags/checkout_v2", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: false }),
            signal: AbortSignal.timeout(15000),
          });
          const body = await res.json();
          if (!res.ok)
            throw new Error(body.error ?? "Flagsmith rejected the rollback");
          if (body.enabled !== false)
            throw new Error(
              "Flagsmith did not confirm checkout_v2 is disabled",
            );
        }
        setState((s) => completeRollback(s));
        notify("Guardrail caught it. Checkout v2 has been rolled back.");
      } catch (e) {
        setState((s) =>
          failRollback(
            s,
            e instanceof Error
              ? e.message
              : "The flag update failed. Check your adapter.",
          ),
        );
      } finally {
        rollbackInFlight.current = false;
      }
    };
    void rollback();
  }, [state.rollbackPending, state.flagSource, notify]);
  useEffect(() => {
    if (connection.mode !== "flagsmith") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/flags", {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error("Connection lost");
        const data = await res.json();
        setState((s) => {
          let n = s;
          for (const key of Object.keys(data.flags) as FlagKey[])
            n = setFlag(n, key, data.flags[key]);
          return n;
        });
      } catch {
        setConnection((c) => ({
          ...c,
          message:
            "Connection interrupted. Check the local adapter before another rehearsal.",
        }));
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [connection.mode]);
  const persistRun = useCallback(
    (s: LabState) => {
      if (!s.totalRequests) return;
      const run: SavedRun = {
        id: `${s.startedAt}-${s.elapsed}`,
        name: SCENARIOS.find((x) => x.id === s.scenario)!.name,
        savedAt: new Date().toISOString(),
        state: s,
      };
      setSavedRuns((prev) => {
        const next = [run, ...prev.filter((r) => r.id !== run.id)].slice(0, 8);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          notify("Browser storage is full. Export this rehearsal to keep it.");
        }
        return next;
      });
    },
    [notify],
  );
  useEffect(() => {
    if (state.phase === "completed") persistRun(state);
  }, [state.phase, persistRun]);
  const handleStart = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase === "running") {
      setState((s) =>
        addEvent(
          { ...s, phase: "paused" },
          "info",
          "Rehearsal paused",
          "No new synthetic requests until you resume.",
        ),
      );
      return;
    }
    if (current.phase === "completed") {
      notify("Reset the rehearsal to start a new run.");
      return;
    }
    setBusy(true);
    try {
      if (connection.mode === "flagsmith" && current.elapsed === 0) {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 100, rollout: current.rollout }),
          signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error ?? "Identity evaluation failed");
        setState((s) =>
          startRun({
            ...s,
            flags: data.flags,
            rollout: data.rollout,
            cohortAssignments: data.assignments,
            flagSource: "flagsmith",
          }),
        );
      } else setState((s) => startRun(s));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not start the rehearsal.");
    } finally {
      setBusy(false);
    }
  }, [connection.mode, notify]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setScenarioOpen(false);
        setExpanded(false);
      }
      if (commandOpen && e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".command-dialog input,.command-dialog button",
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag) &&
        !commandOpen
      ) {
        e.preventDefault();
        void handleStart();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [commandOpen, handleStart]);
  useEffect(() => {
    if (commandOpen) commandRef.current?.focus();
  }, [commandOpen]);
  const updateFlag = async (key: FlagKey, enabled: boolean) => {
    setFlagBusy(key);
    try {
      if (connection.mode === "flagsmith") {
        const res = await fetch(`/api/flags/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await res.json();
        if (!res.ok || data.enabled !== enabled)
          throw new Error(data.error ?? "Flag change was not confirmed.");
      }
      setState((s) => setFlag(s, key, enabled));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Flag update failed.");
    } finally {
      setFlagBusy(null);
    }
  };
  const reset = (scenario?: ScenarioId) => {
    if (state.totalRequests) persistRun(state);
    setState((s) => ({
      ...initialState(s.seed),
      scenario: scenario ?? s.scenario,
      flags: { ...s.flags },
      guardrails: { ...s.guardrails },
      rollout: s.rollout,
      flagSource: s.flagSource,
    }));
    setSelectedNode(null);
    setScenarioOpen(false);
  };
  const newRun = (scenario: ScenarioId) => {
    if (state.totalRequests) persistRun(state);
    setState((s) => ({
      ...initialState(s.seed),
      scenario,
      guardrails: { ...s.guardrails },
      rollout: s.rollout,
      flagSource: s.flagSource,
      flags: connection.mode === "flagsmith" ? s.flags : initialState().flags,
    }));
    setScenarioOpen(false);
  };
  const exportRun = () => {
    if (!state.totalRequests) {
      notify("Run a rehearsal first to generate evidence.");
      return;
    }
    download(
      evidence(state),
      `switchyard-${state.scenario}-${state.seed}.json`,
    );
    notify(
      "Evidence exported with seed, cohort results, and the full timeline.",
    );
  };
  const navigate = (p: Page) => {
    setPage(p);
    setMobileNav(false);
  };
  const scenario = SCENARIOS.find((x) => x.id === state.scenario)!;
  const last = state.points.at(-1);
  const recent = state.requests.filter((r) => r.second > state.elapsed - 5);
  const cohorts = summarizeCohorts(recent);
  const failingCohorts = cohorts.filter(
    (c) => c.requests > 0 && c.rate > state.guardrails.cohortErrorRate,
  );
  const isRunning = state.phase === "running";
  const hasRun = state.totalRequests > 0;
  const latencyAxis = Math.max(
    600,
    Math.ceil(
      (Math.max(0, ...state.points.map((p) => p.p95), state.guardrails.p95) *
        1.1) /
        200,
    ) * 200,
  );
  const errorAxis = Math.max(
    10,
    Math.ceil(
      (Math.max(
        0,
        ...state.points.map((p) => p.errorRate),
        state.guardrails.errorRate,
      ) *
        1.1) /
        5,
    ) * 5,
  );
  const currentError = last?.errorRate ?? 0;
  const p95 = last?.p95 ?? 0;
  const sideNav = (
    <>
      <button
        className="workspace-switch"
        onClick={() => navigate("integrations")}
      >
        <span className="workspace-icon">
          <Blocks size={17} />
        </span>
        <span>
          Acme storefront<small>Release playground</small>
        </span>
        <ChevronDown size={14} />
      </button>
      <div className="nav-group-label">WORKSPACE</div>
      <nav aria-label="Workspace">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(p.id)}
            aria-label={p.label}
            className={`nav-link ${page === p.id ? "active" : ""}`}
          >
            <p.icon size={18} />
            <span>{p.label}</span>
            {p.id === "replays" && savedRuns.length > 0 && (
              <span className="nav-count">{savedRuns.length}</span>
            )}
            {p.id === "lab" && <span className="nav-active-mark" />}
          </button>
        ))}
      </nav>
      <div className="nav-group-label tools-label">DEVELOPER TOOLS</div>
      <nav aria-label="Developer tools">
        <button
          className={`nav-link ${page === "integrations" ? "active" : ""}`}
          onClick={() => navigate("integrations")}
        >
          <Link2 size={18} />
          Connections
        </button>
        <button
          className={`nav-link ${page === "docs" ? "active" : ""}`}
          onClick={() => navigate("docs")}
        >
          <BookOpen size={18} />
          Documentation
          <ArrowUpRight size={14} className="nav-external" />
        </button>
      </nav>
    </>
  );
  const flagsPanel = (
    <section className="panel flags-panel">
      <div className="panel-heading">
        <div className="panel-title">
          <Flag size={17} />
          <h2>Feature flags</h2>
          <span className="count">3</span>
        </div>
        <button className="text-button" onClick={() => navigate("flags")}>
          Manage
          <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="flags-list">
        {FLAG_INFO.map((f) => (
          <div className="flag-row" key={f.key}>
            <div className="flag-info">
              <code>{f.key}</code>
              <span>{f.description}</span>
            </div>
            <Toggle
              checked={state.flags[f.key]}
              onChange={() => void updateFlag(f.key, !state.flags[f.key])}
              label={`Toggle ${f.key}`}
              disabled={flagBusy !== null || state.rollbackPending}
            />
          </div>
        ))}
      </div>
      <div className="rollout-control">
        <div className="rollout-label">
          <span>Candidate exposure</span>
          <strong>
            {connection.mode === "flagsmith"
              ? "Flagsmith controlled"
              : `${state.rollout}%`}
          </strong>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={state.rollout}
          disabled={state.phase !== "ready" || connection.mode === "flagsmith"}
          onChange={(e) =>
            setState((s) => ({ ...s, rollout: Number(e.target.value) }))
          }
          aria-label="Candidate exposure percentage"
        />
        <div className="range-labels">
          <span>5%</span>
          <span>100%</span>
        </div>
      </div>
      <div className="flag-source">
        <span className="flagsmith-icon">
          <Flag size={14} />
        </span>
        <span>
          {connection.mode === "flagsmith"
            ? "Evaluated by self-hosted Flagsmith"
            : "Sandbox flag evaluation"}
        </span>
        <span
          className={`status-dot ${connection.mode === "flagsmith" ? "green" : "slate"}`}
        />
      </div>
    </section>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("lab");
          }}
        >
          <span className="brand-mark">
            <GitBranch size={23} />
          </span>
          <span>
            switchyard<span className="brand-dot">.</span>
          </span>
        </a>
        {sideNav}
        <div className="sidebar-bottom">
          <div className="open-source-callout">
            <span className="callout-title">
              <GitBranch size={15} /> Small flags. Safer releases.
            </span>
            <p>
              Built on open-source Flagsmith.
              <br />
              Made for the what-ifs.
            </p>
            <a
              href="https://github.com/Flagsmith/flagsmith"
              target="_blank"
              rel="noreferrer"
            >
              Explore Flagsmith
              <ArrowUpRight size={14} />
            </a>
          </div>
          <button className="profile" onClick={() => navigate("integrations")}>
            <span className="avatar">SY</span>
            <span>
              Local workspace<small>No account needed</small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
        <span className="sidebar-version">
          SWITCHYARD <span>v1.0.0</span>
        </span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Toggle navigation"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="breadcrumbs">
            <Blocks size={15} />
            <span>Playground</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {
                [
                  ...PAGES,
                  { id: "integrations", label: "Connections" },
                  { id: "docs", label: "Documentation" },
                ].find((p) => p.id === page)?.label
              }
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`environment-pill ${connection.mode === "flagsmith" ? "connected" : ""}`}
            >
              <span className="status-dot" />
              {connection.mode === "flagsmith" ? "Self-hosted" : "Sandbox"}
            </span>
            <button
              className="search-trigger"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={15} />
              <span>Quick actions</span>
              <kbd>⌘ K</kbd>
            </button>
            <a
              className="github-link"
              href="https://github.com/mario-lindev/switchyard"
              target="_blank"
              rel="noreferrer"
              aria-label="Switchyard on GitHub"
            >
              <Github size={19} />
            </a>
          </div>
        </header>
        {mobileNav && <div className="mobile-navigation">{sideNav}</div>}
        <main>
          <div className="page-heading">
            <div>
              <h1>
                {page === "lab"
                  ? "Release lab"
                  : page === "replays"
                    ? "Replays"
                    : page === "flags"
                      ? "Feature flags"
                      : page === "guardrails"
                        ? "Guardrails"
                        : page === "integrations"
                          ? "Connections"
                          : "Built for the what-ifs."}
              </h1>
              <p>
                {page === "lab"
                  ? "Break it here. Ship it safely."
                  : page === "replays"
                    ? "Same traffic. Different decisions. Evidence you can replay."
                    : page === "flags"
                      ? "Small switches with a big say in what happens next."
                      : page === "guardrails"
                        ? "Set the boundaries. Let the lab catch the regressions."
                        : page === "integrations"
                          ? "Your infrastructure. Your flags. Your release rehearsal."
                          : "A release rehearsal is only useful if you can explain what happened."}
              </p>
            </div>
            <div className="page-actions">
              {page === "lab" ? (
                <>
                  <button
                    className="button secondary"
                    onClick={exportRun}
                    disabled={!hasRun}
                  >
                    <ArrowDownToLine size={16} />
                    Export evidence
                  </button>
                  <button
                    className={`button primary ${isRunning ? "running" : ""}`}
                    onClick={() => void handleStart()}
                    disabled={
                      busy ||
                      state.phase === "completed" ||
                      state.rollbackPending
                    }
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : isRunning ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                    <span>
                      {busy
                        ? "Evaluating flags…"
                        : isRunning
                          ? "Pause rehearsal"
                          : state.phase === "paused"
                            ? "Resume rehearsal"
                            : state.phase === "completed"
                              ? "Rehearsal complete"
                              : "Run rehearsal"}
                    </span>
                    {!isRunning && state.phase !== "completed" && (
                      <kbd>Space</kbd>
                    )}
                  </button>
                </>
              ) : page === "replays" ? (
                <button
                  className="button primary"
                  onClick={() => setCompare(true)}
                >
                  <GitBranch size={16} />
                  Compare guardrails
                </button>
              ) : page === "integrations" ? (
                <button
                  className="button secondary"
                  onClick={() => void checkConnection()}
                  disabled={connectionLoading}
                >
                  <RotateCcw
                    size={16}
                    className={connectionLoading ? "spin" : ""}
                  />
                  {connectionLoading ? "Checking…" : "Check connection"}
                </button>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => navigate("lab")}
                >
                  <FlaskConical size={16} />
                  Open release lab
                </button>
              )}
            </div>
          </div>
          {page === "lab" && (
            <>
              <div className="lab-context">
                <div className="context-left">
                  <span className="project-avatar">
                    <ShoppingBag size={18} />
                  </span>
                  <div>
                    <strong>Checkout v2 rollout</strong>
                    <span className="context-caption">
                      acme-storefront<span>/</span>staging
                    </span>
                  </div>
                  <Badge
                    tone={
                      state.phase === "completed"
                        ? "green"
                        : isRunning
                          ? "orange"
                          : "neutral"
                    }
                  >
                    <span
                      className={`status-dot ${isRunning ? "orange" : state.phase === "completed" ? "green" : "slate"}`}
                    />
                    {state.phase === "ready"
                      ? "Ready to rehearse"
                      : state.phase === "running"
                        ? "Rehearsal running"
                        : state.phase === "paused"
                          ? "Paused"
                          : "Completed"}
                  </Badge>
                </div>
                <div className="context-right">
                  <span>
                    <Radio size={13} />
                    Synthetic traffic
                  </span>
                  <span>
                    <Clock3 size={13} />
                    {seconds(state.elapsed)}
                    <span className="context-divider">/</span>
                    {seconds(state.duration)}
                  </span>
                  <IconButton
                    icon={RotateCcw}
                    label="Reset rehearsal"
                    onClick={() => reset()}
                    disabled={busy || state.rollbackPending}
                  />
                </div>
              </div>
              <section className="metrics-strip" aria-label="Rehearsal metrics">
                {[
                  {
                    label: "Requests processed",
                    value: hasRun ? format(state.totalRequests) : "0",
                    unit: "",
                    icon: Activity,
                    detail: hasRun
                      ? "120 requests / simulated second"
                      : "Waiting for your first rehearsal",
                    tone: "neutral",
                    data: state.points.map((p) => p.requests),
                  },
                  {
                    label: "P95 latency",
                    value: hasRun ? format(p95) : "—",
                    unit: hasRun ? "ms" : "",
                    icon: Timer,
                    detail: hasRun
                      ? `${p95 > state.guardrails.p95 ? "Above" : "Within"} ${state.guardrails.p95} ms guardrail`
                      : "The slowest 5% of requests",
                    tone: p95 > state.guardrails.p95 ? "red" : "green",
                    data: state.points.map((p) => p.p95),
                  },
                  {
                    label: "Error rate",
                    value: hasRun ? currentError.toFixed(1) : "—",
                    unit: hasRun ? "%" : "",
                    icon: AudioLines,
                    detail: hasRun
                      ? `${currentError > state.guardrails.errorRate ? "Above" : "Within"} ${state.guardrails.errorRate}% guardrail`
                      : "Successful releases start here",
                    tone:
                      currentError > state.guardrails.errorRate
                        ? "red"
                        : "green",
                    data: state.points.map((p) => p.errorRate),
                  },
                  {
                    label: "Cohorts at risk",
                    value: `${failingCohorts.length}`,
                    unit: "/ 4",
                    icon: Users,
                    detail: failingCohorts.length
                      ? failingCohorts.map((c) => c.name).join(", ")
                      : hasRun
                        ? "All cohorts within threshold"
                        : "Watching every customer segment",
                    tone: failingCohorts.length ? "red" : "neutral",
                    data: [],
                  },
                ].map((m) => (
                  <div className="metric" key={m.label}>
                    <div className="metric-label">
                      {m.label}
                      <m.icon size={15} />
                    </div>
                    <div
                      className={`metric-value ${m.tone === "red" ? "bad-text" : ""}`}
                    >
                      {m.value}
                      <small>{m.unit}</small>
                      {hasRun && m.data.length > 1 && (
                        <div className="metric-chart">
                          <LineChart
                            values={m.data.slice(-20)}
                            height={45}
                            color={m.tone === "red" ? "#d54e4e" : "#95a5a0"}
                            label={`${m.label} recent history`}
                          />
                        </div>
                      )}
                    </div>
                    <div
                      className={`metric-detail ${hasRun && m.tone === "green" ? "good-text" : m.tone === "red" ? "bad-text" : ""}`}
                    >
                      {hasRun && m.tone === "green" && <Check size={12} />}{" "}
                      {m.detail}
                    </div>
                  </div>
                ))}
              </section>
              <div className="lab-grid">
                <div className="lab-main">
                  <Topology
                    state={state}
                    selected={selectedNode}
                    onSelect={(id) => setSelectedNode(id || null)}
                    large={expanded}
                    onExpand={() => setExpanded(!expanded)}
                  />
                  <section className="panel telemetry-panel">
                    <div className="panel-heading">
                      <div className="panel-title">
                        <Activity size={17} />
                        <h2>Live telemetry</h2>
                      </div>
                      <div className="segmented">
                        <button
                          className={
                            telemetryTab === "latency" ? "selected" : ""
                          }
                          onClick={() => setTelemetryTab("latency")}
                        >
                          Latency
                        </button>
                        <button
                          className={
                            telemetryTab === "errors" ? "selected" : ""
                          }
                          onClick={() => setTelemetryTab("errors")}
                        >
                          Error rate
                        </button>
                      </div>
                    </div>
                    <div className="telemetry-body">
                      <div className="chart-y-axis">
                        <span>
                          {telemetryTab === "latency"
                            ? `${latencyAxis} ms`
                            : `${errorAxis}%`}
                        </span>
                        <span>
                          {telemetryTab === "latency"
                            ? `${latencyAxis / 2} ms`
                            : `${errorAxis / 2}%`}
                        </span>
                        <span>0</span>
                      </div>
                      <div className="main-chart">
                        <LineChart
                          values={state.points.map((p) =>
                            telemetryTab === "latency" ? p.p95 : p.errorRate,
                          )}
                          threshold={
                            telemetryTab === "latency"
                              ? state.guardrails.p95
                              : state.guardrails.errorRate
                          }
                          maxValue={
                            telemetryTab === "latency" ? latencyAxis : errorAxis
                          }
                          height={125}
                          label={`Synthetic ${telemetryTab} over time`}
                          empty={!hasRun}
                        />
                        {!hasRun && (
                          <span className="empty-chart-label">
                            Your release story starts with a rehearsal.
                          </span>
                        )}
                        {state.faultAt !== null && (
                          <span
                            className="chart-event"
                            style={{
                              left: `${(state.faultAt / Math.max(state.elapsed, 1)) * 100}%`,
                            }}
                          >
                            <Zap size={11} />
                          </span>
                        )}
                        {state.rollbackAt !== null && (
                          <span
                            className="chart-event rollback"
                            style={{
                              left: `${(state.rollbackAt / Math.max(state.elapsed, 1)) * 100}%`,
                            }}
                          >
                            <ShieldCheck size={11} />
                          </span>
                        )}
                        <div className="chart-x-axis">
                          <span>00:00</span>
                          <span>{seconds(Math.round(state.elapsed / 2))}</span>
                          <span>{seconds(state.elapsed || 60)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="chart-footer">
                      <span>
                        <i className="legend-dot orange" />
                        {telemetryTab === "latency"
                          ? "P95 latency"
                          : "Request error rate"}
                      </span>
                      <span>
                        <i className="threshold-line" />
                        Guardrail threshold
                      </span>
                      <span className="chart-live">
                        <span
                          className={`status-dot ${isRunning ? "green" : "slate"}`}
                        />
                        {isRunning ? "Live" : "Synthetic telemetry"}
                      </span>
                    </div>
                  </section>
                </div>
                <div className="lab-aside">
                  {flagsPanel}
                  <section className="panel chaos-panel">
                    <div className="panel-heading">
                      <div className="panel-title">
                        <Zap size={17} />
                        <h2>A little controlled chaos</h2>
                      </div>
                    </div>
                    <div className="chaos-body">
                      <p>Find the failure before your users do.</p>
                      <div className="scenario-picker-wrap">
                        <button
                          className={`scenario-picker ${scenarioOpen ? "selected" : ""}`}
                          onClick={() => setScenarioOpen(!scenarioOpen)}
                          aria-expanded={scenarioOpen}
                          disabled={state.elapsed > 0}
                        >
                          <span className="scenario-icon">
                            <Zap size={16} />
                          </span>
                          <span>
                            <strong>{scenario.name}</strong>
                            <small>{scenario.service}</small>
                          </span>
                          <ChevronDown size={15} />
                        </button>
                        {scenarioOpen && (
                          <div className="scenario-options">
                            {SCENARIOS.map((s) => (
                              <button key={s.id} onClick={() => newRun(s.id)}>
                                <span>
                                  <strong>{s.name}</strong>
                                  <small>{s.service}</small>
                                </span>
                                {s.id === state.scenario && <Check size={15} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className={`button inject-button ${state.chaos ? "injected" : ""}`}
                        disabled={
                          !isRunning ||
                          state.chaos ||
                          state.scenario === "healthy-release"
                        }
                        onClick={() => setState((s) => injectFailure(s))}
                      >
                        {state.chaos ? (
                          <CheckCheck size={16} />
                        ) : (
                          <Zap size={16} />
                        )}{" "}
                        {state.chaos ? "Failure injected" : "Inject failure"}
                      </button>
                      <span className="chaos-note">
                        {state.scenario === "healthy-release"
                          ? "Control run · no failure injection"
                          : state.phase === "ready"
                            ? "Or let the scenario inject one at 00:10."
                            : state.chaos
                              ? "The fault stays active after a rollback."
                              : "Scheduled for 00:10 · or inject it now."}
                      </span>
                    </div>
                  </section>
                  <section
                    className={`guardrail-summary ${state.guardrails.autoRollback ? "armed" : ""}`}
                  >
                    <div className="guardrail-icon">
                      {state.guardrails.autoRollback ? (
                        <ShieldCheck size={20} />
                      ) : (
                        <ShieldOff size={20} />
                      )}
                    </div>
                    <div>
                      <strong>
                        {state.rollbackAt !== null
                          ? "Caught. Contained. Recovered."
                          : state.guardrails.autoRollback
                            ? "Your safety net is on."
                            : "Manual control is on."}
                      </strong>
                      <p>
                        {state.rollbackAt !== null
                          ? `Flag rolled back at ${seconds(state.rollbackAt)}.`
                          : state.guardrails.autoRollback
                            ? "Regressions trigger a guarded rollback."
                            : "Observe the failure and roll back yourself."}
                      </p>
                      <button onClick={() => navigate("guardrails")}>
                        Configure guardrails
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
              <div className="bottom-grid">
                <section className="panel cohorts-panel">
                  <div className="panel-heading">
                    <div className="panel-title">
                      <Users size={17} />
                      <h2>Cohort health</h2>
                    </div>
                    <Badge>Last 5 seconds</Badge>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Requests</th>
                        <th>Error rate</th>
                        <th>Health</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((c) => (
                        <tr key={c.name}>
                          <td>
                            <span
                              className={`cohort-symbol ${c.name.includes("Mobile") ? "mobile" : ""}`}
                            />
                            {c.name}
                          </td>
                          <td className="mono">{format(c.requests)}</td>
                          <td>
                            <div className="cohort-rate">
                              <span
                                className={`mono ${c.rate > state.guardrails.cohortErrorRate ? "bad-text" : ""}`}
                              >
                                {c.rate.toFixed(1)}%
                              </span>
                              <div className="cohort-rate-track">
                                <span
                                  style={{
                                    width: `${Math.min(100, c.rate * 3)}%`,
                                    background:
                                      c.rate > state.guardrails.cohortErrorRate
                                        ? "var(--danger)"
                                        : "var(--positive)",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge
                              tone={
                                !c.requests
                                  ? "neutral"
                                  : c.rate > state.guardrails.cohortErrorRate
                                    ? "red"
                                    : "green"
                              }
                            >
                              {!c.requests
                                ? "Waiting"
                                : c.rate > state.guardrails.cohortErrorRate
                                  ? "At risk"
                                  : "Healthy"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="panel events-panel">
                  <div className="panel-heading">
                    <div className="panel-title">
                      <Terminal size={17} />
                      <h2>Event timeline</h2>
                      <span className="count">{state.events.length}</span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        persistRun(state);
                        notify(
                          hasRun
                            ? "Replay saved to this browser."
                            : "Run a rehearsal first to save a replay.",
                        );
                      }}
                    >
                      <History size={13} />
                      Save replay
                    </button>
                  </div>
                  <div
                    className="event-list"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {state.events
                      .slice(-5)
                      .reverse()
                      .map((e) => (
                        <div className={`event-row ${e.kind}`} key={e.id}>
                          <span className="event-time">
                            {seconds(e.second)}
                          </span>
                          <span className="event-symbol">
                            {e.kind === "danger" ? (
                              <Zap size={13} />
                            ) : e.kind === "success" ? (
                              <Check size={13} />
                            ) : e.kind === "flag" ? (
                              <Flag size={13} />
                            ) : e.kind === "warning" ? (
                              <AlertTriangle size={13} />
                            ) : (
                              <Terminal size={13} />
                            )}
                          </span>
                          <div>
                            <strong>{e.title}</strong>
                            <p>{e.detail}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
              <div className="lab-bottom-note">
                <span>
                  <FlaskConical size={14} />
                  All requests and service metrics are simulated.{" "}
                  {connection.mode === "flagsmith"
                    ? "Flag decisions come from your self-hosted instance."
                    : "Connect Flagsmith for real flag decisions."}
                </span>
                <button onClick={() => navigate("integrations")}>
                  {connection.mode === "flagsmith"
                    ? "View connection"
                    : "Connect your instance"}
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </>
          )}
          {page === "flags" && (
            <>
              <div className="info-banner">
                <Flag size={19} />
                <div>
                  <strong>
                    {connection.mode === "flagsmith"
                      ? "Your flags, evaluated by Flagsmith."
                      : "Try every switch. See what changes."}
                  </strong>
                  <p>
                    {connection.mode === "flagsmith"
                      ? "Changes are written to your configured Flagsmith lab environment and confirmed before the UI updates."
                      : "Sandbox changes are instant. Connect your self-hosted instance to use real Flagsmith evaluations."}
                  </p>
                </div>
                <Badge
                  tone={connection.mode === "flagsmith" ? "green" : "neutral"}
                >
                  {connection.mode === "flagsmith" ? "Connected" : "Sandbox"}
                </Badge>
              </div>
              <section className="panel flag-table">
                <div className="panel-heading">
                  <div className="panel-title">
                    <Flag size={17} />
                    <h2>Environment flags</h2>
                  </div>
                  <span className="small-muted">acme-storefront / staging</span>
                </div>
                {FLAG_INFO.map((f) => (
                  <div className="detailed-flag" key={f.key}>
                    <span className="detailed-flag-icon">
                      <f.icon size={23} />
                    </span>
                    <div>
                      <h3>
                        {f.name}
                        <Badge>{f.tag}</Badge>
                      </h3>
                      <code>{f.key}</code>
                      <p>
                        {f.description}.{" "}
                        {f.key === "checkout_v2"
                          ? "Disabling this flag routes every new request to the stable control path."
                          : f.key === "smart_cache"
                            ? "Enable this before the cache-stampede scenario to compare resilience."
                            : "Disable this during a payment outage to reveal the unprotected failure rate."}
                      </p>
                    </div>
                    <span className="flag-state-label">
                      {state.flags[f.key] ? "Enabled" : "Disabled"}
                    </span>
                    <Toggle
                      checked={state.flags[f.key]}
                      onChange={() =>
                        void updateFlag(f.key, !state.flags[f.key])
                      }
                      label={`Toggle ${f.key}`}
                      disabled={flagBusy !== null || state.rollbackPending}
                    />
                  </div>
                ))}
              </section>
              <div className="two-column-content">
                <section className="panel content-panel">
                  <h2>Flags do the real work.</h2>
                  <p>
                    The same checkout flag that exposes the candidate release is
                    the kill switch that takes it out of the request path. No
                    redeploy. No simulated recovery timer.
                  </p>
                  <pre>
                    <code>{`const flags = await flagsmith.getIdentityFlags(\n  'visitor-42', { device: 'mobile', region: 'eu' }\n);\n\nif (flags.isFeatureEnabled('checkout_v2')) {\n  return candidateCheckout(request);\n}\nreturn stableCheckout(request);`}</code>
                  </pre>
                </section>
                <section className="panel content-panel">
                  <h2>Rollout with intention.</h2>
                  <p>
                    In the sandbox, candidate exposure controls the share of
                    requests that use checkout v2. In connected mode, Flagsmith
                    owns identity assignments through segments or multivariate
                    flags.
                  </p>
                  <div className="large-rollout">
                    <span>
                      {state.rollout}
                      <small>%</small>
                    </span>
                    <p>Sandbox candidate exposure</p>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={state.rollout}
                    disabled={
                      state.phase !== "ready" || connection.mode === "flagsmith"
                    }
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        rollout: Number(e.target.value),
                      }))
                    }
                    aria-label="Candidate exposure percentage"
                  />
                  <p className="small-muted">
                    Reset the rehearsal to change exposure. Live assignments are
                    configured in the Flagsmith dashboard.
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "guardrails" && (
            <>
              <div className="info-banner green-banner">
                <ShieldCheck size={23} />
                <div>
                  <strong>Catch the regression. Keep the receipts.</strong>
                  <p>
                    A sustained breach can disable checkout v2. Every threshold,
                    request, and flag change is captured in your evidence.
                  </p>
                </div>
              </div>
              <section className="panel content-panel guardrail-config">
                <div className="config-row">
                  <div>
                    <h2>Automatic rollback</h2>
                    <p>
                      Disable checkout_v2 after a sustained breach in the
                      checkout-regression scenario.
                    </p>
                  </div>
                  <Toggle
                    checked={state.guardrails.autoRollback}
                    onChange={() =>
                      setState((s) =>
                        addEvent(
                          {
                            ...s,
                            guardrails: {
                              ...s.guardrails,
                              autoRollback: !s.guardrails.autoRollback,
                            },
                          },
                          "info",
                          `Automatic rollback ${s.guardrails.autoRollback ? "disabled" : "enabled"}`,
                          "Guardrail policy updated for this rehearsal.",
                        ),
                      )
                    }
                    label="Enable automatic rollback"
                  />
                </div>
                {[
                  {
                    key: "errorRate" as keyof Guardrails,
                    label: "Overall error rate",
                    description:
                      "The percentage of synthetic requests that fail in a simulated second.",
                    unit: "%",
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                  },
                  {
                    key: "p95" as keyof Guardrails,
                    label: "P95 latency",
                    description:
                      "The upper latency boundary for the slowest five percent of requests.",
                    unit: "ms",
                    min: 150,
                    max: 2000,
                    step: 50,
                  },
                  {
                    key: "cohortErrorRate" as keyof Guardrails,
                    label: "Cohort error rate",
                    description:
                      "Catch a failing segment even when the overall error rate looks healthy. Uses a rolling 3-second window.",
                    unit: "%",
                    min: 2,
                    max: 50,
                    step: 1,
                  },
                  {
                    key: "consecutive" as keyof Guardrails,
                    label: "Consecutive breaches",
                    description:
                      "Require sustained failure before rolling back. This avoids reacting to a single noisy second.",
                    unit: "seconds",
                    min: 1,
                    max: 10,
                    step: 1,
                  },
                ].map((g) => (
                  <div className="config-row" key={g.key}>
                    <div>
                      <h3>{g.label}</h3>
                      <p>{g.description}</p>
                    </div>
                    <label className="number-input">
                      <input
                        type="number"
                        min={g.min}
                        max={g.max}
                        step={g.step}
                        value={state.guardrails[g.key] as number}
                        aria-label={g.label}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (
                            Number.isFinite(value) &&
                            value >= g.min &&
                            value <= g.max
                          )
                            setState((s) => ({
                              ...s,
                              guardrails: { ...s.guardrails, [g.key]: value },
                            }));
                        }}
                      />
                      <span>{g.unit}</span>
                    </label>
                  </div>
                ))}
              </section>
              <div className="guardrail-explainer">
                <div>
                  <ShieldCheck size={28} />
                  <h2>Built to fail safely.</h2>
                  <p>
                    In connected mode, a rollback is only marked successful
                    after Flagsmith confirms the flag is disabled. If the API
                    rejects the change, the rehearsal pauses and the failure is
                    recorded. Payment and cache faults stay visible for manual
                    flag intervention.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setPage("replays");
                    setCompare(true);
                  }}
                >
                  <GitBranch size={16} />
                  Compare guarded vs. unguarded
                </button>
              </div>
            </>
          )}
          {page === "replays" && (
            <ReplayPage
              savedRuns={savedRuns}
              comparison={compare}
              onCompare={() => setCompare(!compare)}
              state={state}
              onRestore={(run) => {
                persistRun(state);
                setState({
                  ...run.state,
                  phase:
                    run.state.phase === "completed" ? "completed" : "paused",
                });
                setConnection((c) => ({ ...c, mode: "sandbox" }));
                setState((s) => ({
                  ...s,
                  flagSource: "sandbox",
                  cohortAssignments: undefined,
                }));
                setPage("lab");
                notify(
                  "Replay loaded as a sandbox snapshot. Remote flags were not changed.",
                );
              }}
              onDelete={(id) => {
                setSavedRuns((r) => {
                  const next = r.filter((x) => x.id !== id);
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(next));
                  } catch {}
                  return next;
                });
              }}
              onNew={() => {
                reset();
                setPage("lab");
              }}
            />
          )}
          {page === "integrations" && (
            <>
              <div className="connection-hero">
                <span className="connection-hero-icon">
                  <Workflow size={35} />
                </span>
                <div>
                  <h2>Open source. All the way down.</h2>
                  <p>
                    Run Flagsmith on your own infrastructure. Point Switchyard
                    at it.
                    <br />
                    Rehearse releases with real flag decisions and synthetic
                    traffic.
                  </p>
                </div>
                <Badge
                  tone={connection.mode === "flagsmith" ? "green" : "neutral"}
                >
                  <span
                    className={`status-dot ${connection.mode === "flagsmith" ? "green" : "slate"}`}
                  />
                  {connection.mode === "flagsmith"
                    ? "Instance connected"
                    : "Sandbox mode"}
                </Badge>
              </div>
              <section className="panel content-panel">
                <div className="connection-status">
                  <div>
                    <h2>Self-hosted Flagsmith</h2>
                    <p>
                      {connection.message ??
                        "Start the local adapter with your Flagsmith environment and management keys."}
                    </p>
                  </div>
                  <span className="flagsmith-wordmark">
                    <Flag size={20} />
                    Flagsmith
                  </span>
                </div>
                <dl className="connection-details">
                  <div>
                    <dt>Mode</dt>
                    <dd>
                      {connection.mode === "flagsmith"
                        ? "Connected · remote evaluation"
                        : "Browser sandbox"}
                    </dd>
                  </div>
                  <div>
                    <dt>API endpoint</dt>
                    <dd>
                      <code>
                        {connection.endpoint ?? "http://localhost:8000/api/v1/"}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Environment</dt>
                    <dd>
                      {connection.environment ??
                        "Configure FLAGSMITH_ENVIRONMENT_KEY"}
                    </dd>
                  </div>
                  <div>
                    <dt>Credentials</dt>
                    <dd>
                      <ShieldCheck size={14} />
                      Server-side only
                    </dd>
                  </div>
                </dl>
              </section>
              <div className="two-column-content">
                <section className="panel content-panel">
                  <h2>1. Start your lab</h2>
                  <p>
                    The Compose stack includes Postgres, Flagsmith, migrations,
                    a task processor, and Switchyard. It binds locally and keeps
                    the sandbox isolated.
                  </p>
                  <CodeBlock
                    code={`git clone https://github.com/mario-lindev/switchyard.git\ncd switchyard\ncp .env.example .env\n# Set the local-only secrets in .env\ndocker compose up --build -d`}
                    notify={notify}
                  />
                  <p className="small-muted">
                    Create a Flagsmith account at localhost:8000 and a dedicated
                    project and environment for rehearsals.
                  </p>
                </section>
                <section className="panel content-panel">
                  <h2>2. Connect Flagsmith</h2>
                  <p>
                    Add these values to your server’s .env. Use a dedicated lab
                    environment, then seed the three flags and restart
                    Switchyard.
                  </p>
                  <CodeBlock
                    code={`FLAGSMITH_API_URL=http://localhost:8000/api/v1/\nFLAGSMITH_ENVIRONMENT_KEY=<server-sdk-key>\nFLAGSMITH_ENVIRONMENT_ID=<environment-api-key>\nFLAGSMITH_MANAGEMENT_TOKEN=<admin-api-token>\nFLAGSMITH_PROJECT_ID=<project-id>\nALLOW_FLAG_MUTATIONS=true`}
                    notify={notify}
                  />
                  <p className="small-muted">
                    Inside Docker use http://flagsmith:8000/api/v1/. See the
                    README for the complete setup.
                  </p>
                </section>
              </div>
              <div className="info-banner">
                <Terminal size={21} />
                <div>
                  <strong>Bring the safety check to CI.</strong>
                  <p>
                    The same deterministic engine runs headlessly. Export a
                    report or fail a build when a release breaches its
                    guardrails.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => navigate("docs")}
                >
                  Read the guide
                  <BookOpen size={15} />
                </button>
              </div>
            </>
          )}
          {page === "docs" && <Docs notify={notify} navigate={navigate} />}
          <footer className="app-footer">
            <span>
              <span className="mini-brand">
                <GitBranch size={13} />
              </span>{" "}
              Built for the what-ifs.
            </span>
            <div>
              <span>Open source by design</span>
              <a
                href="https://docs.flagsmith.com/deployment-self-hosting/hosting-guides/docker"
                target="_blank"
                rel="noreferrer"
              >
                Flagsmith docs
                <ArrowUpRight size={12} />
              </a>
            </div>
          </footer>
        </main>
        {page === "lab" && (
          <div className="run-dock">
            <div className="dock-status">
              <span
                className={`status-dot ${isRunning ? "orange" : state.phase === "completed" ? "green" : "slate"}`}
              />
              <span>
                {isRunning
                  ? "REHEARSAL IN PROGRESS"
                  : state.phase === "completed"
                    ? "REHEARSAL COMPLETE"
                    : "YOUR SAFE PLACE TO BREAK THINGS"}
              </span>
            </div>
            <div className="dock-controls">
              <label className="speed-select">
                <Gauge size={14} />
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Simulation speed"
                >
                  <option value="1">1× speed</option>
                  <option value="2">2× speed</option>
                  <option value="4">4× speed</option>
                </select>
                <ChevronDown size={12} />
              </label>
              <span className="dock-separator" />
              <span className="mono">
                {seconds(state.elapsed)}{" "}
                <span className="small-muted">/ {seconds(state.duration)}</span>
              </span>
              <div className="dock-progress">
                <span
                  style={{
                    width: `${(state.elapsed / state.duration) * 100}%`,
                  }}
                />
              </div>
              <IconButton
                icon={isRunning ? Pause : Play}
                label={isRunning ? "Pause rehearsal" : "Start rehearsal"}
                onClick={() => void handleStart()}
                disabled={
                  busy || state.phase === "completed" || state.rollbackPending
                }
              />
              <IconButton
                icon={CircleStop}
                label="Finish rehearsal now"
                onClick={() => {
                  setState((s) =>
                    addEvent(
                      { ...s, phase: "completed" },
                      "info",
                      "Rehearsal stopped",
                      `${s.totalRequests} synthetic requests recorded.`,
                    ),
                  );
                }}
                disabled={
                  !hasRun ||
                  state.phase === "completed" ||
                  state.rollbackPending
                }
              />
            </div>
          </div>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <IconButton
            icon={X}
            label="Dismiss notification"
            onClick={() => setToast("")}
          />
        </div>
      )}
      {commandOpen && (
        <div className="command-backdrop" onClick={() => setCommandOpen(false)}>
          <div
            className="command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Quick actions"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-search">
              <Search size={20} />
              <input
                ref={commandRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where would you like to go?"
                aria-label="Search quick actions"
              />
              <button onClick={() => setCommandOpen(false)}>
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className="command-results">
              {[
                ...PAGES,
                {
                  id: "integrations" as Page,
                  label: "Connect self-hosted Flagsmith",
                  icon: Link2,
                },
                {
                  id: "docs" as Page,
                  label: "Read the documentation",
                  icon: BookOpen,
                },
              ]
                .filter((p) =>
                  p.label.toLowerCase().includes(query.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(p.id);
                      setCommandOpen(false);
                      setQuery("");
                    }}
                  >
                    <p.icon size={18} />
                    {p.label}
                    <ChevronRight size={15} />
                  </button>
                ))}
              {query &&
                ![
                  "Release lab",
                  "Replays",
                  "Feature flags",
                  "Guardrails",
                  "Connect self-hosted Flagsmith",
                  "Read the documentation",
                ].some((x) =>
                  x.toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <p className="command-empty">
                    No matching action. Try “flags” or “replays”.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function CodeBlock({
  code,
  notify,
}: {
  code: string;
  notify: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <button
        aria-label="Copy code"
        title="Copy code"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            notify(
              "Clipboard access is unavailable. Select and copy the code.",
            );
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
function ReplayPage({
  savedRuns,
  comparison,
  onCompare,
  state,
  onRestore,
  onDelete,
  onNew,
}: {
  savedRuns: SavedRun[];
  comparison: boolean;
  onCompare: () => void;
  state: LabState;
  onRestore: (run: SavedRun) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const selectedScenario: ScenarioId = "checkout-regression";
  const [guarded, unguarded] = useMemo(
    () => [
      runHeadless({
        seed: state.seed,
        scenario: selectedScenario,
        autoRollback: true,
        rollout: state.rollout,
      }),
      runHeadless({
        seed: state.seed,
        scenario: selectedScenario,
        autoRollback: false,
        rollout: state.rollout,
      }),
    ],
    [state.seed, state.rollout, selectedScenario],
  );
  const avoided = unguarded.totalErrors - guarded.totalErrors;
  return (
    <>
      {comparison && (
        <section className="panel comparison-panel">
          <div className="panel-heading">
            <div className="panel-title">
              <GitBranch size={18} />
              <h2>The cost of doing nothing</h2>
            </div>
            <button className="text-button" onClick={onCompare}>
              <X size={15} />
              Close
            </button>
          </div>
          <div className="comparison-intro">
            <p>
              Two runs. The same {format(guarded.totalRequests)} synthetic
              requests and seed {state.seed}.<br />
              Only one difference: the automatic rollback.
            </p>
            <Badge>Deterministic comparison</Badge>
          </div>
          <div className="comparison-stats">
            <div className="comparison-stat">
              <span>
                <ShieldCheck size={17} />
                With guardrails
              </span>
              <strong>
                {guarded.totalErrors}
                <small>failed requests</small>
              </strong>
              <p>
                {guarded.rollbackAt !== null
                  ? `Rolled back at ${seconds(guarded.rollbackAt)}`
                  : "No rollback triggered"}
              </p>
            </div>
            <div className="comparison-stat unguarded">
              <span>
                <ShieldOff size={17} />
                Without guardrails
              </span>
              <strong>
                {unguarded.totalErrors}
                <small>failed requests</small>
              </strong>
              <p>Candidate stays enabled for the entire run</p>
            </div>
            <div className="comparison-stat difference">
              <span>Observed difference</span>
              <strong>
                {format(avoided)}
                <small>fewer failures</small>
              </strong>
              <p>In this simulation, with this seed</p>
            </div>
          </div>
          <div className="comparison-chart">
            <LineChart
              values={guarded.points.map((p) => p.errorRate)}
              secondValues={unguarded.points.map((p) => p.errorRate)}
              height={190}
              color="#218564"
              label="Guarded versus unguarded synthetic error rate"
            />
            <div className="chart-x-axis">
              <span>00:00</span>
              <span>00:30</span>
              <span>01:00</span>
            </div>
          </div>
          <div className="comparison-chart-legend">
            <span>
              <i className="legend-dot" />
              With guardrails
            </span>
            <span>
              <i className="legend-dot slate" />
              Without guardrails
            </span>
            <button
              className="text-button"
              onClick={() =>
                download(
                  {
                    synthetic: true,
                    guarded: evidence(guarded),
                    unguarded: evidence(unguarded),
                    observedFailureDifference: avoided,
                  },
                  `switchyard-comparison-${state.seed}.json`,
                )
              }
            >
              <ArrowDownToLine size={14} />
              Export comparison
            </button>
          </div>
        </section>
      )}
      <section className="panel replay-list">
        <div className="panel-heading">
          <div className="panel-title">
            <History size={17} />
            <h2>Saved rehearsals</h2>
            <span className="count">{savedRuns.length}</span>
          </div>
          <span className="small-muted">
            Stored in this browser · up to 8 runs
          </span>
        </div>
        {!savedRuns.length ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <History size={30} />
            </span>
            <h2>Every release has a story.</h2>
            <p>
              Run a rehearsal and save its replay. Your seed, requests,
              <br />
              flag changes, and timeline stay together.
            </p>
            <button className="button primary" onClick={onNew}>
              <FlaskConical size={16} />
              Start your first rehearsal
            </button>
            <button className="text-button" onClick={onCompare}>
              Or explore a guarded vs. unguarded comparison
            </button>
          </div>
        ) : (
          savedRuns.map((r) => (
            <div className="replay-row" key={r.id}>
              <span className="replay-icon">
                <History size={20} />
              </span>
              <div>
                <strong>{r.name}</strong>
                <p>
                  Seed {r.state.seed} · {format(r.state.totalRequests)} requests
                  · {seconds(r.state.elapsed)} ·{" "}
                  {new Date(r.savedAt).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={r.state.rollbackAt !== null ? "green" : "neutral"}>
                {r.state.rollbackAt !== null ? "Rolled back" : "Recorded"}
              </Badge>
              <button
                className="button secondary small"
                onClick={() => onRestore(r)}
              >
                Inspect replay
                <Play size={13} />
              </button>
              <IconButton
                icon={ArrowDownToLine}
                label={`Export ${r.name}`}
                onClick={() =>
                  download(
                    evidence(r.state),
                    `switchyard-replay-${r.state.seed}.json`,
                  )
                }
              />
              <IconButton
                icon={X}
                label={`Delete ${r.name}`}
                onClick={() => onDelete(r.id)}
              />
            </div>
          ))
        )}
      </section>
      <div className="replay-footnote">
        <FileJson size={18} />
        <p>
          Replay snapshots preserve the recorded results. Deterministic
          comparisons rerun the default scenario with the same seed and
          exposure; they do not reproduce manual interventions or remote segment
          changes.
        </p>
      </div>
    </>
  );
}
function Docs({
  notify,
  navigate,
}: {
  notify: (s: string) => void;
  navigate: (p: Page) => void;
}) {
  return (
    <div className="docs-layout">
      <article className="panel docs-article">
        <h2>Your first release rehearsal</h2>
        <p>
          Switchyard is a release-safety workbench built around self-hosted
          Flagsmith. It helps you test a dangerous release in a deterministic
          synthetic environment, uncover segment-specific failures, and verify
          that a flag rollback restores the healthy path.
        </p>
        <h3>Run the 60-second story</h3>
        <ol className="docs-steps">
          <li>
            <strong>Start the rehearsal.</strong> Checkout v2 is enabled for a
            candidate slice of traffic. Every simulated second generates 120
            seeded requests across four cohorts.
          </li>
          <li>
            <strong>Watch the regression arrive.</strong> At 00:10, the scenario
            injects a defect into checkout v2 for Mobile · EU customers. Other
            cohorts stay healthy.
          </li>
          <li>
            <strong>Follow the guardrail.</strong> A sustained error or latency
            breach requests a rollback. In connected mode, the flag change must
            be confirmed by Flagsmith.
          </li>
          <li>
            <strong>Inspect the recovery.</strong> The injected fault stays
            active. Requests recover because checkout_v2 is disabled and traffic
            returns to the stable implementation.
          </li>
          <li>
            <strong>Export the evidence.</strong> Keep the seed, thresholds,
            per-cohort outcomes, time series, and every event in a portable JSON
            report.
          </li>
        </ol>
        <h3>What is real, and what is simulated?</h3>
        <p>
          Traffic, service topology, latencies, and failures are synthetic. In
          sandbox mode, flags are local. In connected mode, the official
          Flagsmith Node SDK evaluates identities and the management API writes
          feature states. Switchyard does not instrument production or claim
          that its simulation predicts production behavior.
        </p>
        <h3>Use the engine in CI</h3>
        <CodeBlock
          code={`npm ci\nnpm test\nnpm run rehearse -- --seed=4271 --out=report.json\n\n# Exit with code 1 if the release has a sustained breach\nnpm run rehearse -- --no-rollback --assert-safe`}
          notify={notify}
        />
        <p>
          The command-line runner imports the same engine as this interface.
          Seeded request generation keeps comparisons reproducible. The report
          is suitable for a CI artifact or an issue attachment.
        </p>
        <h3>A guardrail is a policy, not a guess.</h3>
        <p>
          Default thresholds: 3% overall errors, 500 ms P95 latency, 8% cohort
          errors, and three consecutive breaches. Cohort detection requires at
          least 20 requests and uses a rolling three-second window. Automatic
          rollback is scoped to the checkout-regression scenario.
        </p>
        <h3>Keep the lab separate.</h3>
        <p>
          Use a dedicated Flagsmith environment. Management mutations are
          disabled by default and must be explicitly enabled on the Node server.
          SDK and management keys never reach the browser. The public static
          preview always runs as a sandbox.
        </p>
      </article>
      <aside className="docs-aside">
        <div>
          <BookOpen size={24} />
          <h3>Useful, beyond the demo.</h3>
          <p>
            Self-host it, inspect the engine, or bring the adapter to your own
            project.
          </p>
          <button
            className="button secondary"
            onClick={() => navigate("integrations")}
          >
            <Link2 size={15} />
            Connect Flagsmith
          </button>
        </div>
        <a
          href="https://docs.flagsmith.com/deployment-self-hosting/hosting-guides/docker"
          target="_blank"
          rel="noreferrer"
        >
          Flagsmith self-hosting
          <ExternalLink size={14} />
        </a>
        <a
          href="https://docs.flagsmith.com/integrating-with-flagsmith/sdks/server-side"
          target="_blank"
          rel="noreferrer"
        >
          Server-side SDK reference
          <ExternalLink size={14} />
        </a>
        <a
          href="https://www.wemakedevs.org/hackathons/flagsmith"
          target="_blank"
          rel="noreferrer"
        >
          Toggle Wars hackathon
          <ExternalLink size={14} />
        </a>
      </aside>
    </div>
  );
}
