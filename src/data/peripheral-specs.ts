/**
 * Single source of truth: real, validated specs for peripheral components
 * (MONITOR, KEYBOARD, MOUSE, HEADSET, SPEAKER), keyed by `${type}::${model}`.
 * The JSON data file is consumed by the admin dashboard (via this module) and
 * by tooling (seed / DB backfill) via readFileSync — keep them in sync.
 */
import raw from './peripheral-specs.json';

export const PERIPHERAL_SPECS: Record<string, Record<string, string>> = raw;

const PERIPHERAL_TYPES = ['MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SPEAKER'];
const PERIPHERAL_DISPLAY_ORDER: Record<string, string[]> = {
  MONITOR: ['size', 'resolution', 'refreshRate', 'panel'],
  KEYBOARD: ['switch', 'layout'],
  MOUSE: ['sensor', 'dpi', 'weight', 'wireless'],
  HEADSET: ['driver', 'audio'],
  SPEAKER: ['channels', 'output'],
};

export function isPeripheralType(type: string | null | undefined): boolean {
  return !!type && PERIPHERAL_TYPES.includes(type);
}

export function peripheralSpecsFor(
  type: string | null | undefined,
  model: string | null | undefined,
): Record<string, string> | null {
  if (!type || !model) return null;
  return PERIPHERAL_SPECS[`${type}::${model}`] ?? null;
}

/**
 * Render a peripheral component's valid specs as one display line, e.g.
 * `24" · 1920x1080 · 180Hz · IPS`. Uses the stored model to look up real
 * specs; falls back to the model number (and name-derived size/Hz for
 * monitors) when nothing is known.
 */
export function peripheralDisplayLine(
  type: string | null | undefined,
  model: string | null | undefined,
  name: string,
  stored: Record<string, unknown> = {},
): string[] {
  const known = peripheralSpecsFor(type, model);
  if (known) {
    const parts = (PERIPHERAL_DISPLAY_ORDER[type ?? ''] ?? Object.keys(known))
      .map((k) => (k in known ? known[k] : /^[a-z]/i.test(k) && stored[k] ? stored[k] : ''))
      .map(firstOf)
      .filter(Boolean) as string[];
    return parts.length > 0 ? parts : [model ?? ''];
  }

  const fromStored = (PERIPHERAL_DISPLAY_ORDER[type ?? ''] ?? []).map((k) => toStr(stored[k])).filter(Boolean);
  if (fromStored.length > 0) return fromStored;

  if (type === 'MONITOR') {
    const size = name.match(/(\d+(?:\.\d+)?\s*")/)?.[0];
    const hz = name.match(/(\d+\s*Hz)/i)?.[0];
    return [size, hz].filter(Boolean) as string[];
  }
  return model ? [model] : [];
}

function firstOf(v: unknown): string {
  return toStr(Array.isArray(v) ? v[0] : v);
}

function toStr(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}
