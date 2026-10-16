// Webhook do Asaas: a cada cobrança paga, libera (ou renova) o e-mail do cliente em public.liberados; estorno ou chargeback corta.
// Publicar: supabase functions deploy asaas-webhook --no-verify-jwt   (o Asaas não manda JWT; a proteção é o token abaixo)
// Segredos: ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e, opcionais, ASAAS_API_URL, SB_SECRET_KEY, TOLERANCIA_DIAS, AVULSO_MESES, ANUAL_VALOR_MIN. Passo a passo em docs/ASAAS.md.
// Arquivo único de propósito: dá para colar inteiro no editor de Edge Functions do painel do Supabase.

// ---- regras (testadas em index.test.ts) ----
// A decisão usa a cobrança buscada na API do Asaas, nunca o corpo do webhook: assim um evento forjado ou fora de ordem não libera ninguém.

export type Pagamento = { id: string; status: string; customer: string; subscription?: string | null; dueDate: string; value?: number };
export type Assinatura = { cycle: string } | null;
export type Decisao = { acao: "liberar"; ate: Date } | { acao: "cortar" } | { acao: "ignorar" };

const PAGO = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const ESTORNADO = new Set(["REFUNDED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);
const MESES: Record<string, number> = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12 };
const DIAS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14 };

// Acesso pago vai do vencimento da cobrança até o fim do ciclo, mais uma folga para o próximo pagamento compensar (boleto leva dias).
// Plano anual à vista (R$ 130) vendido como cobrança avulsa: vale 12 meses quando o valor chega a ANUAL_VALOR_MIN (padrão R$ 100).
export function decidir(p: Pagamento, a: Assinatura, opc: { toleranciaDias: number; avulsoMeses: number; anualValorMin?: number }): Decisao {
  if (ESTORNADO.has(p.status)) return { acao: "cortar" };
  if (!PAGO.has(p.status) || !/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate || "")) return { acao: "ignorar" };
  const ate = new Date(p.dueDate + "T23:59:59-03:00");
  const ciclo = a ? a.cycle : "";
  if (DIAS[ciclo]) ate.setUTCDate(ate.getUTCDate() + DIAS[ciclo]);
  else ate.setUTCMonth(ate.getUTCMonth() + (MESES[ciclo] || (!a && opc.anualValorMin && (p.value ?? 0) >= opc.anualValorMin ? 12 : opc.avulsoMeses)));
  ate.setUTCDate(ate.getUTCDate() + opc.toleranciaDias);
  return { acao: "liberar", ate };
}

export const normalizarEmail = (e: unknown) => {
  const s = String(e ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : "";
};

// comparação em tempo constante: não deixa medir quantos caracteres do token estão certos
export function tokenConfere(recebido: string, esperado: string): boolean {
  if (!esperado || esperado.length < 32) return false;   // sem token configurado, recusa tudo
  const a = new TextEncoder().encode(recebido), b = new TextEncoder().encode(esperado);
  let dif = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) dif |= (a[i] ?? 0) ^ b[i];
  return dif === 0;
}

const env = (k: string, padrao = "") => Deno.env.get(k) || padrao;
const api = () => env("ASAAS_API_URL", "https://api.asaas.com/v3");
const resposta = (txt: string, status = 200) => new Response(txt, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

async function asaas<T>(caminho: string): Promise<T> {
  const r = await fetch(api() + caminho, { headers: { access_token: env("ASAAS_API_KEY"), "User-Agent": "revisao-dpe-webhook" } });
  if (!r.ok) throw new Error(`Asaas ${caminho}: ${r.status}`);
  return await r.json() as T;
}

// chave de servidor: a nova (sb_secret_..., que o Supabase injeta em SUPABASE_SECRET_KEYS) ou a antiga service_role (JWT)
function chaveServidor(): string {
  if (env("SB_SECRET_KEY")) return env("SB_SECRET_KEY");
  try { const ks = JSON.parse(env("SUPABASE_SECRET_KEYS", "{}")); const k = ks.default || Object.values(ks)[0]; if (k) return String(k); } catch { /* sem chaves novas */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
async function aplicar(args: Record<string, unknown>) {
  const chave = chaveServidor();
  const r = await fetch(env("SUPABASE_URL") + "/rest/v1/rpc/asaas_aplicar", {
    method: "POST",
    headers: { apikey: chave, ...(chave.startsWith("eyJ") ? { Authorization: "Bearer " + chave } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`asaas_aplicar: ${r.status} ${await r.text()}`);
}

// fora do Supabase (nos testes) Deno não existe: só exporta a lógica
if (typeof Deno !== "undefined") Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta("método não permitido", 405);
  if (!tokenConfere(req.headers.get("asaas-access-token") ?? "", env("ASAAS_WEBHOOK_TOKEN"))) return resposta("não autorizado", 401);
  let ev: { id?: string; event?: string; payment?: { id?: string } };
  try { ev = await req.json(); } catch { return resposta("json inválido", 400); }
  const pid = ev?.payment?.id;
  if (!pid || !String(ev.event || "").startsWith("PAYMENT_")) return resposta("ignorado");

  try {
    const pag = await asaas<Pagamento>(`/payments/${encodeURIComponent(pid)}`);
    const assinatura = pag.subscription ? await asaas<Assinatura>(`/subscriptions/${encodeURIComponent(pag.subscription)}`) : null;
    const d = decidir(pag, assinatura, { toleranciaDias: +env("TOLERANCIA_DIAS", "3"), avulsoMeses: +env("AVULSO_MESES", "1"), anualValorMin: +env("ANUAL_VALOR_MIN", "100") });
    if (d.acao === "ignorar") return resposta("ignorado");
    const cliente = await asaas<{ email?: string }>(`/customers/${encodeURIComponent(pag.customer)}`);
    const email = normalizarEmail(cliente.email);
    await aplicar({
      p_email: email || null, p_acao: email ? d.acao : "sem_email", p_ate: d.acao === "liberar" ? d.ate.toISOString() : null,
      p_evento_id: ev.id ?? null, p_evento: ev.event ?? null, p_pagamento: pag.id,
    });
    return resposta(email ? d.acao : "cliente sem e-mail no Asaas");
  } catch (e) {
    console.error(e);
    return resposta("erro temporário", 500);   // o Asaas tenta de novo
  }
});
