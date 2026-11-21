"""Public OSM healthcare search; no invented doctor availability."""
import json
import math
import os
from pathlib import Path
import time
import re
import urllib.request
from urllib.parse import urlencode

class SearchError(Exception):
    pass

USER_AGENT = 'KidNovaBot/1.0'
_geocache = {}
_last_geocode = 0


def fetch(url, data=None):
    request = urllib.request.Request(url, data=data, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            result = json.load(response)
    except (OSError, ValueError):
        raise SearchError('Qidiruv xizmati hozir javob bermadi. Birozdan keyin qayta urinib ko‘ring.') from None
    return result


def geocode(place):
    global _last_geocode
    endpoint = os.getenv('NOMINATIM_URL')
    if not endpoint:
        raise SearchError('Aniq natija uchun 📍 Lokatsiyani yuborish tugmasini bosing. Hudud nomi orqali qidirish xizmati hali sozlanmagan.')
    key = place.strip().casefold()
    if key in _geocache:
        return _geocache[key]
    time.sleep(max(0, 1.1 - (time.monotonic() - _last_geocode)))
    _last_geocode = time.monotonic()
    result = fetch(endpoint + '?' + urlencode({
        'q': place, 'format': 'jsonv2', 'countrycodes': 'uz', 'limit': 1}))
    if not isinstance(result, list) or not result:
        raise SearchError('Hudud topilmadi. Aniq lokatsiya yuboring yoki viloyat va tumanni to‘liq yozing.')
    try:
        answer = (float(result[0]['lat']), float(result[0]['lon']), str(result[0]['display_name']))
    except (KeyError, TypeError, ValueError):
        raise SearchError('Hudud koordinatalari olinmadi. Lokatsiya yuboring.') from None
    if len(_geocache) >= 200:
        _geocache.pop(next(iter(_geocache)))
    _geocache[key] = answer
    return answer


def distance(lat, lon, lat2, lon2):
    a, b = math.radians(lat), math.radians(lat2)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(lon2-lon)/2)**2
    return 6371 * 2 * math.asin(math.sqrt(min(1, max(0, h))))


def load_catalog():
    try:
        with (Path(__file__).resolve().parent / 'data' / 'clinics-uz.json').open(encoding='utf-8') as file:
            return json.load(file)
    except (OSError, ValueError):
        raise SearchError('Klinikalar katalogi ochilmadi. Bot masʼuliga murojaat qiling.') from None


def phone_numbers(tags):
    """Retain complete Uzbek numbers and explicit short numbers; never infer area codes."""
    numbers = []
    for key in ('contact:phone', 'phone', 'contact:mobile', 'mobile', 'contact:telephone'):
        for raw in re.split(r'[;,/\n]+', str(tags.get(key, '')).translate(str.maketrans('‐‑‒–—', '-----'))):
            raw = raw.strip()
            if not raw or re.search(r'[^\d\s+().-]', raw):
                continue
            digits = re.sub(r'\D', '', raw)
            if len(digits) == 9 and not raw.startswith('+'):
                digits = '998' + digits
            if digits.startswith('00998'):
                digits = digits[2:]
            if len(digits) == 12 and digits.startswith('998'):
                number = '+' + digits
            elif len(digits) in (3, 4) and not raw.startswith('+'):
                number = digits
            else:
                continue
            if number not in numbers:
                numbers.append(number)
    return numbers


def local_phone_numbers(tags):
    """Show incomplete local numbers honestly, without fabricating a dialing code."""
    result = []
    for key in ('contact:phone', 'phone', 'mobile', 'contact:mobile', 'contact:telephone'):
        for raw in re.split(r'[;,/\n]+', str(tags.get(key, ''))):
            digits = re.sub(r'\D', '', raw)
            if len(digits) == 7 and re.fullmatch(r'[\d\s().-]+', raw.strip()) and digits not in result:
                result.append(digits)
    return result


def load_contacts():
    path = Path(__file__).resolve().parent / 'data' / 'clinic-contacts.json'
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        raise SearchError('Telefon katalogi ochilmadi. Bot masʼuliga murojaat qiling.') from None


def places(lat, lon):
    if not all(math.isfinite(v) for v in (lat, lon)) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise SearchError('Lokatsiya noto‘g‘ri.')
    result = load_catalog()
    contacts = load_contacts()
    if not isinstance(result, dict) or 'elements' not in result or result.get('remark'):
        raise SearchError('Qidiruv yakunlanmadi. Iltimos, qayta urinib ko‘ring.')
    items = []
    for element in result['elements']:
        tags = element.get('tags', {})
        coords = element.get('center', element)
        try:
            latitude, longitude = float(coords['lat']), float(coords['lon'])
            km = distance(lat, lon, latitude, longitude)
        except (KeyError, TypeError, ValueError):
            continue
        if not math.isfinite(km) or km > 15:
            continue
        name = tags.get('name:uz') or tags.get('name') or tags.get('name:ru') or 'Nomi ko‘rsatilmagan tibbiyot muassasasi'
        address = tags.get('addr:full') or ', '.join(str(tags[k]) for k in ('addr:city','addr:street','addr:housenumber') if tags.get(k))
        contact = contacts.get(f'{element.get("type")}/{element.get("id")}', {})
        numbers = phone_numbers({'phone': ';'.join(contact['phones'])}) if contact else phone_numbers(tags)
        local = [] if contact else local_phone_numbers(tags)
        display = numbers + [number + ' (hudud kodi manbada yo‘q)' for number in local]
        items.append({'name': str(name)[:180], 'address': address[:300], 'phone': '\n'.join(display), 'callable_phone': bool(numbers),
                      'phone_label': contact.get('label', ''), 'phone_source': contact.get('source_url', ''),
                      'specialty': str(tags.get('healthcare:speciality') or '')[:200], 'kind': tags.get('healthcare') or tags.get('amenity'),
                      'lat': latitude, 'lon': longitude, 'km': km})
    # Some facilities have both a building and a POI node.
    unique = []
    for item in sorted(items, key=lambda row: row['km']):
        duplicate = next((old for old in unique if old['name'] != 'Nomi ko‘rsatilmagan tibbiyot muassasasi' and old['name'].casefold() == item['name'].casefold() and distance(old['lat'],old['lon'],item['lat'],item['lon']) < .15), None)
        if duplicate:
            # Prefer the duplicate with phone details without transferring its number to another record.
            if not duplicate['phone'] and item['phone']:
                unique[unique.index(duplicate)] = item
            continue
        unique.append(item)
    return sorted(unique, key=lambda row: row['km'])
