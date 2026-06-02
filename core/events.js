// Minimal sensory-event queue. core/ pushes; the platform audio/feedback adapter drains.
let queue = [];
export function emit(type, name) { queue.push({ type, name }); }
export function drainEvents() { const out = queue; queue = []; return out; }
