"""Staff tool: create a one-time KidNova Telegram link code for a demo wristband.

Usage: python3 scripts/link_code_admin.py SIM-RFID-A
       python3 scripts/link_code_admin.py SIM-RFID-E --reusable --days 30   (one code for many judges)
The parent sends /link KN-XXXXXX or opens the printed t.me link. Default: 24 hours, one use.
"""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import bot
import supabase_bridge


def main():
    parser = argparse.ArgumentParser(description='Create a KidNova Telegram link code (demo children only)')
    parser.add_argument('wristband', help='Demo wristband code, e.g. SIM-RFID-A')
    parser.add_argument('--reusable', action='store_true', help='many chats may use the code until it expires')
    parser.add_argument('--days', type=int, default=30, help='validity of a reusable code, 1-90 days')
    args = parser.parse_args()
    settings = bot.load_settings()
    client = supabase_bridge.from_settings(settings)
    if not client:
        parser.error('.env faylda SUPABASE_URL va SUPABASE_SECRET_KEY ni sozlang')
    code = supabase_bridge.new_code()
    try:
        params = {'p_wristband_code': args.wristband.strip().upper(), 'p_code_hash': supabase_bridge.code_hash(code)}
        if args.reusable:
            result = client.rpc('kidnova_create_telegram_reusable_code', dict(params, p_days=args.days))
        else:
            result = client.rpc('kidnova_create_telegram_link_code', params)
    except supabase_bridge.SupabaseError as exc:
        raise SystemExit(f'{exc}. Bilaguzuk kodi to‘g‘rimi va telegram_bridge.sql ishga tushirilganmi?')
    username = settings.get('BOT_USERNAME', '').strip().lstrip('@')
    print(f'{result["child_name"]} uchun ulanish kodi: {code}')
    if username:
        print(f'Bir bosishda ulanish: https://t.me/{username}?start={code}')
    if args.reusable:
        print(f'Ko‘p martalik: {result["expires"]} gacha (Toshkent) istalgan chat ulanishi mumkin')
    else:
        print('Ota-ona botga yuboradi: /link ' + code + '  (24 soat, bir martalik)')


if __name__ == '__main__':
    main()
