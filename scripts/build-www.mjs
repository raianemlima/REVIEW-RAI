// Monta a pasta www/ (conteúdo do app de iPhone) a partir do site publicado.
import { rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
const out = "www";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ["index.html", "manifest.webmanifest", "privacidade.html"]) if (existsSync(f)) cpSync(f, `${out}/${f}`);
for (const d of ["icons", "fonts"]) cpSync(d, `${out}/${d}`, { recursive: true });
console.log("www pronto");
