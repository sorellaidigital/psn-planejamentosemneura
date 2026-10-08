// Saúde do token: debug_token 1x/dia (se houver app id/secret) e marcação de token inválido (190).
import type { Db } from "./db.ts";
import type { Ctx } from "./coleta.ts";
import { GraphError } from "./graph.ts";

export const CHAVE_TOKEN = "token_saude";
const DIA_MS = 86400000;

export interface TokenSaude {
  valido: boolean;
  expira_em: string | null;
  acesso_dados_expira_em: string | null;
  escopos: string[];
  verificado_em: string;
  erro?: string;
}

const epochParaIso = (s: unknown): string | null =>
  typeof s === "number" && s > 0 ? new Date(s * 1000).toISOString() : null; // 0 = não expira

/** Consulta debug_token no máximo 1x por dia. Falha aqui nunca derruba a coleta. */
export async function verificarToken(ctx: Ctx): Promise<void> {
  if (!ctx.appId || !ctx.appSecret) return;
  const atual = await ctx.db.getConfig<TokenSaude>(CHAVE_TOKEN);
  const ultimo = atual?.verificado_em ? Date.parse(atual.verificado_em) : 0;
  if (ctx.agora().getTime() - ultimo < DIA_MS) return;

  try {
    const res = await ctx.graph.get(
      "debug_token",
      { input_token: ctx.tokenPagina },
      `${ctx.appId}|${ctx.appSecret}`,
    );
    const d = res.data ?? {};
    const saude: TokenSaude = {
      valido: d.is_valid === true,
      expira_em: epochParaIso(d.expires_at),
      acesso_dados_expira_em: epochParaIso(d.data_access_expires_at),
      escopos: Array.isArray(d.scopes) ? d.scopes : [],
      verificado_em: ctx.agora().toISOString(),
    };
    await ctx.db.setConfig(CHAVE_TOKEN, saude);
    ctx.detalhe.token_saude = { valido: saude.valido, expira_em: saude.expira_em };
  } catch (err) {
    if (!(err instanceof GraphError)) throw err; // orçamento esgotado etc. sobem
    ctx.detalhe.token_saude_erro = err.message; // já redigida
  }
}

/** Registra token inválido/expirado (erro 190) preservando o que já se sabia. */
export async function marcarTokenInvalido(db: Db, mensagem: string, agora: Date): Promise<void> {
  const atual = await db.getConfig<TokenSaude>(CHAVE_TOKEN);
  await db.setConfig(CHAVE_TOKEN, {
    expira_em: null,
    acesso_dados_expira_em: null,
    escopos: [],
    ...atual,
    valido: false,
    erro: mensagem,
    verificado_em: agora.toISOString(),
  });
}

/** Coleta bem-sucedida prova que o token funciona: limpa um `valido:false` antigo. */
export async function marcarTokenOk(db: Db): Promise<void> {
  const atual = await db.getConfig<TokenSaude>(CHAVE_TOKEN);
  if (atual && atual.valido === false) {
    const { erro: _erro, ...resto } = atual;
    await db.setConfig(CHAVE_TOKEN, { ...resto, valido: true });
  }
}
