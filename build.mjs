// Gera o index.html criptografado a partir do arquivo-fonte (sem criptografia).
// Uso: SENHA='...' node build.mjs caminho/para/fonte.html [saida.html]
// O arquivo-fonte NÃO deve ficar no repositório.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";

const [src, out = "index.html"] = process.argv.slice(2);
const senha = process.env.SENHA;
if (!src || !senha) { console.error("Uso: SENHA='...' node build.mjs fonte.html [saida.html]"); process.exit(1); }
const ITER = 600000;
const b64 = u8 => Buffer.from(u8).toString("base64");

let html = readFileSync(src, "utf8");
const m = html.match(/^const DECK = (\{.*\});$/m);
if (!m) throw new Error("const DECK não encontrado");
const appStart = html.indexOf("<script>", html.indexOf(m[0]));
const appEnd = html.lastIndexOf("</script>");
if (appStart < 0 || appEnd < appStart) throw new Error("script do app não encontrado");
const appSrc = html.slice(appStart + 8, appEnd);
if (/<\/script/i.test(appSrc)) throw new Error("app contém </script>");

const salt = randomBytes(16), iv = randomBytes(12);
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(m[1])));
const payload = JSON.stringify({ v: 1, it: ITER, s: b64(salt), iv: b64(iv), ct: b64(ct) });

const gate = readFileSync(new URL("./gate.js", import.meta.url), "utf8");
html = html.replace(m[0], "/* baralho criptografado: ver gate */");
const a = html.indexOf("<script>", html.indexOf("/* baralho criptografado"));
const b = html.lastIndexOf("</script>");
html = html.slice(0, a) +
  `<script type="text/plain" id="app-src">${appSrc}</script>\n` +
  `<script type="application/json" id="deck-enc">${payload}</script>\n` +
  `<script>${gate}</script>` + html.slice(b + 9);
writeFileSync(out, html);
console.log("ok:", out, (html.length / 1e6).toFixed(2) + " MB");
