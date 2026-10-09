// Lógica do psn-pauta-upload (injeção de dependências para teste).
export const MAX_BYTES = 10 * 1024 * 1024;
export const STATUS_OK = ["em_producao", "para_revisar", "ajustar"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Db {
  /** Confere o segredo da rotina contra o Vault (RPC psn_pauta_segredo_ok, só service role). */
  segredoOk(segredo: string): Promise<boolean>;
  /** status da pauta, ou null se não existir */
  statusPauta(id: string): Promise<string | null>;
  gravar(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
}
export interface Deps {
  db: Db;
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, erro: "método não permitido" }, 405);

  const segredo = req.headers.get("x-psn-segredo") ?? "";
  if (segredo.length < 16 || !(await deps.db.segredoOk(segredo).catch(() => false))) {
    return json({ ok: false, erro: "não autorizado" }, 401);
  }

  const url = new URL(req.url);
  const pauta = (url.searchParams.get("pauta") ?? "").toLowerCase();
  const nTxt = url.searchParams.get("n") ?? "";
  const n = /^\d{1,2}$/.test(nTxt) ? Number(nTxt) : NaN;
  if (!UUID.test(pauta)) return json({ ok: false, erro: "pauta inválida (uuid)" }, 400);
  if (!(n >= 1 && n <= 20)) return json({ ok: false, erro: "n deve estar entre 1 e 20" }, 400);

  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (declarado > MAX_BYTES + 64 * 1024) return json({ ok: false, erro: "arquivo grande demais (máx. 10 MB)" }, 413);

  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  let bytes: Uint8Array;
  let mime: string;
  try {
    if (ct.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file") ?? form.get("arquivo");
      if (!(f instanceof File)) return json({ ok: false, erro: "campo 'file' ausente" }, 400);
      mime = f.type.toLowerCase();
      bytes = new Uint8Array(await f.arrayBuffer());
    } else {
      mime = ct.split(";")[0].trim();
      bytes = new Uint8Array(await req.arrayBuffer());
    }
  } catch {
    return json({ ok: false, erro: "corpo ilegível" }, 400);
  }
  if (mime !== "image/png" && mime !== "image/jpeg") {
    return json({ ok: false, erro: "content-type deve ser image/png ou image/jpeg" }, 400);
  }
  if (bytes.length === 0) return json({ ok: false, erro: "arquivo vazio" }, 400);
  if (bytes.length > MAX_BYTES) return json({ ok: false, erro: "arquivo grande demais (máx. 10 MB)" }, 413);

  const status = await deps.db.statusPauta(pauta);
  if (status === null) return json({ ok: false, erro: "pauta não encontrada" }, 404);
  if (!STATUS_OK.includes(status)) return json({ ok: false, erro: `pauta em status '${status}'` }, 409);

  const path = `${pauta}/${String(n).padStart(2, "0")}.${mime === "image/png" ? "png" : "jpg"}`;
  try {
    await deps.db.gravar(path, bytes, mime);
  } catch {
    return json({ ok: false, erro: "falha ao gravar no storage" }, 500);
  }
  return json({ ok: true, path });
}
