"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  type Connection,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  applyNodeChanges,
  type NodeChange,
} from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addIdeaCardAction,
  clearUnsavedThemesAction,
  connectIdeasAction,
  createOutlineFromThemeAction,
  deleteConnectionAction,
  deleteIdeaCardAction,
  deleteThemeAction,
  discoverConnectionsAction,
  exploreThemeAction,
  moveIdeaCardAction,
  setThemeSavedAction,
  updateIdeaCardAction,
} from "@/app/essays/studio-actions";
import { ART } from "@/lib/illustrations";
import { IDEA_CATEGORIES, type ThemePayload } from "@/lib/studio/ideas-shared";

export type GardenCard = { id: string; category: string; title: string; detail: string; posX: number; posY: number };
export type GardenConnection = { id: string; sourceCardId: string; targetCardId: string };
export type GardenTheme = { id: string; title: string; cardIds: string[]; saved: boolean; payload: ThemePayload; createdAt: string };

type Props = { cards: GardenCard[]; connections: GardenConnection[]; themes: GardenTheme[]; aiConfigured: boolean };

const CATEGORY = Object.fromEntries(IDEA_CATEGORIES.map((category) => [category.id, category]));
const RATING_LABEL = { strong: "Strong", promising: "Promising", needs_more_detail: "Needs more detail" } as const;

type CardData = { card: GardenCard; selected: boolean; toggle: (id: string) => void; open: (id: string) => void };

function IdeaNode({ data }: NodeProps<Node<CardData>>) {
  const { card, selected, toggle, open } = data;
  const category = CATEGORY[card.category];
  return (
    <div className={`idea-node ${selected ? "chosen" : ""}`} style={{ background: category?.tint ?? "#fff" }}>
      <Handle position={Position.Left} type="target" />
      <div className="idea-node-top">
        <span className="idea-node-category">{category?.label ?? card.category}</span>
        <label className="idea-node-check nodrag" title="Include in Discover Connections">
          <input checked={selected} onChange={() => toggle(card.id)} type="checkbox" />
        </label>
      </div>
      <button className="idea-node-title nodrag" onClick={() => open(card.id)} type="button">
        {card.title}
      </button>
      {card.detail ? <p className="idea-node-detail">{card.detail.slice(0, 110)}{card.detail.length > 110 ? "…" : ""}</p> : null}
      <Handle position={Position.Right} type="source" />
    </div>
  );
}

const nodeTypes = { idea: IdeaNode };

