"""Staff tool: create a one-time KidNova Telegram link code for a demo wristband.

Usage: python3 scripts/link_code_admin.py SIM-RFID-A
The parent sends /link KN-XXXXXX to the bot. Code is valid for 24 hours, one use.
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
    args = parser.parse_args()
    client = supabase_bridge.from_settings(bot.load_settings())
    if not client:
        parser.error('.env faylda SUPABASE_URL va SUPABASE_SECRET_KEY ni sozlang')
    code = supabase_bridge.new_code()
    try:
        result = client.rpc('kidnova_create_telegram_link_code',
                            {'p_wristband_code': args.wristband.strip().upper(),
                             'p_code_hash': supabase_bridge.code_hash(code)})
    except supabase_bridge.SupabaseError as exc:
        raise SystemExit(f'{exc}. Bilaguzuk kodi to‘g‘rimi va telegram_bridge.sql ishga tushirilganmi?')
    print(f'{result["child_name"]} uchun ulanish kodi: {code}')
    print('Ota-ona botga yuboradi: /link ' + code + '  (24 soat, bir martalik)')


if __name__ == '__main__':
    main()
