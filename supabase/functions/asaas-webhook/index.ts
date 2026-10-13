// Webhook do Asaas: a cada cobrança paga, libera (ou renova) o e-mail do cliente em public.liberados; estorno ou chargeback corta.
// Publicar: supabase functions deploy asaas-webhook --no-verify-jwt   (o Asaas não manda JWT; a proteção é o token abaixo)
// Segredos: ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e, opcionais, ASAAS_API_URL, TOLERANCIA_DIAS, AVULSO_MESES. Passo a passo em docs/ASAAS.md.
import { decidir, normalizarEmail, tokenConfere, type Assinatura, type Pagamento } from "./logica.ts";

const env = (k: string, padrao = "") => Deno.env.get(k) || padrao;
const API = env("ASAAS_API_URL", "https://api.asaas.com/v3");
const resposta = (txt: string, status = 200) => new Response(txt, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

async function asaas<T>(caminho: string): Promise<T> {
  const r = await fetch(API + caminho, { headers: { access_token: env("ASAAS_API_KEY"), "User-Agent": "revisao-dpe-webhook" } });
  if (!r.ok) throw new Error(`Asaas ${caminho}: ${r.status}`);
  return await r.json() as T;
}

async function aplicar(args: Record<string, unknown>) {
  const r = await fetch(env("SUPABASE_URL") + "/rest/v1/rpc/asaas_aplicar", {
    method: "POST",
    headers: { apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: "Bearer " + env("SUPABASE_SERVICE_ROLE_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`asaas_aplicar: ${r.status} ${await r.text()}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta("método não permitido", 405);
  if (!tokenConfere(req.headers.get("asaas-access-token") ?? "", env("ASAAS_WEBHOOK_TOKEN"))) return resposta("não autorizado", 401);
  let ev: { id?: string; event?: string; payment?: { id?: string } };
  try { ev = await req.json(); } catch { return resposta("json inválido", 400); }
  const pid = ev?.payment?.id;
  if (!pid || !String(ev.event || "").startsWith("PAYMENT_")) return resposta("ignorado");

  try {
    const pag = await asaas<Pagamento>(`/payments/${encodeURIComponent(pid)}`);
    const assinatura = pag.subscription ? await asaas<Assinatura>(`/subscriptions/${encodeURIComponent(pag.subscription)}`) : null;
    const d = decidir(pag, assinatura, { toleranciaDias: +env("TOLERANCIA_DIAS", "3"), avulsoMeses: +env("AVULSO_MESES", "1") });
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
