// Camada de banco (supabase-js, service role). Interface `Db` permite trocar por fake nos testes.
import { createClient } from "npm:@supabase/supabase-js@2";

export interface Midia {
  id: string;
  tipo: string | null;
  tipo_produto: string | null;
  legenda: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  publicado_em: string | null;
  curtidas: number | null;
  comentarios: number | null;
}
export interface MidiaRef {
  id: string;
  tipo_produto: string | null;
  publicado_em: string | null;
}
export interface CursorMidia {
  publicado_em: string;
  id: string;
}
export interface SyncRow {
  id: number;
  iniciado_em: string;
}

export interface Db {
  getConfig<T = unknown>(chave: string): Promise<T | null>;
  setConfig(chave: string, valor: unknown): Promise<void>;

  rodandoDesde(iso: string): Promise<SyncRow[]>;
  marcarOrfaos(antesIso: string, detalhe: unknown): Promise<number>;
  iniciarSync(tipo: string): Promise<number>;
  finalizarSync(id: number, status: "ok" | "erro", detalhe: unknown): Promise<void>;

  upsertSnapshot(r: { data: string; seguidores: number | null; seguindo: number | null; n_midias: number | null }): Promise<void>;
  upsertContaDiaria(rows: { data: string; metrica: string; valor: number }[]): Promise<void>;
  diasComMetricas(desde: string): Promise<string[]>;

  idsMidia(): Promise<Set<string>>;
  /** `conhecidos`: ids já existentes (mantêm visto_em); os novos recebem visto_em = agora. */
  upsertMidias(rows: Midia[], conhecidos: Set<string>, agoraIso: string): Promise<void>;
  midiasRecentes(desdeIso: string): Promise<MidiaRef[]>;
  /** Mídias mais antigas que `antesIso`, publicado_em desc, depois do cursor. */
  midiasAntigas(antesIso: string, cursor: CursorMidia | null, limite: number): Promise<MidiaRef[]>;
  marcarInsightsIndisponivel(id: string): Promise<void>;
  inserirInsights(rows: { midia_id: string; capturado_em: string; metrica: string; valor: number }[]): Promise<void>;
}

const LOTE = 500;
const PAGINA = 1000; // limite padrão do PostgREST

