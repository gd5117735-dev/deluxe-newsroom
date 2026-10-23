// Cloudflare storage: native bindings (DB/BUCKET) when present, otherwise the
// Cloudflare REST API using the CF_API_TOKEN secret (works on any host).
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

const ACCOUNT_ID = "998076eba843eecc9ed427910a6b3de7";
const D1_ID = "e8503891-eb29-4edf-b576-087934572999";
const BUCKET_NAME = "bucket";
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`;

function token(): string | undefined {
  return process.env.CF_API_TOKEN;
}

class HttpStmt implements D1Stmt {
  constructor(private sql: string, private params: unknown[] = []) {}
  bind(...values: unknown[]) {
    return new HttpStmt(this.sql, values.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v)));
  }
  private async exec<T>(): Promise<T[]> {
    const res = await fetch(`${API}/d1/database/${D1_ID}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: this.sql, params: this.params }),
    });
    const j = (await res.json()) as { success: boolean; errors?: { message: string }[]; result?: { results: T[] }[] };
    if (!j.success) throw new Error(j.errors?.map((e) => e.message).join("; ") || "D1 error");
    return j.result?.[0]?.results ?? [];
  }
  async all<T>() { return { results: await this.exec<T>() }; }
  async first<T>() { return (await this.exec<T>())[0] ?? null; }
  async run() { return this.exec(); }
}

const httpD1: D1Like = {
  prepare: (sql) => new HttpStmt(sql),
  async batch(stmts) {
    const out: unknown[] = [];
    for (const s of stmts) out.push(await s.run());
    return out;
  },
};

const objUrl = (key: string) => `${API}/r2/buckets/${BUCKET_NAME}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;

const httpR2: R2Like = {
  async put(key, value, opts) {
    const res = await fetch(objUrl(key), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": opts?.httpMetadata?.contentType ?? "application/octet-stream" },
      body: value,
    });
    if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);
  },
  async get(key) {
    const res = await fetch(objUrl(key), { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? undefined;
    return { arrayBuffer: () => res.arrayBuffer(), httpMetadata: { contentType } };
  },
  async delete(key) {
    await fetch(objUrl(key), { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
  },
};

export function getBindings(): Bindings {
  const g = globalThis as unknown as { __CF_ENV__?: Bindings; __env__?: Bindings };
  const native = g.__CF_ENV__ ?? g.__env__ ?? {};
  if (native.DB && native.BUCKET) return native;
  if (!token()) return native;
  return { DB: native.DB ?? httpD1, BUCKET: native.BUCKET ?? httpR2 };
}
