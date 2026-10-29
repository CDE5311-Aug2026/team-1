#!/usr/bin/env python3
"""Import the IntentAI community card kit into the app.

    python3 scripts/community/import-kit.py <path to IntentAI-community-card-kit>

Writes src/data/community/kit.json (people, boards, questions, replies, notifications, feeds, covers: only the fields
the app reads) and copies the images to src/assets/community/kit/: the six portrait sheets (6x6 cells) and the question
covers, re-encoded as JPEG (the kit's PNGs are ~2.5 MB each). All content in the kit is fictional demo data; avatars
and most covers are AI-generated (the kit says so in meta and coverAssets), and the app keeps those flags.
"""
import json, os, re, subprocess, sys

kit = sys.argv[1]
root = os.path.join(os.path.dirname(__file__), '..', '..')
out_img = os.path.join(root, 'src/assets/community/kit')
os.makedirs(out_img, exist_ok=True)
d = json.load(open(os.path.join(kit, 'community-data.json')))

def jpeg(src, dst, size):
    subprocess.run(['sips', '-Z', str(size), '-s', 'format', 'jpeg', '-s', 'formatOptions', '78',
                    os.path.join(kit, src), '--out', os.path.join(out_img, dst)], check=True, capture_output=True)

sheets = [a['file'] for a in d['meta']['atlases']]
for i, f in enumerate(sheets):
    jpeg(f, f'portraits-{i + 1}.jpg', 768)

covers = {}
for c in d['coverAssets']:
    name = re.sub(r'[^a-z0-9-]+', '-', c['id'].lower()).strip('-') + '.jpg'
    jpeg(c['src'], name, 900)
    covers[c['id']] = {'file': name, 'alt': c['alt'], 'generated': c.get('sourceKind') == 'generated'}

age = lambda t: round(t['relativeAgeSeconds'] / 60)
people = [{
    'id': p['id'], 'name': p['displayName'], 'handle': p.get('handle', ''), 'bio': p.get('bio', ''),
    'homeBase': p.get('homeBase'), 'languages': p.get('languages', []), 'interests': p.get('interests', []),
    'boards': p.get('boardIds', []), 'sheet': sheets.index(p['avatar']['atlas']),
    'col': p['avatar']['column'], 'row': p['avatar']['row'],
} for p in d['people']]
cover_of = {c['src']: c['id'] for c in d['coverAssets']}
questions = [{
    'id': q['id'], 'author': q['authorId'], 'board': q['boardId'], 'title': q['title'], 'body': q['body'],
    'tags': q.get('tags', []), 'cover': q['cover']['assetId'] if q.get('cover') else cover_of.get(q.get('image')),
    'coverAlt': (q.get('cover') or {}).get('alt'), 'ago': age(q['time']), 'closed': q['status'] == 'closed',
    'mine': q['ownedByCurrentUser'], 'place': (q.get('location') or {}).get('id'),
} for q in d['questions']]
replies = [{
    'id': r['id'], 'q': r['questionId'], 'parent': r['parentReplyId'], 'author': r['authorId'], 'text': r['text'],
    'likes': r.get('likeCount', 0), 'ago': age(r['time']), 'byAsker': r['authorIsQuestionOwner'], 'mine': r['isCurrentUser'],
    'seq': r.get('sequence', 0),
} for r in d['replies']]
notifications = [{
    'id': n['id'], 'kind': n['type'], 'actor': n['actorId'], 'q': n['questionId'], 'reply': n['replyId'],
    'action': n.get('actionText', ''), 'ago': age(n['time']),
} for n in d['notifications']]
boards = [{'id': b['id'], 'name': b['name'], 'description': b['description']} for b in d['boards']]
out = {
    'about': 'Imported from IntentAI-community-card-kit (schema %s). Fictional demo community; avatars and generated covers are AI-made illustrations.' % d['meta']['schemaVersion'],
    'currentUser': d['currentUserId'], 'people': people, 'boards': boards, 'questions': questions,
    'replies': replies, 'notifications': notifications,
    'feeds': {'top': d['feedOrder']['top'], 'forYou': d['feedOrder']['forYou']}, 'covers': covers,
}
path = os.path.join(root, 'src/data/community/kit.json')
json.dump(out, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(people), 'people ·', len(questions), 'questions ·', len(replies), 'replies ·', len(notifications), 'notifications ·', len(covers), 'covers ·', os.path.getsize(path) // 1024, 'KB')
