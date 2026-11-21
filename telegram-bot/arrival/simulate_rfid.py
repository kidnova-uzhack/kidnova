"""Software-only RFID and non-contact temperature simulation.

Requires a synthetic tag already mapped to an existing synthetic profile. The
server stores a parent notification preview but never sends it to Telegram.
"""
import json
import os
import urllib.request
import uuid
from datetime import datetime, timezone


payload = {
    'event_id': os.getenv('RFID_SIM_EVENT_ID', str(uuid.uuid4())),
    'rfid_tag': os.environ['SYNTHETIC_RFID_TAG'],
    'measured_at': datetime.now(timezone.utc).isoformat(),
    'temperature_c': float(os.getenv('RFID_SIM_TEMPERATURE_C', '36.6')),
    'result': os.getenv('RFID_SIM_RESULT', 'in_range'),
}
request = urllib.request.Request(
    os.getenv('ARRIVAL_URL', 'http://127.0.0.1:8080/arrival'),
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json',
             'Authorization': 'Bearer ' + os.environ['DEVICE_API_KEY']}, method='POST')
with urllib.request.urlopen(request, timeout=15) as response:
    print(response.read().decode())
