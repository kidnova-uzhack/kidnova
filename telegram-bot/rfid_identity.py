"""Synthetic RFID credentials and attendance links for the KidNova demo."""
import hashlib
import re


TAG_PATTERN = re.compile(r'^KN-RFID-(?:SIM|HW):[A-Za-z0-9_-]{8,64}$')


def init_db(db):
    """Add RFID adapter tables without replacing existing profile data."""
    columns = {row[1] for row in db.execute('PRAGMA table_info(records)')}
    if 'source' not in columns:
        db.execute("ALTER TABLE records ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
    if 'event_id' not in columns:
        db.execute('ALTER TABLE records ADD COLUMN event_id TEXT')
    db.execute('CREATE UNIQUE INDEX IF NOT EXISTS records_event_id_unique '
               'ON records(event_id) WHERE event_id IS NOT NULL')
    db.execute('''CREATE TABLE IF NOT EXISTS rfid_credentials (
        user INTEGER PRIMARY KEY REFERENCES profiles(user),
        tag_hash TEXT NOT NULL UNIQUE,
        assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS attendance_events (
        event_id TEXT PRIMARY KEY,
        user INTEGER NOT NULL REFERENCES profiles(user),
        checked_in_at TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'rfid_simulation',
        screening_record_id INTEGER NOT NULL REFERENCES records(id)
    )''')
    db.execute('CREATE INDEX IF NOT EXISTS attendance_user_time '
               'ON attendance_events(user, checked_in_at)')
    db.commit()


def tag_hash(tag):
    if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
        raise ValueError('Invalid RFID credential')
    return hashlib.sha256(tag.encode('ascii')).hexdigest()


def tag_source(tag):
    tag_hash(tag)
    return 'rfid_simulation' if tag.startswith('KN-RFID-SIM:') else 'rfid_hardware_prototype'


def assign(db, user, tag):
    """Map one normalized adapter credential to an existing child profile."""
    if type(user) is not int or user <= 0:
        raise ValueError('Invalid profile user')
    digest = tag_hash(tag)
    if not db.execute('SELECT 1 FROM profiles WHERE user=?', (user,)).fetchone():
        raise ValueError('Child profile does not exist')
    db.execute('''INSERT INTO rfid_credentials(user,tag_hash) VALUES(?,?)
                  ON CONFLICT(user) DO UPDATE SET tag_hash=excluded.tag_hash,
                  assigned_at=CURRENT_TIMESTAMP''', (user, digest))
    db.commit()


def revoke(db, user):
    db.execute('DELETE FROM rfid_credentials WHERE user=?', (user,))
    db.commit()


def resolve(db, tag, schema='main'):
    digest = tag_hash(tag)
    if schema not in ('main', 'profile'):
        raise ValueError('Invalid schema')
    return db.execute(f'''SELECT p.user,p.name FROM {schema}.rfid_credentials r
                          JOIN {schema}.profiles p ON p.user=r.user
                          WHERE r.tag_hash=?''', (digest,)).fetchone()
