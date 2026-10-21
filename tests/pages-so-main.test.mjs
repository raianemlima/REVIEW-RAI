import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("o workflow de Pages só publica a partir do main", () => {
  const y = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(y, /^\s+if: github\.ref == 'refs\/heads\/main'\s*$/m);
});
