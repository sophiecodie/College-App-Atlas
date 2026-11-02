"use client";

import { Lock, Maximize2, MapPin, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { ART, campusArtFor } from "@/lib/illustrations";

export type MapCollege = {
  slug: string;
  name: string;
  percent: number;
  dueLabel: string | null;
  status: "due_soon" | "in_progress" | "not_started" | "completed";
};

// Map artwork coordinate system (matches map-landscape.svg's viewBox). Slots sit on dry land.
const MAP_W = 1200;
const MAP_H = 760;
const SLOTS: Array<[number, number]> = [
  [430, 250], [820, 310], [700, 480], [990, 430], [360, 480], [900, 620],
  [1080, 250], [470, 650], [1070, 570], [640, 260], [250, 390], [1150, 420],
];

export const STATUS_META = {
  due_soon: { label: "Due soon", color: "#D5707F" },
  in_progress: { label: "In progress", color: "#6E9FD0" },
  not_started: { label: "Not started", color: "#C9B8AE" },
  completed: { label: "Completed", color: "#6FA56A" },
} as const;

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function CampusMap({ colleges }: { colleges: MapCollege[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const placed = colleges.slice(0, SLOTS.length).map((college, index) => ({ college, x: SLOTS[index]![0], y: SLOTS[index]![1] }));
  const openSlots = SLOTS.slice(placed.length, placed.length + 2);
  const pathD = placed.length > 1 ? placed.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ") : "";

  return (
    <div className="campus-map">
      <TransformWrapper initialScale={1} limitToBounds maxScale={2.5} minScale={1} wheel={{ step: 0.08 }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="map-controls">
              <button aria-label="Zoom in" onClick={() => zoomIn()} type="button">
                <Plus size={16} />
              </button>
              <button aria-label="Zoom out" onClick={() => zoomOut()} type="button">
                <Minus size={16} />
              </button>
              <button aria-label="Reset view" onClick={() => resetTransform()} type="button">
                <Maximize2 size={14} />
              </button>
            </div>
            <TransformComponent contentClass="map-content" wrapperClass="map-viewport">
              <div className="map-world" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
                <Image alt="" className="map-art" fill priority sizes="(max-width: 900px) 100vw, 1100px" src={ART.map.src} />
                <svg aria-hidden="true" className="map-path" preserveAspectRatio="none" viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
                  {pathD ? (
                    <motion.path
                      animate={{ opacity: 0.85 }}
                      d={pathD}
                      fill="none"
                      initial={{ opacity: 0 }}
                      stroke="#5B4A45"
                      strokeDasharray="10 10"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                      transition={{ duration: 1, delay: 0.4 }}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                </svg>

                {placed.map(({ college, x, y }, index) => {
                  const meta = STATUS_META[college.status];
                  const art = campusArtFor(college.slug);
                  return (
                    <div
                      className={`map-marker ${selected === college.slug ? "selected" : ""}`}
                      key={college.slug}
                      style={{ left: pct(x, MAP_W), top: pct(y, MAP_H) }}
                    >
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="map-marker-inner"
                        initial={{ opacity: 0, y: 10 }}
                        transition={{ delay: 0.15 + index * 0.08, duration: 0.35 }}
                      >
                      <Link
                        aria-label={`${college.name}: ${meta.label}${college.dueLabel ? `, ${college.dueLabel}` : ""}, ${college.percent}% done`}
                        className="map-card"
                        href={`/colleges/${college.slug}`}
                        onBlur={() => setSelected(null)}
                        onFocus={() => setSelected(college.slug)}
                        onMouseEnter={() => setSelected(college.slug)}
                        onMouseLeave={() => setSelected(null)}
                      >
                        <span className="map-card-head">
                          <strong>{college.name.replace(/ University$| College$/, "")}</strong>
                          {college.dueLabel ? <span style={{ color: meta.color }}>{college.dueLabel}</span> : <span className="muted">{meta.label}</span>}
                        </span>
                        <span className="map-card-art">
                          <Image alt="" fill sizes="160px" src={art.src} />
                        </span>
                        <span className="map-card-progress">
                          <span style={{ width: `${college.percent}%`, background: meta.color }} />
                        </span>
                      </Link>
                      <MapPin aria-hidden="true" className="map-pin" fill={meta.color} size={30} stroke="#fff" strokeWidth={1.5} />
                      </motion.div>
                    </div>
                  );
                })}

                {openSlots.map(([x, y]) => (
                  <Link className="map-marker map-locked" href="/colleges?view=list" key={`${x}-${y}`} style={{ left: pct(x, MAP_W), top: pct(y, MAP_H) }}>
                    <span className="map-card locked">
                      <Lock size={14} />
                      <span>Add a college</span>
                    </span>
                  </Link>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      {colleges.length > SLOTS.length ? (
        <p className="muted map-overflow">Showing your first {SLOTS.length} colleges on the map. Use list view to see all {colleges.length}.</p>
      ) : null}
    </div>
  );
}

export function MapLegend({ counts }: { counts: Record<keyof typeof STATUS_META, number> }) {
  return (
    <ul className="map-legend">
      {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((key) => (
        <li key={key}>
          <MapPin fill={STATUS_META[key].color} size={18} stroke="#fff" />
          <span>{STATUS_META[key].label}</span>
          <strong>{counts[key]}</strong>
        </li>
      ))}
    </ul>
  );
}
