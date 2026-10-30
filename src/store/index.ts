"use client";

import { useSyncExternalStore } from "react";
import { propertySchema, type PropertyRecord } from "@/domain/property/model";

/**
 * Persistencia local (navegador). Interfaz de repositorio para sustituirla por
 * PostgreSQL/Prisma (ver prisma/schema.prisma) sin cambiar las pantallas.
 * Los datos de esta versión viven solo en este navegador.
 */
export interface PropertyRepository {
  list(): PropertyRecord[];
  get(id: string): PropertyRecord | undefined;
  save(p: PropertyRecord): void;
  remove(id: string): void;
}

export interface Progress {
  lessonsCompleted: string[];
  quizScores: Record<string, { correct: number; total: number; at: string }>;
  negotiations: { personaId: string; score: number; at: string; mode: "ia" | "demo" }[];
  casesOpened: string[];
}

interface State {
  properties: PropertyRecord[];
  currentId: string | null;
  progress: Progress;
}

const KEY = "cfai:v1";
const emptyProgress = (): Progress => ({ lessonsCompleted: [], quizScores: {}, negotiations: [], casesOpened: [] });
const initial: State = { properties: [], currentId: null, progress: emptyProgress() };

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<State>;
    const properties = (parsed.properties ?? []).flatMap((p) => {
      const r = propertySchema.safeParse(p);
      return r.success ? [r.data as PropertyRecord] : [];
    });
    state = {
      properties,
      currentId: typeof parsed.currentId === "string" ? parsed.currentId : null,
      progress: { ...emptyProgress(), ...(parsed.progress ?? {}) },
    };
  } catch {
    state = initial;
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: la app sigue funcionando en memoria */
  }
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  load();
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}

export const repo: PropertyRepository = {
  list: () => getSnapshot().properties,
  get: (id) => getSnapshot().properties.find((p) => p.id === id),
  save: (p) => {
    const list = getSnapshot().properties;
    const exists = list.some((x) => x.id === p.id);
    set({ properties: exists ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list], currentId: p.id });
  },
  remove: (id) => {
    const s = getSnapshot();
    set({ properties: s.properties.filter((p) => p.id !== id), currentId: s.currentId === id ? null : s.currentId });
  },
};

export function setCurrent(id: string | null) {
  set({ currentId: id });
}

export function useCurrentProperty(): PropertyRecord | null {
  const s = useStore();
  return s.properties.find((p) => p.id === s.currentId) ?? null;
}

export function updateProgress(f: (p: Progress) => Progress) {
  set({ progress: f(getSnapshot().progress) });
}
