/**
 * Minimal TypeScript shapes for the parts of the Tiled JSON (`.tmj`) we actually
 * consume. Intentionally narrow — not a model of the full Tiled schema.
 */

export interface TmjProperty {
  name: string;
  type?: string;
  value: unknown;
}

export interface TmjObject {
  id?: number;
  name?: string;
  /** Tiled object "type" (a.k.a. "class"); drives spawning. */
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  properties?: TmjProperty[];
}

export interface TmjTileLayer {
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
}

export interface TmjObjectLayer {
  name: string;
  type: "objectgroup";
  objects: TmjObject[];
}

export type TmjLayer = TmjTileLayer | TmjObjectLayer;

export interface TmjMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TmjLayer[];
}
