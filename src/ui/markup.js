"use strict";
/* ==========================================================================
   МОДУЛЬ 8b · Markup — разметка приложения и справка

   Живёт внутри зашифрованного бандла: до ввода пароля ни интерфейса,
   ни документации в опубликованных файлах нет — только шифротекст.
   ========================================================================== */
document.title = "Оригами · конструктор заливочных файлов";
document.getElementById("app").innerHTML = `
  <h1>Оригами · конструктор заливочных файлов</h1>
  <p class="sub">Ставки и бюджеты: подставляет значения из мастер-файла в заливочный, собирает файл из нескольких пулов, проверяет его до заливки и сверяет результат после. Всё считается локально — файлы никуда не отправляются.</p>

  <div class="tabs">
    <div class="tab on" data-tab="build">Сборка файла</div>
    <div class="tab" data-tab="verify">Проверка заливки</div>
    <div class="tab" data-tab="help">Как пользоваться</div>
  </div>

<!-- ═════════════════ СБОРКА ═════════════════ -->
<div id="tab-build">
<div class="card" id="c4">
    <div class="step"><span class="num">1</span> Что делаем</div>
    <label class="radio on"><input type="radio" name="scn" value="update" checked>
      <span><b>Дополнить исходник</b><span class="t2">Файл остаётся целиком, меняются только найденные значения.</span></span></label>
    <label class="radio"><input type="radio" name="scn" value="new">
      <span><b>Собрать новый заливочный</b><span class="t2">Только кампании из правил. Так делались файлы по ТОП-50 и B2C.</span></span></label>
    <div id="newOpts" class="hide">
      <hr class="sep">
      <label class="opt"><input type="checkbox" id="onlyChanged"><span><b>Только строки с новым значением</b><span class="t2">Всё, что «без изменений», в файл не попадёт. Так делался бюджетный заливочный.</span></span></label>
    </div>
    <details style="margin-top:10px"><summary>Дополнительно — округление</summary>
      <p class="small muted" style="margin:6px 0 0">Значения и так округляются по правилам математики (0,5 → вверх);
        то, что округлилось бы в 0, не проставляется. Менять нужно редко.</p>
      <label class="opt"><input type="checkbox" id="roundNew" checked><span>Округлять новые значения до целых</span></label>
      <label class="opt"><input type="checkbox" id="roundAll" checked><span>Округлять и нетронутые строки файла</span></label>
    </details>
  </div>
  <div class="card" id="c1">
    <div class="step"><span class="num">2</span> Заливочный из Оригами <span class="hint">— шаблон</span></div>
    <div id="dropCsv" class="drop">Перетащи <b>export_campaign_auto_strategy_*.csv</b><br><span class="small">ставки (goal_values) или бюджеты (weekly_budgets) — тип определится сам</span>
      <input id="fileCsv" type="file" accept=".csv" class="hide"></div>
    <div id="csvInfo"></div>
  </div>

  <div class="card off" id="c2">
    <div class="step"><span class="num">3</span> Мастер-файл <span class="hint">— источник значений</span></div>
    <div id="dropSrc" class="drop">Перетащи <b>xlsx</b> или <b>csv</b><br><span class="small">можно несколько файлов, все листы станут доступны</span>
      <input id="fileSrc" type="file" accept=".xlsx,.xls,.csv" multiple class="hide"></div>
    <div id="srcPane" class="hide"></div>
    <div id="files"></div>
  </div>

  <div class="card off" id="c3">
    <div class="step"><span class="num">4</span> Правила <span class="hint">— какой пул РК из какого листа</span></div>
    <p class="small muted" style="margin-top:-6px">Одно правило = один пул кампаний. Нужно объединить ТОП-50 и B2C в один файл — добавь два правила.</p>
    <div id="rules"></div>
    <div id="missBlock"></div>
    <button id="addRule" class="btn sec mini" style="margin-top:9px">+ правило</button>
  </div>

  
  <div class="card off" id="c5">
    <div class="step"><span class="num">5</span> Проверка и файл</div>
    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
      <button id="go" class="btn" disabled>Собрать и проверить</button>
      <button id="dl" class="btn sec hide">↓ Скачать заливочный</button>
      <button id="dlRep" class="btn sec hide">↓ Отчёт</button>
      <span id="status" class="small muted"></span>
    </div>
    <div id="report"></div>
  </div>
</div>

<!-- ═════════════════ ПРОВЕРКА ═════════════════ -->
<div id="tab-verify" class="hide">
  <div class="card">
    <div class="step"><span class="num">1</span> Свежая выгрузка из Оригами <span class="hint">— уже после заливки</span></div>
    <div id="dropV1" class="drop">Перетащи <b>свежий export_*.csv</b><input id="fileV1" type="file" accept=".csv" class="hide"></div>
    <div id="v1info"></div>
  </div>
  <div class="card">
    <div class="step"><span class="num">2</span> Файл, который заливали</div>
    <div id="dropV2" class="drop">Перетащи <b>заливочный, который отправляли в Оригами</b><input id="fileV2" type="file" accept=".csv" class="hide"></div>
    <div id="v2info"></div>
  </div>
  <div class="card">
    <div class="step"><span class="num">3</span> Результат сверки</div>
    <button id="goV" class="btn" disabled>Сверить</button>
    <div id="vreport"></div>
  </div>
</div>

<!-- ═════════════════ СПРАВКА ═════════════════ -->
<div id="tab-help" class="hide">
  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Порядок работы</h3>
    <ol class="small" style="margin:0;padding-left:18px;line-height:1.85">
      <li>В шаге 1 выбери, что делаем: дополнить исходник или собрать новый заливочный.</li>
      <li>Выгрузи из Оригами заливочный (ставки или недельные бюджеты) и загрузи его в шаге 2.</li>
      <li>В шаге 3 загрузи мастер-файл и отметь нужные листы — грузить всю книгу не нужно.</li>
      <li>В шаге 4 настрой правила: лист, охват (все РК листа или список ID), какой столбец в какую цель.</li>
      <li>Нажми «Собрать и проверить».</li>
      <li>Посмотри чек-лист и замечания, скачай файл и отчёт.</li>
      <li>После заливки — вкладка <b>«Проверка заливки»</b>: свежая выгрузка + залитый файл покажут, что реально встало.</li>
    </ol>
  </div>

  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Правила — несколько пулов одним файлом</h3>
    <p class="small" style="margin:0 0 8px">Одно правило = один пул кампаний. Чтобы собрать, например, ТОП-50 и B2C в один заливочный, добавь два правила:</p>
    <table class="t">
      <tr><th>Правило</th><th>Лист</th><th>Охват</th><th>Столбец → цель</th></tr>
      <tr><td class="k">ТОП-50</td><td>лист с ТОП-50</td><td>список ID</td><td>Новая ставка б2б → B2B заказ и т.д.</td></tr>
      <tr><td class="k">B2C</td><td>лист B2C</td><td>список ID</td><td>Ставка CPA НОВАЯ → Ecommerce: покупка</td></tr>
    </table>
    <p class="small muted" style="margin:8px 0 0">Столбцы подставятся сами — остаётся проверить глазами.
      Если два правила дают одной кампании разные значения, программа покажет это как <b>конфликт</b>.
      В строке «Совпадение» видно, сколько кампаний правила реально есть в заливочном — если там ноль, значит перепутаны файлы.</p>
  </div>

  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Сценарии</h3>
    <ul class="small" style="margin:0;padding-left:18px;line-height:1.8">
      <li><b>Дополнить исходник</b> — файл остаётся целиком, меняются только найденные значения.</li>
      <li><b>Собрать новый заливочный</b> — только кампании из правил (по списку ID или все из листа).</li>
      <li><b>Только строки с новым значением</b> — всё, что «без изменений», в файл не попадёт.</li>
    </ul>
  </div>

  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Что программа делает сама</h3>
    <ul class="small" style="margin:0;padding-left:18px;line-height:1.8">
      <li>Определяет тип заливочного и берёт список целей <b>из него же</b> — подписи целей всегда совпадут.</li>
      <li>Находит строку заголовков листа (встречались 1-я, 3-я и 5-я) и столбец ID.</li>
      <li>Подбирает столбец под цель: «<b>НОВАЯ</b>», «Итоговая» приоритетнее «тек.», «по чеку», «Ветка», «Δ», «кэф».</li>
      <li>Игнорирует «без изменений», <code>#REF!</code>, <code>#ДЕЛ/0!</code>, пустые ячейки и нули.</li>
      <li>Не проставляет значения, округляющиеся в <b>0</b> (например 0,38) — иначе кампания встанет.</li>
      <li>Читает числа с запятой и неразрывным пробелом: <code>294,03</code>, <code>1 500</code>.</li>
      <li>Округляет до целых по правилам математики (0,5 → вверх).</li>
      <li>Сохраняет формат байт в байт: BOM, CRLF, кавычки, <code>="123"</code>. Все колонки кроме Value не трогаются.</li>
    </ul>
  </div>

  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Правило безопасности</h3>
    <div class="box err" style="margin-top:0"><b>Строки для кампаний, которых нет в заливочном, для ставок не создаются никогда.</b><br>
      <span class="small">Оригами сверяет каждую строку с фактической автостратегией кампании и отбивает весь файл:
      «Цель … для размещения «Поиск» не найдена в актуальной автостратегии (строка N)».
      Какие цели у кампании — из мастер-файла не выводится. Такие РК программа покажет отдельным списком:
      их нужно добрать перевыгрузкой из Оригами.</span></div>
    <div class="box warn"><b>Для бюджетов</b> дописать кампанию можно (там нет целей), но только с известным AccountID —
      он берётся из заливочного по логину либо вводится вручную. Номер аккаунта программа не выдумывает.</div>
    <p class="small muted" style="margin:10px 0 0">Перед скачиванием файл независимо проверяется: нет выдуманных строк,
      нет дублей, значения совпадают с отчётом, верное число колонок, целые значения, нет нулей, BOM и CRLF на месте.
      <b>Красный чек-лист — файл заливать нельзя.</b></p>
  </div>

  <div class="card">
    <h3 style="margin:0 0 10px;font-size:16px">Если что-то пошло не так</h3>
    <p class="small" style="margin:0 0 7px"><b>Оригами пишет «цель не найдена в актуальной автостратегии».</b><br>
      В файле строка с целью, которой у кампании нет. Программа таких строк не создаёт — значит файл правили вручную. Собери заново.</p>
    <p class="small" style="margin:0 0 7px"><b>Статус «успешно», но изменений меньше, чем ожидали.</b><br>
      Оригами считает только реальные изменения: то, что уже применилось прошлой заливкой, второй раз не считается.
      Точную картину даст вкладка «Проверка заливки».</p>
    <p class="small" style="margin:0 0 7px"><b>Собралось 0 строк.</b><br>
      Кампании правил не совпали с заливочным. Проверь: тот ли заливочный (дата, аккаунты), тот ли лист,
      верно ли определён столбец ID в «Настройках листов».</p>
    <p class="small" style="margin:0 0 7px"><b>Кампания есть в отчёте, но её нет в заливочном.</b><br>
      Она не попала в выгрузку. Перевыгрузи заливочный с нужным аккаунтом — тогда придут её настоящие цели.</p>
    <p class="small" style="margin:0"><b>Не читается xlsx.</b><br>
      Сохрани нужный лист как CSV и загрузи его — формат поддерживается наравне с xlsx.</p>
  </div>

  </div>

  <footer>
    <div class="fl">
      <span class="tag" id="ver">v3</span>
      <span>работает офлайн, без внешних библиотек</span>
      <span class="dot">·</span>
      <button class="st" id="runTests" title="Прогнать встроенные тесты ядра">▶ самопроверка</button>
    </div>
    <div class="fl">
      <span>Вопросы и ошибки:</span>
      <a class="sup" href="https://t.me/nbalakk" target="_blank" rel="noopener">✈ @nbalakk</a>
    </div>
  </footer>`;