export function IdeaGarden({ cards: initialCards, connections: initialConnections, themes, aiConfigured }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [connections, setConnections] = useState(initialConnections);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoverTheme, setHoverTheme] = useState<string | null>(null);
  const [compare, setCompare] = useState<Set<string>>(new Set());
  const [discover, setDiscover] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [celebrate, setCelebrate] = useState(false);
  const [draft, setDraft] = useState({ category: "memory", title: "", detail: "" });

  const toggle = useCallback((id: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // React Flow stores measured sizes on each node; keep them and only refresh card data.
  const [nodes, setNodes] = useState<Node<CardData>[]>([]);
  useEffect(() => {
    setNodes((current) =>
      cards.map((card) => {
        const existing = current.find((node) => node.id === card.id);
        const data = { card, selected: chosen.has(card.id), toggle, open: setEditingId };
        return existing ? { ...existing, data } : { id: card.id, type: "idea", position: { x: card.posX, y: card.posY }, data };
      }),
    );
  }, [cards, chosen, toggle]);

  const highlighted = themes.find((theme) => theme.id === hoverTheme);
  const edges: Edge[] = useMemo(() => {
    const manual = connections.map((row) => ({ id: row.id, source: row.sourceCardId, target: row.targetCardId, className: "idea-edge" }));
    if (!highlighted) return manual;
    const ids = highlighted.cardIds.filter((id) => cards.some((card) => card.id === id));
    const themeEdges = ids.slice(1).map((id, index) => ({
      id: `theme-${highlighted.id}-${index}`,
      source: ids[index]!,
      target: id,
      animated: true,
      className: "idea-edge theme",
      deletable: false,
    }));
    return [...manual, ...themeEdges];
  }, [connections, highlighted, cards]);

  function onNodesChange(changes: NodeChange<Node<CardData>>[]) {
    setNodes((current) => applyNodeChanges(changes, current));
  }

  async function onNodeDragStop(_: unknown, node: Node) {
    await moveIdeaCardAction(node.id, Math.round(node.position.x), Math.round(node.position.y));
  }

  async function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const result = await connectIdeasAction(connection.source, connection.target);
    if (result.ok && result.data) {
      setConnections((rows) => [...rows, { id: result.data!.id, sourceCardId: connection.source, targetCardId: connection.target }]);
    }
  }

  async function onEdgesDelete(deleted: Edge[]) {
    for (const edge of deleted) {
      if (edge.id.startsWith("theme-")) continue;
      await deleteConnectionAction(edge.id);
      setConnections((rows) => rows.filter((row) => row.id !== edge.id));
    }
  }

  async function addCard(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const result = await addIdeaCardAction(draft);
    if (result.ok) {
      setCards((rows) => [...rows, result.data]);
      setDraft((current) => ({ ...current, title: "", detail: "" }));
    }
  }

  async function runDiscover() {
    setDiscover({ loading: true, error: null });
    const result = await discoverConnectionsAction([...chosen]);
    if (result.ok) {
      setDiscover({ loading: false, error: null });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1800);
      router.refresh();
    } else {
      setDiscover({ loading: false, error: result.error });
    }
  }

  const editing = cards.find((card) => card.id === editingId) ?? null;
  const titleFor = (id: string) => cards.find((card) => card.id === id)?.title ?? "(deleted card)";
  const compared = themes.filter((theme) => compare.has(theme.id));

  return (
    <div className="garden">
      <section className="panel garden-toolbar">
        <form className="garden-add" onSubmit={addCard}>
          <select aria-label="Idea type" className="field" onChange={(event) => setDraft({ ...draft, category: event.target.value })} value={draft.category}>
            {IDEA_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Idea title"
            className="field"
            maxLength={120}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="A short name, e.g. “fixing my grandma's radio”"
            value={draft.title}
          />
          <input
            aria-label="Concrete detail"
            className="field"
            maxLength={1500}
            onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
            placeholder="One concrete detail: what you saw, did, or said"
            value={draft.detail}
          />
          <button className="button" type="submit">
            Plant idea
          </button>
        </form>
        <div className="garden-actions">
          <span className="muted">
            {chosen.size} selected · tick cards to include them, drag between dots to link them yourself
          </span>
          <button className="button button-secondary" onClick={() => setChosen(new Set(cards.map((card) => card.id)))} type="button">
            Select all
          </button>
          <button className="button" disabled={!aiConfigured || chosen.size < 2 || discover.loading} onClick={runDiscover} type="button">
            {discover.loading ? "Looking for connections…" : "Discover Connections ✨"}
          </button>
        </div>
        {!aiConfigured ? <p className="ai-disabled-note">Discover Connections is off until an AI provider key is configured on the server.</p> : null}
        {discover.error ? (
          <div className="essay-error-banner">
            {discover.error}{" "}
            <button className="subtle-link" onClick={runDiscover} type="button">
              Retry
            </button>
          </div>
        ) : null}
      </section>

      <div className="garden-canvas-wrap">
        <div className="garden-canvas">
          {cards.length === 0 ? (
            <div className="garden-empty">
              <Image alt="" className="garden-empty-cat" height={ART.flowers.height} src={ART.flowers.src} width={ART.flowers.width} />
              <strong>Your garden is empty</strong>
              <p className="muted">
                Plant a few ideas that seem unrelated: a hobby, a family ritual, an object you keep, something you notice that others don&apos;t.
                Concrete details make better connections.
              </p>
            </div>
          ) : null}
          <AnimatePresence>
            {celebrate ? (
              <motion.div animate={{ opacity: 1 }} aria-hidden="true" className="garden-celebrate" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
                {[12, 28, 46, 63, 79, 90].map((left, index) => (
                  <motion.span
                    animate={{ y: -60, opacity: [0, 1, 0], scale: [0.6, 1.1, 0.8] }}
                    initial={{ y: 0, opacity: 0 }}
                    key={left}
                    style={{ left: `${left}%`, top: `${40 + (index % 3) * 15}%` }}
                    transition={{ duration: 1.4, delay: index * 0.08 }}
                  >
                    ✦
                  </motion.span>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <ReactFlow
            edges={edges}
            fitView
            nodeTypes={nodeTypes}
            nodes={nodes}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodeDragStop={onNodeDragStop}
            onNodesChange={onNodesChange}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e9ded1" gap={22} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {editing ? <CardEditor card={editing} key={editing.id} onClose={() => setEditingId(null)} onSaved={(card) => setCards((rows) => rows.map((row) => (row.id === card.id ? card : row)))} onDeleted={(id) => { setCards((rows) => rows.filter((row) => row.id !== id)); setChosen((set) => { const next = new Set(set); next.delete(id); return next; }); setEditingId(null); }} /> : null}
      </div>

      <section className="garden-themes">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Themes</span>
            <h2 className="section-title">{themes.length > 0 ? "What your ideas might be saying" : "No themes yet"}</h2>
          </div>
          {themes.some((theme) => !theme.saved) ? (
            <button
              className="button button-secondary"
              onClick={async () => {
                if (window.confirm("Delete all themes you haven't saved?")) {
                  await clearUnsavedThemesAction();
                  router.refresh();
                }
              }}
              type="button"
            >
              Clear unsaved
            </button>
          ) : null}
        </div>

        {compared.length >= 2 ? <CompareThemes themes={compared} titleFor={titleFor} /> : null}

        <div className="theme-grid">
          {themes.map((theme) => (
            <ThemeCard
              compared={compare.has(theme.id)}
              key={theme.id}
              onCompare={() =>
                setCompare((current) => {
                  const next = new Set(current);
                  if (next.has(theme.id)) next.delete(theme.id);
                  else next.add(theme.id);
                  return next;
                })
              }
              onHover={setHoverTheme}
              theme={theme}
              titleFor={titleFor}
              aiConfigured={aiConfigured}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function CardEditor({
  card,
  onClose,
  onSaved,
  onDeleted,
}: {
  card: GardenCard;
  onClose: () => void;
  onSaved: (card: GardenCard) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({ category: card.category, title: card.title, detail: card.detail });
  const [error, setError] = useState<string | null>(null);
  return (
    <aside className="panel garden-editor">
      <div className="subpanel-header">
        <strong>Edit idea</strong>
        <button className="subtle-link" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <select className="field" onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}>
        {IDEA_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
      <input className="field" maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} />
      <textarea
        className="field field-textarea"
        maxLength={1500}
        onChange={(event) => setForm({ ...form, detail: event.target.value })}
        placeholder="What exactly happened? Where were you? What did you notice?"
        rows={6}
        value={form.detail}
      />
      {error ? <div className="essay-error-banner">{error}</div> : null}
      <div className="quick-task-row">
        <button
          className="button"
          onClick={async () => {
            const result = await updateIdeaCardAction(card.id, form);
            if (result.ok) onSaved({ ...card, ...form });
            else setError(result.error);
          }}
          type="button"
        >
          Save
        </button>
        <button
          className="button button-secondary"
          onClick={async () => {
            if (window.confirm("Delete this idea card?")) {
              await deleteIdeaCardAction(card.id);
              onDeleted(card.id);
            }
          }}
          type="button"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}

function ThemeCard({
  theme,
  titleFor,
  compared,
  onCompare,
  onHover,
  aiConfigured,
}: {
  theme: GardenTheme;
  titleFor: (id: string) => string;
  compared: boolean;
  onCompare: () => void;
  onHover: (id: string | null) => void;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const payload = theme.payload;
  const [busy, setBusy] = useState<null | "save" | "explore" | "outline" | "delete">(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setBusy(kind);
    setError(null);
    const result = await action();
    setBusy(null);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    else (after ?? (() => router.refresh()))();
  }

  return (
    <article
      className={`theme-card ${theme.saved ? "saved" : ""}`}
      onMouseEnter={() => onHover(theme.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="theme-card-top">
        <h3>{payload.title}</h3>
        <label className="check-inline muted">
          <input checked={compared} onChange={onCompare} type="checkbox" /> Compare
        </label>
      </div>
      <div className="theme-ratings">
        {(Object.entries(payload.ratings) as Array<[string, keyof typeof RATING_LABEL]>).map(([key, value]) => (
          <span className={`rating-chip ${value}`} key={key}>
            {key === "narrativePotential" ? "Narrative" : key[0]!.toUpperCase() + key.slice(1)}: {RATING_LABEL[value]}
          </span>
        ))}
      </div>
      <div className="theme-cards-used">
        {theme.cardIds.map((id) => (
          <span className="chip" key={id}>
            {titleFor(id)}
          </span>
        ))}
      </div>
      <p>
        <strong>The connection. </strong>
        {payload.connection}
      </p>
      <p>
        <strong>Why it could matter. </strong>
        {payload.whyMeaningful}
      </p>
      <details>
        <summary>Narrative approach &amp; structure</summary>
        <p>{payload.narrativeApproach}</p>
        <ol>
          {payload.structure.map((beat) => (
            <li key={beat}>{beat}</li>
          ))}
        </ol>
        <strong>Possible opening scenes</strong>
        <ul>
          {payload.openingScenes.map((scene) => (
            <li key={scene}>{scene}</li>
          ))}
        </ul>
      </details>
      <div>
        <strong>Reflect on</strong>
        <ul className="theme-questions">
          {payload.reflectiveQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
      {payload.missingDetails.length > 0 ? (
        <p className="muted">
          <strong>Details that would make this specific: </strong>
          {payload.missingDetails.join("; ")}
        </p>
      ) : null}
      {(payload.explorations ?? []).map((exploration) => (
        <div className="theme-exploration" key={exploration.createdAt}>
          <strong>Going deeper</strong>
          <ul>
            {exploration.deeperQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          {exploration.alternativeAngles.length > 0 ? <p className="muted">Other angles: {exploration.alternativeAngles.join(" · ")}</p> : null}
          {exploration.detailsToGather.length > 0 ? <p className="muted">Gather: {exploration.detailsToGather.join(" · ")}</p> : null}
        </div>
      ))}
      <textarea
        className="field field-textarea"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional: add a detail or answer before exploring further"
        rows={2}
        value={note}
      />
      {error ? <div className="essay-error-banner">{error}</div> : null}
      <div className="theme-actions">
        <button className="button button-secondary" disabled={busy !== null} onClick={() => run("save", () => setThemeSavedAction(theme.id, !theme.saved))} type="button">
          {theme.saved ? "Saved ✓" : "Save idea"}
        </button>
        <button
          className="button button-secondary"
          disabled={busy !== null || !aiConfigured}
          onClick={() => run("explore", () => exploreThemeAction(theme.id, note), () => { setNote(""); router.refresh(); })}
          title={aiConfigured ? "" : "AI is not configured"}
          type="button"
        >
          {busy === "explore" ? "Exploring…" : "Explore further"}
        </button>
        <button
          className="button"
          disabled={busy !== null}
          onClick={() => run("outline", () => createOutlineFromThemeAction(theme.id), () => router.push("/essays?section=personal"))}
          type="button"
        >
          Create outline
        </button>
        <button className="subtle-link" disabled={busy !== null} onClick={() => window.confirm("Delete this theme?") && run("delete", () => deleteThemeAction(theme.id))} type="button">
          Delete
        </button>
      </div>
    </article>
  );
}

function CompareThemes({ themes, titleFor }: { themes: GardenTheme[]; titleFor: (id: string) => string }) {
  const rows: Array<[string, (theme: GardenTheme) => string]> = [
    ["Experiences", (theme) => theme.cardIds.map(titleFor).join(", ")],
    ["Authenticity", (theme) => RATING_LABEL[theme.payload.ratings.authenticity]],
    ["Specificity", (theme) => RATING_LABEL[theme.payload.ratings.specificity]],
    ["Narrative potential", (theme) => RATING_LABEL[theme.payload.ratings.narrativePotential]],
    ["Originality", (theme) => RATING_LABEL[theme.payload.ratings.originality]],
    ["Approach", (theme) => theme.payload.narrativeApproach],
    ["Still missing", (theme) => theme.payload.missingDetails.join("; ") || "—"],
  ];
  return (
    <div className="panel compare-panel">
      <strong>Comparing {themes.length} themes</strong>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th />
              {themes.map((theme) => (
                <th key={theme.id}>{theme.payload.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th>{label}</th>
                {themes.map((theme) => (
                  <td key={theme.id}>{value(theme)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
