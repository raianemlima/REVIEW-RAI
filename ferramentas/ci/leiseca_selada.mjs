// Lei seca do curso "selada" com a senha do app: dispensa um segredo a mais no repositório.
//
// Da senha do app (segredo APP_SENHA) sai, por PBKDF2, um par de chaves X25519. Só a chave PÚBLICA fica no
// repositório (leiseca-cifrada/chave-publica.txt): com ela qualquer um sela a lei seca (cifrar_leiseca.mjs), mas só
// quem tem a senha abre (aplicar_leiseca.mjs, na publicação). Resistência igual à do deck.enc: mesma senha, mesmas
// 600 mil iterações de PBKDF2-SHA-256.
//
// Formato do .bin selado: "LSX1" | chave pública efêmera (32) | iv (12) | AES-256-GCM(gzip(JSON)).
// A chave do AES sai de HKDF-SHA-256(segredo X25519, sal = efêmera || pública, info = INFO).
//
// Uso direto (mostra a chave pública que corresponde à senha): APP_SENHA=... node ferramentas/ci/leiseca_selada.mjs
import { createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { fileURLToPath } from "node:url";

export const MAGICA = Buffer.from("LSX1");
const SAL = "review-rai/leiseca-curso/x25519/v1", ITERACOES = 600000, INFO = "review-rai leiseca-curso v1";
const PKCS8 = Buffer.from("302e020100300506032b656e04220420", "hex"), SPKI = Buffer.from("302a300506032b656e032100", "hex");

const publicaDe = raw => createPublicKey({ key: Buffer.concat([SPKI, raw]), format: "der", type: "spki" });
const rawDe = chavePublica => Buffer.from(chavePublica.export({ format: "jwk" }).x, "base64url");
function chaveAes(segredo, efemera, publica) {
  return Buffer.from(hkdfSync("sha256", segredo, Buffer.concat([efemera, publica]), INFO, 32));
}

export function parDaSenha(senha) {
  const d = pbkdf2Sync(String(senha), SAL, ITERACOES, 32, "sha256");
  const privada = createPrivateKey({ key: Buffer.concat([PKCS8, d]), format: "der", type: "pkcs8" });
  return { privada, publica: rawDe(createPublicKey(privada)) };
}

export const ehSelado = buf => buf.length > 48 && buf.subarray(0, 4).equals(MAGICA);

export function selar(publicaB64, dados) {
  const publica = Buffer.from(String(publicaB64).trim(), "base64");
  if (publica.length !== 32) throw new Error("chave pública inválida (precisa ter 32 bytes em base64)");
  const { privateKey, publicKey } = generateKeyPairSync("x25519");
  const efemera = rawDe(publicKey);
  const k = chaveAes(diffieHellman({ privateKey, publicKey: publicaDe(publica) }), efemera, publica), iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv), ct = Buffer.concat([c.update(dados), c.final(), c.getAuthTag()]);
  return Buffer.concat([MAGICA, efemera, iv, ct]);
}

export function abrir(par, buf) {
  const efemera = buf.subarray(4, 36), iv = buf.subarray(36, 48), ct = buf.subarray(48, buf.length - 16), tag = buf.subarray(buf.length - 16);
  const k = chaveAes(diffieHellman({ privateKey: par.privada, publicKey: publicaDe(efemera) }), efemera, par.publica);
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.APP_SENHA) { console.error("Defina APP_SENHA."); process.exit(1); }
  console.log(parDaSenha(process.env.APP_SENHA).publica.toString("base64"));
}
