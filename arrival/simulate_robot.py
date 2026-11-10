"""Demo only: replace this data with an actual completed sensor reading."""
import json
import os
import urllib.request
import uuid
from datetime import datetime, timezone

payload = {
    'event_id': str(uuid.uuid4()),  # Keep this SAME ID when retrying one arrival.
    'child_id': 'bola_001',
    'measured_at': datetime.now(timezone.utc).isoformat(),
    'temperature_c': 36.6,
    'result': 'in_range',  # DEMO. Real result comes from approved device rules.
}
request = urllib.request.Request(
    os.getenv('ARRIVAL_URL', 'http://127.0.0.1:8080/arrival'),
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json',
             'Authorization': 'Bearer ' + os.environ['DEVICE_API_KEY']}, method='POST')
with urllib.request.urlopen(request, timeout=15) as response:
    print(response.read().decode())
