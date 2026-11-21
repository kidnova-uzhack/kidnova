"""Issue or revoke a child's QR card locally. Never prints the QR secret."""
import argparse
import io
import os
from pathlib import Path
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import qr_identity


def main():
    parser = argparse.ArgumentParser(description='Manage QR cards for existing KidNova child profiles')
    parser.add_argument('--db', type=Path, default=Path(__file__).resolve().parent.parent / 'glowwell.db')
    sub = parser.add_subparsers(dest='action', required=True)
    issue = sub.add_parser('issue', help='Issue or rotate a QR card')
    issue.add_argument('--user', type=int, required=True, help='Verified parent private chat ID')
    issue.add_argument('--output', type=Path, required=True, help='New private PNG path')
    revoke = sub.add_parser('revoke', help='Revoke an existing QR card')
    revoke.add_argument('--user', type=int, required=True)
    args = parser.parse_args()
    if not args.db.is_file():
        parser.error('Existing database not found')

    with sqlite3.connect(str(args.db)) as db:
        qr_identity.init_db(db)
        if args.action == 'revoke':
            qr_identity.revoke(db, args.user)
            print('QR credential revoked.')
            return
        try:
            import qrcode
        except ImportError:
            parser.error('Install QR image dependency: python3 -m pip install qrcode[pil]')
        if not db.execute('SELECT 1 FROM profiles WHERE user=?', (args.user,)).fetchone():
            parser.error('Child profile does not exist')
        token = qr_identity.generate_token()
        image = qrcode.make(token, error_correction=qrcode.constants.ERROR_CORRECT_M,
                            box_size=10, border=4)
        image_bytes = io.BytesIO()
        image.save(image_bytes, format='PNG')
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        fd = os.open(args.output, flags, 0o600)
        try:
            with os.fdopen(fd, 'wb') as file:
                file.write(image_bytes.getvalue())
            qr_identity.issue(db, args.user, token)
        except Exception:
            args.output.unlink(missing_ok=True)
            raise
        print('QR card issued at:', args.output)
        print('Keep the PNG private. Reissuing a card revokes the previous one.')


if __name__ == '__main__':
    main()
