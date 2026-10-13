// Regras do webhook do Asaas, sem dependências (testáveis fora do Supabase).
// A decisão usa a cobrança buscada na API do Asaas, nunca o corpo do webhook: assim um evento forjado ou fora de ordem não libera ninguém.

export type Pagamento = { id: string; status: string; customer: string; subscription?: string | null; dueDate: string };
export type Assinatura = { cycle: string } | null;
export type Decisao = { acao: "liberar"; ate: Date } | { acao: "cortar" } | { acao: "ignorar" };

const PAGO = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const ESTORNADO = new Set(["REFUNDED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);
const MESES: Record<string, number> = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12 };
const DIAS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14 };

// Acesso pago vai do vencimento da cobrança até o fim do ciclo, mais uma folga para o próximo pagamento compensar (boleto leva dias).
export function decidir(p: Pagamento, a: Assinatura, opc: { toleranciaDias: number; avulsoMeses: number }): Decisao {
  if (ESTORNADO.has(p.status)) return { acao: "cortar" };
  if (!PAGO.has(p.status) || !/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate || "")) return { acao: "ignorar" };
  const ate = new Date(p.dueDate + "T23:59:59-03:00");
  const ciclo = a ? a.cycle : "";
  if (DIAS[ciclo]) ate.setUTCDate(ate.getUTCDate() + DIAS[ciclo]);
  else ate.setUTCMonth(ate.getUTCMonth() + (MESES[ciclo] || opc.avulsoMeses));
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
