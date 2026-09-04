/**
 * Прогон ядра в Node: node --test
 *
 * Модули ядра не зависят от DOM, поэтому их достаточно подложить в globalThis
 * и запустить общий набор проверок из tests/suite.js. Чтение xlsx требует
 * браузерных API (DecompressionStream, DOMParser) — эта часть проверяется
 * в браузере кнопкой «самопроверка».
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const CORE = ["fmt", "export", "bank", "campaigns", "sheet", "rules", "build", "audit"];

for (const name of CORE) {
  const mod = require(path.join(__dirname, "..", "src", "core", `${name}.js`));
  Object.assign(globalThis, mod && mod.default ? mod.default : { [exportName(name)]: mod });
}

function exportName(file) {
  return {
    fmt: "Fmt", export: "Exp", bank: "Bank", campaigns: "Camps", sheet: "Sheet", rules: "Rules",
    build: "Build", audit: "Audit",
  }[file];
}

const suite = require("./suite.js");

test("ядро: набор проверок из практики", async () => {
  const res = await suite.run({ xlsx: false });

  for (const c of res.cases) {
    assert.ok(c.ok, `${c.name}: получено ${c.got}, ожидалось ${c.want}`);
  }
  assert.ok(res.count > 50, `проверок должно быть больше 50, получено ${res.count}`);
  assert.ok(res.ok, "набор должен проходить целиком");

  console.log(`  пройдено проверок: ${res.count}`);
});

test("ядро: модули загружены", () => {
  for (const name of CORE) {
    assert.ok(globalThis[exportName(name)], `модуль ${name} не загрузился`);
  }
});
