#!/usr/bin/env python3
"""Компактная выжимка ответов агентов: одно дерево на файл, длинные строки
обрезаны, цитаты и списки источников свёрнуты в число. Делается машиной из
*.json; сама выжимка — не документ проекта, а способ прочитать сырьё."""
import json, pathlib, sys
LIM = int(sys.argv[1]) if len(sys.argv) > 1 else 240
SKIP = {'quotes', 'sourcesRead', 'sourcesFailed'}
def cut(s): s = ' '.join(str(s).split()); return s if len(s) <= LIM else s[:LIM] + '…'
def walk(v, ind=0):
    p = '  ' * ind
    if isinstance(v, dict):
        for k, x in v.items():
            if k in SKIP: print(f'{p}{k}: {len(x) if isinstance(x, list) else cut(x)}'); continue
            if isinstance(x, (dict, list)) and x: print(f'{p}{k}:'); walk(x, ind + 1)
            else: print(f'{p}{k}: {cut(x)}')
    elif isinstance(v, list):
        for x in v:
            if isinstance(x, dict):
                keys = list(x.keys())
                head = x.get('principle') or x.get('rule') or x.get('name') or x.get('term') or x.get('fact') or x.get('check') or x.get('step')
                if head is not None:
                    print(f'{p}- {cut(head)}')
                    for k in keys:
                        if x[k] is head: continue
                        if isinstance(x[k], (dict, list)) and x[k]: print(f'{p}    {k}:'); walk(x[k], ind + 3)
                        else: print(f'{p}    {k}: {cut(x[k])}')
                else: print(f'{p}-'); walk(x, ind + 1)
            else: print(f'{p}- {cut(x)}')
for f in sorted(pathlib.Path('.').glob('*/*.json')):
    print(f'\n\n===== {f} =====')
    walk(json.loads(f.read_text()))
