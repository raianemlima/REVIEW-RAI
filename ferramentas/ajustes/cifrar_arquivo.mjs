// Cifra um arquivo (ex.: PDF) para ele ir ao site sem ficar aberto a quem não assina.
// Uso: node ferramentas/ajustes/cifrar_arquivo.mjs arquivo.pdf id "Título" "Descrição" [chave-arquivos.json]
//
// Gera arquivos/<id>.bin (cifrado com AES-GCM, pode ir para o GitHub) e anota a chave em chave-arquivos.json.
// A chave NÃO pode ir para o GitHub: guarde chave-arquivos.json junto do fonte.html. O preparar_fonte.py coloca
// a chave dentro do baralho cifrado, e só quem tem assinatura abre o baralho e, com ele, o arquivo.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [arq, id, titulo, descricao = "", chaves = "chave-arquivos.json"] = process.argv.slice(2);
if (!arq || !/^[a-z0-9-]+$/.test(id || "") || !titulo) {
  console.error('Uso: node cifrar_arquivo.mjs arquivo.pdf id-em-minusculas "Título" "Descrição" [chave-arquivos.json]'); process.exit(1);
}
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dados = readFileSync(arq), k = randomBytes(32), iv = randomBytes(12);
const key = await crypto.subtle.importKey("raw", k, "AES-GCM", false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dados));
mkdirSync(join(raiz, "arquivos"), { recursive: true });
writeFileSync(join(raiz, "arquivos", id + ".bin"), ct);
const lista = existsSync(chaves) ? JSON.parse(readFileSync(chaves, "utf8")).filter(x => x.id !== id) : [];
lista.push({ id, titulo, descricao, nome: basename(arq), arquivo: `arquivos/${id}.bin`, bytes: dados.length,
  k: Buffer.from(k).toString("base64"), iv: Buffer.from(iv).toString("base64") });
writeFileSync(chaves, JSON.stringify(lista, null, 1));
console.log(`ok: arquivos/${id}.bin (${(ct.length / 1e6).toFixed(2)} MB) · chave anotada em ${chaves}: guarde junto do fonte.html, fora do GitHub`);
