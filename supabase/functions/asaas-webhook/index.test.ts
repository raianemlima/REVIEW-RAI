// node --experimental-strip-types --test supabase/functions/asaas-webhook/index.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidir, decidirParcelado, normalizarEmail, tokenConfere } from "./index.ts";

const opc = { toleranciaDias: 3, avulsoMeses: 1 };
const pag = (status: string, extra = {}) => ({ id: "pay_1", status, customer: "cus_1", dueDate: "2026-10-10", ...extra });
const dia = (d: { acao: string; ate?: Date }) => d.acao === "liberar" ? d.ate!.toISOString().slice(0, 10) : d.acao;

test("pago na assinatura mensal: vencimento + 1 mês + folga", () => {
  assert.equal(dia(decidir(pag("RECEIVED", { subscription: "sub_1" }), { cycle: "MONTHLY" }, opc)), "2026-11-14");
});
test("cartão confirmado e anual", () => {
  assert.equal(dia(decidir(pag("CONFIRMED", { subscription: "sub_1" }), { cycle: "YEARLY" }, opc)), "2027-10-14");
});
test("semanal usa dias", () => {
  assert.equal(dia(decidir(pag("RECEIVED"), { cycle: "WEEKLY" }, opc)), "2026-10-21");
});
test("cobrança avulsa usa AVULSO_MESES", () => {
  assert.equal(dia(decidir(pag("RECEIVED_IN_CASH"), null, { toleranciaDias: 0, avulsoMeses: 12 })), "2027-10-11");
});
test("anual à vista (cobrança avulsa de R$ 130) vale 12 meses", () => {
  const o = { toleranciaDias: 3, avulsoMeses: 1, anualValorMin: 100 };
  assert.equal(dia(decidir(pag("RECEIVED", { value: 130 }), null, o)), "2027-10-14");
  assert.equal(dia(decidir(pag("CONFIRMED", { value: 15.99 }), null, o)), "2026-11-14");   // avulsa pequena continua 1 mês
  assert.equal(dia(decidir(pag("RECEIVED", { value: 130, subscription: "sub_1" }), { cycle: "MONTHLY" }, o)), "2026-11-14");   // assinatura manda no ciclo
});
test("anual parcelado em 10x no cartão (todas confirmadas): 12 meses desde a 1ª parcela", () => {
  const o = { toleranciaDias: 3, avulsoMeses: 1, anualValorMin: 100 };
  const ps = Array.from({ length: 10 }, (_, i) => pag("CONFIRMED", { id: "p" + i, value: 13, dueDate: `2026-${String(10 + i > 12 ? i - 2 : 10 + i).padStart(2, "0")}-10`.replace(/^2026-(0[1-7])/, "2027-$1") }));
  assert.equal(dia(decidirParcelado(ps[0], ps, o)), "2027-10-14");
});
test("anual parcelado no boleto: libera a fração paga", () => {
  const o = { toleranciaDias: 3, avulsoMeses: 1, anualValorMin: 100 };
  const ps = Array.from({ length: 10 }, (_, i) => pag(i < 2 ? "RECEIVED" : "PENDING", { id: "p" + i, value: 13, dueDate: i === 0 ? "2026-10-10" : "2026-11-10" }));
  assert.equal(dia(decidirParcelado(ps[1], ps, o)), "2026-12-26");   // 2/10 de 12 meses ≈ 73 dias + 3 de folga
  assert.equal(decidirParcelado(ps[5], ps, o).acao, "ignorar");
  assert.equal(decidirParcelado(pag("REFUNDED"), ps, o).acao, "cortar");
});
test("pendente, vencida ou excluída não mudam nada", () => {
  for (const s of ["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]) assert.equal(decidir(pag(s), null, opc).acao, "ignorar");
});
test("estorno e chargeback cortam", () => {
  for (const s of ["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"]) assert.equal(decidir(pag(s), null, opc).acao, "cortar");
});
test("data inválida não libera", () => {
  assert.equal(decidir(pag("RECEIVED", { dueDate: "" }), null, opc).acao, "ignorar");
});
test("e-mail", () => {
  assert.equal(normalizarEmail("  Aluna@Exemplo.COM "), "aluna@exemplo.com");
  assert.equal(normalizarEmail(null), "");
  assert.equal(normalizarEmail("sem-arroba"), "");
});
test("token", () => {
  const t = "x".repeat(40);
  assert.equal(tokenConfere(t, t), true);
  assert.equal(tokenConfere(t + "y", t), false);
  assert.equal(tokenConfere("", t), false);
  assert.equal(tokenConfere("", ""), false);
  assert.equal(tokenConfere("curto", "curto"), false);
});
