/* ============================================================
   adminLookupService — Áreas, Sponsors e Avaliadores em localStorage.
   ============================================================ */
import type { AdminLookup } from "./types";
import { MOCK_AREAS, MOCK_AVALIADORES, MOCK_SPONSORS } from "./mockData";

const LS_KEY_AREAS = "demand-system.areas.v1";
const LS_KEY_SPONSORS = "demand-system.sponsors.v1";
const LS_KEY_AVALIADORES = "demand-system.avaliadores.v1";

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}
function delay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

function loadList(key: string, seed: string[]): AdminLookup[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* recreate */
  }
  const fresh = seed.map((n, i) => ({ id: `${key}-${i + 1}`, nome: n }));
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

let areasCache = loadList(LS_KEY_AREAS, MOCK_AREAS);
let sponsorsCache = loadList(LS_KEY_SPONSORS, MOCK_SPONSORS);
let avaliadoresCache = loadList(LS_KEY_AVALIADORES, MOCK_AVALIADORES);

export const adminLookupService = {
  async listAreas() {
    return delay([...areasCache].sort((a, b) => a.nome.localeCompare(b.nome)));
  },
  async listSponsors() {
    return delay([...sponsorsCache].sort((a, b) => a.nome.localeCompare(b.nome)));
  },
  async listAvaliadores() {
    return delay([...avaliadoresCache].sort((a, b) => a.nome.localeCompare(b.nome)));
  },
  async addArea(nome: string) {
    const novo = { id: uid("area"), nome: nome.trim() };
    areasCache = [...areasCache, novo];
    localStorage.setItem(LS_KEY_AREAS, JSON.stringify(areasCache));
    return delay(novo);
  },
  async addSponsor(nome: string) {
    const novo = { id: uid("spo"), nome: nome.trim() };
    sponsorsCache = [...sponsorsCache, novo];
    localStorage.setItem(LS_KEY_SPONSORS, JSON.stringify(sponsorsCache));
    return delay(novo);
  },
  async addAvaliador(nome: string) {
    const novo = { id: uid("ava"), nome: nome.trim() };
    avaliadoresCache = [...avaliadoresCache, novo];
    localStorage.setItem(LS_KEY_AVALIADORES, JSON.stringify(avaliadoresCache));
    return delay(novo);
  },
  async removeArea(id: string) {
    areasCache = areasCache.filter((a) => a.id !== id);
    localStorage.setItem(LS_KEY_AREAS, JSON.stringify(areasCache));
    return delay(undefined);
  },
  async removeSponsor(id: string) {
    sponsorsCache = sponsorsCache.filter((a) => a.id !== id);
    localStorage.setItem(LS_KEY_SPONSORS, JSON.stringify(sponsorsCache));
    return delay(undefined);
  },
  async removeAvaliador(id: string) {
    avaliadoresCache = avaliadoresCache.filter((a) => a.id !== id);
    localStorage.setItem(LS_KEY_AVALIADORES, JSON.stringify(avaliadoresCache));
    return delay(undefined);
  },
};
