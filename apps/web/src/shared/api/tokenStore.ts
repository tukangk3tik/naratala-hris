type Listener = (token: string | null) => void;
let token: string | null = null;
const listeners = new Set<Listener>();

export const tokenStore = {
  get: (): string | null => token,
  set: (t: string | null): void => {
    token = t;
    for (const l of listeners) l(t);
  },
  subscribe: (l: Listener): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
