declare module 'async-exit-hook' {
  declare function exitHook(callback: () => void): () => Promise<void>;
}

export = exitHook;