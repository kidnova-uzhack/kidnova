"""Opaque, revocable QR credentials for existing child profiles."""
import hashlib
import re
import secrets
import sqlite3


QR_PATTERN = re.compile(r'^GWQR1:[A-Za-z0-9_-]{43}$')


def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS qr_credentials (
        user INTEGER PRIMARY KEY REFERENCES profiles(user),
        token_hash TEXT NOT NULL UNIQUE,
        issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    columns = {row[1] for row in db.execute('PRAGMA table_info(records)')}
    if 'source' not in columns:
        db.execute("ALTER TABLE records ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
    if 'event_id' not in columns:
        db.execute('ALTER TABLE records ADD COLUMN event_id TEXT')
    db.execute('CREATE UNIQUE INDEX IF NOT EXISTS records_event_id_unique ON records(event_id) WHERE event_id IS NOT NULL')
    db.commit()


def generate_token():
    return 'GWQR1:' + secrets.token_urlsafe(32)


def token_hash(token):
    if not isinstance(token, str) or not QR_PATTERN.fullmatch(token):
        raise ValueError('Invalid QR credential')
    return hashlib.sha256(token.encode('ascii')).hexdigest()


def issue(db, user, token):
    if type(user) is not int or user <= 0:
        raise ValueError('Invalid profile user')
    digest = token_hash(token)
    if not db.execute('SELECT 1 FROM profiles WHERE user=?', (user,)).fetchone():
        raise ValueError('Child profile does not exist')
    db.execute('''INSERT INTO qr_credentials(user,token_hash) VALUES(?,?)
                  ON CONFLICT(user) DO UPDATE SET token_hash=excluded.token_hash,
                  issued_at=CURRENT_TIMESTAMP''', (user, digest))
    db.commit()


def revoke(db, user):
    db.execute('DELETE FROM qr_credentials WHERE user=?', (user,))
    db.commit()


def resolve(db, token, schema='main'):
    digest = token_hash(token)
    if schema not in ('main', 'profile'):
        raise ValueError('Invalid schema')
    return db.execute(f'''SELECT p.user,p.name FROM {schema}.qr_credentials q
                          JOIN {schema}.profiles p ON p.user=q.user
                          WHERE q.token_hash=?''', (digest,)).fetchone()
