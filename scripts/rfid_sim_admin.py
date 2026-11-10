"""Map or revoke synthetic RFID tags without displaying the stored tag."""
import argparse
from pathlib import Path
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import rfid_identity


def main():
    parser = argparse.ArgumentParser(
        description='Manage software-only RFID mappings for synthetic profiles')
    parser.add_argument('--db', type=Path,
                        default=Path(__file__).resolve().parent.parent / 'glowwell.db')
    sub = parser.add_subparsers(dest='action', required=True)
    assign = sub.add_parser('assign', help='Assign a synthetic RFID tag')
    assign.add_argument('--user', type=int, required=True,
                        help='Existing synthetic profile chat ID')
    assign.add_argument('--tag', required=True,
                        help='Synthetic tag in KN-RFID-SIM:... format')
    revoke = sub.add_parser('revoke', help='Revoke a synthetic RFID tag')
    revoke.add_argument('--user', type=int, required=True)
    args = parser.parse_args()
    if not args.db.is_file():
        parser.error('Existing database not found')

    with sqlite3.connect(str(args.db)) as db:
        rfid_identity.init_db(db)
        if args.action == 'assign':
            rfid_identity.assign(db, args.user, args.tag)
            print('Synthetic RFID tag mapped. Tag value was not stored in plaintext.')
        else:
            rfid_identity.revoke(db, args.user)
            print('Synthetic RFID tag revoked.')


if __name__ == '__main__':
    main()
