#!/usr/bin/env python3
"""Merge researched practical details (address, phone, website, hours, review links, review summary) into
src/data/explore/places.sg.json.

usage: merge-details.py <out-1.json> [<out-2.json> …]
Each input is an array of {id, address?, phone?, website?, hours?, reviews?, reviewSummary?, notes?} written by the
research pass (every value with the page it came from). Editorial rules applied here, on top of the research:
  - values whose only source is a ticket reseller, an events directory or a family blog are dropped;
  - office / member-desk hours are dropped (they are not visiting hours); dated "next open day" text is cut;
  - a place's details are replaced as a whole (re-running with newer files gives the newer values).
Notes stay in the research files; they are not shown in the app.
"""
import json, re, sys

PLACES = 'src/data/explore/places.sg.json'
WEAK = {'singapore-tickets.com', 'TTGmice Planner', 'Little Day Out'}
OFFICE_HOURS = re.compile(r'^(Parliament Secretariat office|Parish secretariat|College offices|Main line / member services desk)', re.I)

places = json.load(open(PLACES, encoding='utf-8'))
by_id = {p['id']: p for p in places}
seen = 0
for path in sys.argv[1:]:
    for r in json.load(open(path, encoding='utf-8')):
        p = by_id.get(r['id'])
        if p is None:
            raise SystemExit(f'unknown place {r["id"]} in {path}')
        d = {}
        for k in ('address', 'phone', 'website', 'hours'):
            v = r.get(k)
            if not v or v.get('source', {}).get('publisher') in WEAK:
                continue
            d[k] = v
        if 'hours' in d:
            t = re.sub(r';\s*next:.*$', '', d['hours']['text']).strip()
            if OFFICE_HOURS.match(t):
                del d['hours']
            else:
                d['hours'] = {**d['hours'], 'text': t}
        if 'address' in d and not d['address'].get('postcode'):
            m = re.search(r'\b(\d{6})\b', d['address']['text'])
            if m:
                d['address']['postcode'] = m.group(1)
        if r.get('reviews'):
            d['reviews'] = [{'title': x['title'], 'url': x['url'], 'publisher': x['publisher']} for x in r['reviews'][:3]]
        if r.get('reviewSummary'):
            d['reviewSummary'] = r['reviewSummary']
        if d:
            p['details'] = d
        else:
            p.pop('details', None)
        seen += 1
json.dump(places, open(PLACES, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(PLACES, 'a').write('\n')
print(f'merged {seen} places; {sum(1 for p in places if p.get("details"))} have details')
