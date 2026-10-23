// Cloudflare bindings (D1 = DB, R2 = BUCKET) are captured per request in src/server.ts.
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(sql: string): D1Stmt;
  batch(statements: D1Stmt[]): Promise<unknown[]>;
}
export interface R2ObjectLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}
export interface R2Like {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<unknown>;
}

type Bindings = { DB?: D1Like; BUCKET?: R2Like };

export function getBindings(): Bindings {
  const g = globalThis as unknown as { __CF_ENV__?: Bindings; __env__?: Bindings };
  return g.__CF_ENV__ ?? g.__env__ ?? {};
}
