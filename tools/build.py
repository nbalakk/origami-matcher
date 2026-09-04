#!/usr/bin/env python3
"""Сборка приложения.

    python tools/build.py

Что делает:
  • index.html                — точка входа для GitHub Pages: подключает src/**.js
                                с версией по хешу, чтобы у пользователей не залипал кеш;
  • dist/origami-matcher.html — автономная сборка: все модули встроены в один файл,
                                работает офлайн двойным кликом.

Порядок модулей задан явно: ядро → чтение xlsx → разметка → интерфейс → тесты → вход.
"""
import hashlib
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELL = os.path.join(ROOT, "src", "ui", "shell.html")
DIST = os.path.join(ROOT, "dist")

MODULES = [
    "src/core/fmt.js",
    "src/core/export.js",
    "src/core/bank.js",
    "src/core/sheet.js",
    "src/core/rules.js",
    "src/core/build.js",
    "src/core/audit.js",
    "src/core/verify.js",
    "src/xlsx/reader.js",
    "src/ui/markup.js",
    "src/ui/app.js",
    "tests/suite.js",
    "src/ui/gate.js",
]


def read(rel):
    return io.open(os.path.join(ROOT, rel), encoding="utf-8").read()


def main():
    shell = read("src/ui/shell.html")
    sources = [(rel, read(rel)) for rel in MODULES]

    digest = hashlib.md5()
    for _, body in sources:
        digest.update(body.encode("utf-8"))
    version = digest.hexdigest()[:8]

    # 1) страница для Pages — обычные теги скриптов, видно структуру проекта
    tags = "\n".join('<script src="{}?v={}"></script>'.format(rel, version) for rel, _ in sources)
    io.open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(
        shell.replace("<!--SCRIPTS-->", tags))

    # 2) автономный файл — всё внутри
    inline = "\n\n".join(
        "/* ---------- {} ---------- */\n{}".format(rel, body.rstrip()) for rel, body in sources)
    os.makedirs(DIST, exist_ok=True)
    io.open(os.path.join(DIST, "origami-matcher.html"), "w", encoding="utf-8").write(
        shell.replace("<!--SCRIPTS-->", "<script>\n" + inline + "\n</script>"))

    print("собрано: index.html и dist/origami-matcher.html")
    print("  модулей: {} · версия {}".format(len(sources), version))


if __name__ == "__main__":
    main()