function porLotes<T>(xs: T[], n = LOTE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

export function criarDb(url: string, chave: string): Db {
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

  // deno-lint-ignore no-explicit-any
  const ok = <T>(r: { data: T; error: any }, ctx: string): T => {
    if (r.error) throw new Error(`db ${ctx}: ${r.error.message}`);
    return r.data;
  };

  return {
    async getConfig<T>(c: string) {
      const r = await sb.from("psn_ig_config").select("valor").eq("chave", c).maybeSingle();
      return (ok(r, `config ${c}`)?.valor ?? null) as T | null;
    },
    async setConfig(c, valor) {
      ok(
        await sb.from("psn_ig_config").upsert(
          { chave: c, valor, atualizado_em: new Date().toISOString() },
          { onConflict: "chave" },
        ),
        `config ${c}`,
      );
    },

    async rodandoDesde(iso) {
      const r = await sb.from("psn_ig_sync").select("id, iniciado_em")
        .eq("status", "rodando").gte("iniciado_em", iso);
      return ok(r, "sync rodando") ?? [];
    },
    async marcarOrfaos(antesIso, detalhe) {
      const r = await sb.from("psn_ig_sync")
        .update({ status: "erro", finalizado_em: new Date().toISOString(), detalhe })
        .eq("status", "rodando").lt("iniciado_em", antesIso).select("id");
      return (ok(r, "órfãos") ?? []).length;
    },
    async iniciarSync(tipo) {
      const r = await sb.from("psn_ig_sync").insert({ tipo, status: "rodando" }).select("id").single();
      return ok(r, "iniciar sync")!.id as number;
    },
    async finalizarSync(id, status, detalhe) {
      ok(
        await sb.from("psn_ig_sync")
          .update({ status, finalizado_em: new Date().toISOString(), detalhe }).eq("id", id),
        "finalizar sync",
      );
    },

    async upsertSnapshot(r) {
      ok(
        await sb.from("psn_ig_conta_snapshot").upsert(
          { ...r, capturado_em: new Date().toISOString() },
          { onConflict: "data" },
        ),
        "snapshot",
      );
    },
    async upsertContaDiaria(rows) {
      const unicas = new Map(rows.map((r) => [`${r.data}|${r.metrica}`, r])); // evita duplicata no mesmo lote
      for (const lote of porLotes([...unicas.values()])) {
        ok(await sb.from("psn_ig_conta_diaria").upsert(lote, { onConflict: "data,metrica" }), "conta_diaria");
      }
    },
    async diasComMetricas(desde) {
      const dias = new Set<string>();
      for (let de = 0;; de += PAGINA) {
        const r = await sb.from("psn_ig_conta_diaria").select("data")
          .gte("data", desde).neq("metrica", "follower_count")
          .order("data").range(de, de + PAGINA - 1);
        const dados = ok(r, "dias") ?? [];
        for (const x of dados) dias.add(x.data as string);
        if (dados.length < PAGINA) return [...dias];
      }
    },

    async idsMidia() {
      const ids = new Set<string>();
      for (let de = 0;; de += PAGINA) {
        const r = await sb.from("psn_ig_midia").select("id").order("id").range(de, de + PAGINA - 1);
        const dados = ok(r, "ids") ?? [];
        for (const x of dados) ids.add(x.id as string);
        if (dados.length < PAGINA) return ids;
      }
    },
    async upsertMidias(rows, conhecidos, agoraIso) {
      // lotes homogêneos: novos levam visto_em; existentes não o sobrescrevem
      const novos = rows.filter((r) => !conhecidos.has(r.id))
        .map((r) => ({ ...r, visto_em: agoraIso, sincronizado_em: agoraIso }));
      const velhos = rows.filter((r) => conhecidos.has(r.id)).map((r) => ({ ...r, sincronizado_em: agoraIso }));
      for (const lote of [...porLotes(novos), ...porLotes(velhos)]) {
        ok(await sb.from("psn_ig_midia").upsert(lote, { onConflict: "id" }), "midia");
      }
    },
    async midiasRecentes(desdeIso) {
      const out: MidiaRef[] = [];
      for (let de = 0;; de += PAGINA) {
        const r = await sb.from("psn_ig_midia").select("id, tipo_produto, publicado_em")
          .eq("insights_indisponivel", false).gte("publicado_em", desdeIso)
          .order("publicado_em", { ascending: false }).order("id", { ascending: false })
          .range(de, de + PAGINA - 1);
        const dados = (ok(r, "recentes") ?? []) as MidiaRef[];
        out.push(...dados);
        if (dados.length < PAGINA) return out;
      }
    },
    async midiasAntigas(antesIso, cursor, limite) {
      let q = sb.from("psn_ig_midia").select("id, tipo_produto, publicado_em")
        .eq("insights_indisponivel", false).lt("publicado_em", antesIso);
      if (cursor) {
        q = q.or(
          `publicado_em.lt.${cursor.publicado_em},and(publicado_em.eq.${cursor.publicado_em},id.lt.${cursor.id})`,
        );
      }
      const r = await q.order("publicado_em", { ascending: false }).order("id", { ascending: false })
        .limit(limite);
      return (ok(r, "antigas") ?? []) as MidiaRef[];
    },
    async marcarInsightsIndisponivel(id) {
      ok(await sb.from("psn_ig_midia").update({ insights_indisponivel: true }).eq("id", id), "indisponivel");
    },
    async inserirInsights(rows) {
      for (const lote of porLotes(rows)) {
        ok(
          await sb.from("psn_ig_midia_insight").upsert(lote, { onConflict: "midia_id,capturado_em,metrica" }),
          "insights",
        );
      }
    },
  };
}
