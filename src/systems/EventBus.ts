/**
 * Tiny typed publish/subscribe bus — framework-agnostic (no Phaser) so gameplay
 * systems stay decoupled and unit-testable. Emitters never assume a listener
 * exists; listeners react to typed payloads and hold no gameplay state.
 */

/** Gameplay event → payload map. */
export interface GameplayEventMap {
  /** A collectible was picked up. */
  collect: { value: number; x: number; y: number };
  /** Run score changed (emitted by GameManager). */
  score: { score: number };
  /** Hero took side-contact damage at a point. */
  hurt: { x: number; y: number };
  /** An enemy was defeated (e.g. stomped). */
  defeat: { kind: string; x: number; y: number };
  /** A breakable crate broke. */
  crateBreak: { x: number; y: number };
  /** A checkpoint was activated. */
  checkpoint: { x: number; y: number };
  /** The hero died (pit/hazard) — funnels into a life loss + respawn. */
  die: { cause: string };
  /** Respawn the hero at this point (emitted by GameManager). */
  respawn: { x: number; y: number };
  /** The goal was reached. */
  win: Record<string, never>;
  /** Out of lives. */
  lose: Record<string, never>;
}

export type EventHandler<T> = (payload: T) => void;

/** A typed event emitter. Defaults to {@link GameplayEventMap}. */
export class EventBus<M = GameplayEventMap> {
  private readonly handlers = new Map<keyof M, Set<EventHandler<unknown>>>();

  /** Subscribe to an event; returns an unsubscribe function. */
  on<K extends keyof M>(event: K, handler: EventHandler<M[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  /** Unsubscribe a previously-registered handler. */
  off<K extends keyof M>(event: K, handler: EventHandler<M[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  /** Emit an event to all current listeners. */
  emit<K extends keyof M>(event: K, payload: M[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Iterate a snapshot so a handler may safely unsubscribe during dispatch.
    for (const handler of [...set]) {
      (handler as EventHandler<M[K]>)(payload);
    }
  }

  /** Remove every handler (e.g. on scene shutdown). */
  clear(): void {
    this.handlers.clear();
  }
}
