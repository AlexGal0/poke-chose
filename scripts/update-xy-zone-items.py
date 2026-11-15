"""Refresh public XY item-location facts and localized metadata. No save/ROM access.

Uses the Python standard library. Raw downloads stay in ignored .cache/.
Location instructions are factual source annotations, not game-state flags.
"""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
import csv
import hashlib
import html
import io
import json
import re
import sys
import time
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8')
CACHE = Path('.cache/xy-zone-items')
CACHE.mkdir(parents=True, exist_ok=True)
ROOT = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'

def download(url, file):
    target = CACHE / file
    if not target.exists():
        with urlopen(Request(url, headers={'User-Agent': 'PokeChose public-data updater'}), timeout=45) as response:
            target.write_bytes(response.read())
        time.sleep(0.15)
    return target.read_bytes()

def table(name):
    return list(csv.DictReader(io.StringIO(download(ROOT + name + '.csv', name + '.csv').decode('utf-8'))))

def plain(value):
    value = re.sub(r'<br\s*/?>', ' · ', value, flags=re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', value))).strip()

def norm(value):
    return re.sub('[^a-z0-9]', '', value.lower().replace('é', 'e'))

public_roster = json.loads(Path('src/games/x/data/roster.json').read_text(encoding='utf-8'))
allowed_items = set(map(str, public_roster['itemIndices'].values()))
items = [row for row in table('items') if row['id'] in allowed_items]
names = table('item_names')
categories = {r['id']: r for r in table('item_categories')}
pockets = {r['id']: r['identifier'] for r in table('item_pockets')}
machines = {r['item_id']: r for r in table('machines') if r['version_group_id'] == '15'}
index = {norm(r['identifier']): r for r in items}
for row in names:
    if row['local_language_id'] == '9':
        entry = next((r for r in items if r['id'] == row['item_id']), None)
        if entry: index[norm(row['name'])] = entry
# Older display names used by the location source.
for old, slug in {'Parlyz Heal': 'paralyze-heal', 'Paralyze Heal': 'paralyze-heal', 'Thunderstone': 'thunder-stone', 'DeepSeaTooth': 'deep-sea-tooth', 'DeepSeaScale': 'deep-sea-scale', 'Up-Grade': 'up-grade'}.items():
    if norm(slug) in index: index[norm(old)] = index[norm(slug)]

locations = json.loads(Path('src/games/x/data/locations.json').read_text(encoding='utf-8'))
order_source = Path('src/games/xy/encounters.ts').read_text(encoding='utf-8')
order = json.loads(re.search(r'xyRouteOrder = (\[[^\]]+\])', order_source)[1])
overrides = {599: '6th/lumiosecity', 674: 'kalospowerplant', 675: 'teamflarehq', 1121: None, 657: 'victoryroad', 658: 'pokemonleague', 1056: None}
evolution = {'sun-stone', 'moon-stone', 'fire-stone', 'thunder-stone', 'water-stone', 'leaf-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'oval-stone', 'kings-rock', 'metal-coat', 'dragon-scale', 'up-grade', 'dubious-disc', 'protector', 'electirizer', 'magmarizer', 'reaper-cloth', 'prism-scale', 'razor-claw', 'razor-fang', 'whipped-dream', 'sachet', 'deep-sea-tooth', 'deep-sea-scale'}
catalog = {}
occurrences = []
coverage = []
unresolved = []
exclusive = {**dict.fromkeys(['charizardite-x', 'mewtwonite-x', 'pinsirite', 'manectite', 'tyranitarite'], 'x'), **dict.fromkeys(['charizardite-y', 'mewtwonite-y', 'heracronite', 'houndoominite', 'aggronite'], 'y')}
# This source supplement records the postgame Ring upgrade and the 20:00–21:00 window.
night_stones = {'absolite', 'alakazite', 'aggronite', 'banettite', 'garchompite', 'gyaradosite', 'heracronite', 'houndoominite', 'kangaskhanite', 'manectite', 'mawilite', 'medichamite', 'pinsirite', 'scizorite', 'tyranitarite'}
mega_source = 'https://www.serebii.net/xy/megaevolutions.shtml'
spanish_notes = {
    'From Tierno': 'Te lo entrega Tierno.', 'From Serena': 'Te lo entrega Serena.', 'From Korrina': 'Te lo entrega Corelia tras vencerla en el gimnasio.',
    'From Viola': 'Te lo entrega Violeta tras vencerla en el gimnasio.', 'Given by Calem/Serena': 'Te lo entrega Kalm o Serena.',
    'From Alexa after beating Santalune Gym': 'Te lo entrega Alexia después de superar el gimnasio de Ciudad Novarte.',
    'From Rinka': 'Te los entrega la patinadora de Ciudad Novarte.',
    'From teacher in Trainer School': 'Habla con el profesor de la Escuela de Entrenadores.',
    'Help person in southwestern house by bringing Flying or Psychic-type': 'En la casa del suroeste, muestra un Pokémon de tipo Volador o Psíquico al personaje que lo pide.',
    'Show woman in southwestern house a Pokémon with high happiness': 'En la casa del suroeste, muestra a la mujer un Pokémon con amistad alta.',
    'Show scientist in house next to Pokémon Center your Pokédex': 'Muestra tu Pokédex al científico de la casa junto al Centro Pokémon.',
    'Give Hiker the Intriguing Stone': 'Entrega la Piedra Insólita al montañero.',
    'Trade for a Sitrus Berry in north-western house': 'En la casa del noroeste, intercambia una Baya Zidra por este objeto.',
    'Across the pond - Requires Surf': 'Cruza el estanque usando Surf.',
    'By north exit - Requires Cut': 'Junto a la salida norte; requiere Corte.',
    'Beneath ledge south of Santalune City': 'Debajo del desnivel, al sur de Ciudad Novarte.',
    'From Professor Sycamore': 'Te lo entrega el Profesor Ciprés; la megapiedra de Kanto depende del inicial elegido y de la edición.',
    'From Girl near entrance': 'Habla con la chica cercana a la entrada.',
    'Person by Pokémon Center': 'Habla con el personaje junto al Centro Pokémon.',
    'Person west of centre': 'Habla con el personaje situado al oeste del centro.',
    'Man in Pokémon Center': 'Habla con el hombre del Centro Pokémon.',
    'Gentleman in Hotel': 'Habla con el caballero del hotel.',
    'Girl north of monorail': 'Habla con la chica al norte del monorraíl.',
}

def resolve(label):
    machine = re.match(r'^(TM|HM)\s*(\d+)', label, flags=re.I)
    if machine: return index.get(norm(f'{machine[1].lower()}{int(machine[2]):02}'))
    return index.get(norm(label))

def metadata(item):
    slug = item['identifier']
    category = categories[item['category_id']]
    pocket = pockets[category['pocket_id']]
    group = 'evolution' if slug in evolution or category['identifier'] == 'evolution' else 'machine' if item['id'] in machines else 'key' if pocket == 'key' else 'berry' if pocket == 'berries' else 'medicine' if pocket == 'medicine' else 'ball' if pocket == 'pokeballs' else 'treasure' if category['identifier'] in ['collectibles', 'loot', 'mulch', 'flutes'] else 'held' if category['identifier'] in ['held-items', 'choice', 'effort-training', 'training', 'bad-held-items', 'plates', 'species-specific', 'type-enhancement', 'mega-stones', 'incense'] else 'other'
    text = {}
    for locale, language in [('es', '7'), ('en', '9')]:
        name = next((r['name'] for r in names if r['item_id'] == item['id'] and r['local_language_id'] == language), None)
        # XY Spanish item flavor rows upstream include mismatches (e.g. Exp. Share
        # describes Metal Coat). Do not publish unchecked effects. Machine move
        # effects come from the independently versioned Gen VI move snapshot.
        text[locale] = {'name': name, 'description': None}
    result = {'id': slug, 'category': group, 'icon': f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{slug}.png', 'localized': text}
    if slug == 'exp-share': result['category'] = 'key'  # Key Item in XY; older generations held it.
    if item['id'] in machines:
        machine = machines[item['id']]
        result['machine'] = {'number': int(machine['machine_number']), 'moveId': int(machine['move_id'])}
        # Machines use a type-colored disc sprite when the item icon is unavailable.
    return result

def method(text):
    lower = text.lower()
    if 'berry tree' in lower or 'berry from stall' in lower: return 'harvest'
    if 'dowsing' in lower or 'hidden' in lower: return 'hidden'
    if re.search(r'\b(trade|exchange|give .* the .*stone)\b', lower): return 'exchange'
    if re.search(r'\b(defeat|beat|reward|prize|win)\b', lower): return 'reward'
    if re.search(r'^(from|given|received|show|help|person|man |girl |gentleman|punk|gift)\b', lower): return 'gift'
    if lower.startswith('answer quiz'): return 'reward'
    if re.search(r'\b(buy|purchase|sold)\b', lower): return 'purchase'
    if re.search(r'^(north|south|east|west|in |on |by |near |behind |beneath |across |left |right |outside |inside |bottom |top |end |middle |between |under |past |after |requires |rock |found |at )', lower): return 'pickup'
    return 'unknown'

for zone_id in order:
    zone = next(r for r in locations if r['id'] == zone_id)
    slug = overrides.get(zone_id, zone['name'].removeprefix('kalos-').replace('-', ''))
    if slug is None:
        coverage.append({'zoneId': zone_id, 'status': 'unrecorded', 'source': None})
        continue
    source = f'https://www.serebii.net/pokearth/kalos/{slug}.shtml'
    try:
        page = download(source, slug.replace('/', '-') + '.html').decode('windows-1252', errors='replace')
    except HTTPError as error:
        if error.code != 404: raise
        print('Missing page:', zone_id, slug)
        coverage.append({'zoneId': zone_id, 'status': 'unrecorded', 'source': source})
        continue
    # Only explicit XY item tables; never trainer held items, shops or another generation.
    sections = list(re.finditer(r'Items\s*-\s*X\s*&(?:amp;)?\s*Y', page, re.I))
    count = 0
    for section in sections:
        table_match = re.search(r'<table\b[^>]*>(.*?)</table>', page[section.end():], re.I | re.S)
        if not table_match: raise ValueError('Item heading without table: ' + source)
        for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', table_match[1], re.I | re.S):
            cells = re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.I | re.S)
            if len(cells) != 3 or plain(cells[1]) == 'Item': continue
            label, detail = plain(cells[1]), plain(cells[2])
            item = resolve(label)
            if not item:
                unresolved.append((zone_id, label, detail))
                continue
            catalog[item['identifier']] = metadata(item)
            # Edition qualifiers are retained and filtered by the adapter, not discarded.
            versions = ['x'] if re.search(r'\bX (?:only|exclusive)\b|\bPok[eé]mon X\b|[-–]\s*X\s*$', detail, re.I) else ['y'] if re.search(r'\bY (?:only|exclusive)\b|\bPok[eé]mon Y\b|[-–]\s*Y\s*$', detail, re.I) else ['x', 'y']
            # Some Pokéarth town pages contain an entire separately selectable subarea.
            target_zone = 605 if zone_id == 604 and detail == '2F' else 600 if zone_id == 599 and item['identifier'] == 'tm24' else 690 if zone_id == 652 and 'Unknown Dungeon' in detail else 1121 if zone_id == 609 and ('taking control of berry field' in detail or item['identifier'] == 'sprinklotad') else zone_id
            signature = f'{target_zone}:{item["identifier"]}:{detail}'
            occurrence_id = 'xy-' + hashlib.sha256(signature.encode()).hexdigest()[:16]
            if any(r['id'] == occurrence_id for r in occurrences): continue
            instructions = {'en': detail}
            if detail in spanish_notes: instructions['es'] = spanish_notes[detail]
            requirements = None
            if item['identifier'] in night_stones:
                requirements = {'en': 'After the League: upgrade the Mega Ring and search between 20:00 and 21:00.', 'es': 'Después de la Liga: mejora el Mega-Aro y busca entre las 20:00 y las 21:00.'}
            occurrences.append({'id': occurrence_id, 'zoneId': target_zone, 'itemId': item['identifier'], 'versions': [exclusive[item['identifier']]] if item['identifier'] in exclusive else versions, 'method': method(detail), 'instructions': instructions, 'requirements': requirements, 'requirementSource': mega_source if requirements else None, 'source': source})
            count += 1
    # Leaf shop tables have their own explicit Price header. Keep purchases distinct
    # from pickups and gifts; generic mart stock may depend on badges/story progress.
    if re.search(r'Shops\s*-\s*X\s*&(?:amp;)?\s*Y', page, re.I):
        # Stop at a nested table as well: some source pages omit the preceding
        # table's closing tag. Header validation prevents treating trainer tables as shops.
        for shop in re.finditer(r'<table\b[^>]*>(.*?)(?=<table\b|</table>)', page, re.I | re.S):
            rows = re.findall(r'<tr\b[^>]*>(.*?)</tr>', shop[1], re.I | re.S)
            if not rows: continue
            headers = [[plain(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.I | re.S)] for row in rows[:3]]
            if ['Picture', 'Item', 'Price'] not in headers: continue
            shop_name = headers[0][0] if len(headers[0]) == 1 else 'Shop'
            shop_es = {'PokéMart - Left Counter': 'Tienda Pokémon · mostrador izquierdo', 'PokéMart - Right Counter': 'Tienda Pokémon · mostrador derecho'}.get(shop_name, shop_name)
            for row in rows:
                cells = re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.I | re.S)
                if len(cells) != 3: continue
                label, price = plain(cells[1]), plain(cells[2])
                if label == 'Item': continue
                item = resolve(label)
                if not item: unresolved.append((zone_id,label,'shop')); continue
                catalog[item['identifier']] = metadata(item)
                signature = f'{zone_id}:{item["identifier"]}:shop:{shop_name}:{price}'
                occurrence_id = 'xy-' + hashlib.sha256(signature.encode()).hexdigest()[:16]
                if any(r['id'] == occurrence_id for r in occurrences): continue
                occurrences.append({'id':occurrence_id,'zoneId':zone_id,'itemId':item['identifier'],'versions':[exclusive[item['identifier']]] if item['identifier'] in exclusive else ['x','y'],'method':'purchase', 'purchase':{'shop':{'en':shop_name,'es':shop_es},'price':price}, 'instructions':{'en':f'{shop_name}. Price: {price}. Stock may depend on badges or story progress.','es':f'{shop_es}. Precio: {price}. La oferta puede depender de las medallas o del progreso.'},'requirements':None,'requirementSource':None,'source':source})
                count += 1
    coverage.append({'zoneId': zone_id, 'status': 'documented' if sections else 'unrecorded', 'source': source})
    print(zone_id, slug, count)

for zone in coverage:
    found = next((row for row in occurrences if row['zoneId'] == zone['zoneId']), None)
    if found:
        zone['status'] = 'documented'
        if zone['source'] is None or zone['zoneId'] in [605, 600, 690, 1121]: zone['source'] = found['source']
if unresolved:
    print('Unresolved item names:', json.dumps(unresolved, ensure_ascii=False, indent=2))
    raise SystemExit('Resolve item aliases before publishing the snapshot')
output = {'versionGroup': 'x-y', 'retrieved': datetime.now(timezone.utc).isoformat(), 'metadataSource': ROOT, 'catalog': list(catalog.values()), 'occurrences': occurrences, 'coverage': coverage}
target = Path('src/games/xy/data/zone-items.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'Saved {len(occurrences)} occurrences, {len(catalog)} items, {len(coverage)} zones')
