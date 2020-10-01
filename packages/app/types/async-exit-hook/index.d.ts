declare module 'async-exit-hook' {
  declare function exitHook(callback: (done: Function) => void): () => Promise<void>;
  export = exitHook;
}