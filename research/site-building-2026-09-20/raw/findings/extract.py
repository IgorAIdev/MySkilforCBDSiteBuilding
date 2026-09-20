#!/usr/bin/env python3
"""Выгружает ответы агентов исследования из журналов конвейеров в файлы.

Журнал: <transcripts>/subagents/workflows/<run>/journal.jsonl — записи
`started` (key, agentId, label) и `result` (key, agentId, result). Файл на
ответ: <конвейер>/<метка>.json. Запускается повторно без вреда: перезаписывает.
"""
import json, os, sys, pathlib
ROOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(
    '/root/.claude/projects/-home-user-CBD-ecommerce-eu/6e8e2dba-0b57-5e87-b57d-ee05d74677c9/subagents/workflows')
OUT = pathlib.Path(__file__).parent
NAMES = {'wf_70077cd5-6f6': 'space', 'wf_3b24c768-c73': 'site-steps', 'wf_5879cb52-4df': 'next-steps', 'wf_0c80cd72-4bd': 'colour', 'wf_3c8ed712-235': 'rerun'}
# Папка — по префиксу метки агента, а не по конвейеру: перезапуски кладутся туда же, где их тема.
BY_PREFIX = {'pro': 'space', 'repo': 'space', 'steps': 'site-steps', 'next': 'next-steps', 'colour': 'colour'}
total = 0
for run, name in NAMES.items():
    j = ROOT / run / 'journal.jsonl'
    if not j.exists(): continue
    labels, n = {}, 0
    for line in j.open():
        try: e = json.loads(line)
        except json.JSONDecodeError: continue
        if e.get('type') == 'started': labels[e['agentId']] = e.get('label') or e['key']
        if e.get('type') == 'result' and e.get('result') is not None:
            r = e['result']
            # Ответ без единого прочитанного источника — не исследование (20.09.2026 три агента
            # ответили на постороннюю реплику вместо задания); такие не выгружаются.
            if not r.get('sourcesRead') and not r.get('findings'): continue
            raw = labels.get(e['agentId'], e['key'])
            label = raw.replace(':', '_')
            d = OUT / BY_PREFIX.get(raw.split(':')[0], name); d.mkdir(exist_ok=True)
            (d / f'{label}.json').write_text(json.dumps(e['result'], ensure_ascii=False, indent=1))
            n += 1
    print(f'{name}: {n} ответов'); total += n
print('всего', total)
