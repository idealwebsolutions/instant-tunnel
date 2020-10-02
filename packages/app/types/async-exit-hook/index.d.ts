declare module 'async-exit-hook' {
  declare function exitHook(callback: (done) => void): () => Promise<void>;
  export = exitHook;
}