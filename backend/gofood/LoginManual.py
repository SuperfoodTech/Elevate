import os
import re
import sys
import json
import time
import csv
import requests
from urllib.request import urlopen
from urllib.parse import urlparse, urlencode, urlunparse, parse_qsl
from dotenv import load_dotenv, set_key
from playwright.sync_api import sync_playwright
import socket
try:
    import urllib3.util.connection as urllib3_cn
    urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass


# Muat file .env jika ada
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(parent_env):
    load_dotenv(parent_env, override=True)
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
load_dotenv(override=True)

DEFAULT_OTP_ENDPOINT_URL = (
    os.getenv("OTP_ENDPOINT_URL")
    or "https://script.google.com/macros/s/AKfycbwRViqfGkDtQGmUDD0PycfSGyEBPgx2uaxelHdKIr__4rZ5aq41j1En5Wb96CgEmRvM/exec"
)

# Master credential Google Sheet — sama dengan yang dipakai Grab & Shopee
MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3tLKBNXDqRgBw0mNhKZFxgvKx-JoiTDzm_s5Ix1cm7O6HCv4IvExOLR2HSRVaXSsx82V348mcr9X4/pub?output=csv"


def normalisasi_nomor_hp(nomor_hp):
    if not nomor_hp:
        return ""
    nomor_hp = str(nomor_hp).strip()
    if "@" in nomor_hp:
        return nomor_hp
    nomor_hp = re.sub(r'\D', '', nomor_hp)
    if nomor_hp.startswith("62"):
        return nomor_hp[2:]
    if nomor_hp.startswith("0"):
        return nomor_hp[1:]
    return nomor_hp


def fetch_gofood_outlets():
    """
    Mengambil semua outlet GoFood Live dari master Google Sheet.
    Mengembalikan list of dict:
      {
        'nama_outlet': str,
        'cabang'     : str,
        'email'      : str,   # kolom Y (index 24) — email login
        'phone'      : str,   # kolom AA (index 26) — nomor HP
        'store_id'   : str,
      }
    """
    try:
        import time
        cache_buster_url = MASTER_SHEET_URL + f"&t={int(time.time())}"
        resp = requests.get(cache_buster_url, timeout=30)
        resp.raise_for_status()
        reader_rows = list(csv.reader(resp.text.splitlines()))
    except Exception as e:
        print(f"❌ Gagal mengambil Google Sheet master: {e}")
        return []

    if not reader_rows:
        return []

    header = [str(h).strip().lower() for h in reader_rows[0]]

    def col_idx(names):
        # 1. Exact match dulu
        for n in names:
            n_clean = str(n).strip().lower()
            for i, h in enumerate(header):
                if n_clean == str(h).strip().lower():
                    return i
        # 2. Substring match
        for n in names:
            n_clean = str(n).strip().lower()
            for i, h in enumerate(header):
                h_clean = str(h).strip().lower()
                if n_clean in h_clean or h_clean in n_clean:
                    return i
        return None

    idx_aplikasi = col_idx(['aplikasi'])
    idx_status   = col_idx(['status'])
    idx_outlet   = col_idx(['nama outlet', 'outlet'])
    idx_cabang   = col_idx(['cabang', 'brand'])
    idx_store    = col_idx(['store id', 'store_id', 'merchant id', 'resto id'])
    idx_email_y  = col_idx(['email login go 1', 'email go 1', 'email foodmaster1', 'email foodmaster', 'email 1'])
    if idx_email_y is None:
        idx_email_y = 24   # Kolom Y (0-indexed)
    idx_email_z  = col_idx(['email login go 2', 'email go 2', 'email foodmaster2', 'email duck', 'email 2'])
    if idx_email_z is None:
        idx_email_z = 25   # Kolom Z (0-indexed)
    idx_phone    = 26   # Kolom AA (0-indexed)

    outlets = []
    for row in reader_rows[1:]:
        if len(row) <= idx_phone:
            continue

        aplikasi = str(row[idx_aplikasi]).strip().lower() if idx_aplikasi is not None and len(row) > idx_aplikasi else ''
        status   = str(row[idx_status]).strip().lower()   if idx_status is not None and len(row) > idx_status else ''

        if 'gofood' not in aplikasi:
            continue
        if 'live' not in status:
            continue

        emails = []
        if len(row) > idx_email_y:
            ey = str(row[idx_email_y]).strip()
            if ey and ey != "-" and "@" in ey:
                emails.append(ey)
        if len(row) > idx_email_z:
            ez = str(row[idx_email_z]).strip()
            if ez and ez != "-" and "@" in ez and ez not in emails:
                emails.append(ez)

        email    = emails[0] if emails else ''
        phone    = str(row[idx_phone]).strip() if len(row) > idx_phone else ''
        nama     = str(row[idx_outlet]).strip() if idx_outlet is not None and len(row) > idx_outlet else ''
        cabang   = str(row[idx_cabang]).strip() if idx_cabang is not None and len(row) > idx_cabang else ''
        store_id = str(row[idx_store]).strip()  if idx_store is not None  and len(row) > idx_store  else ''

        outlets.append({
            'nama_outlet': nama,
            'cabang'     : cabang,
            'email'      : email,
            'emails'     : emails,
            'phone'      : phone,
            'store_id'   : store_id,
        })

    return outlets


def ambil_otp_dari_endpoint(url_dasar, action="getOtp", label_email=None):
    """
    Mengambil OTP terbaru dari endpoint Google Apps Script atau langsung dari Google Sheets CSV.
    Menggunakan requests dengan IPv4 dan timeout cepat.
    """
    if not url_dasar:
        raise ValueError("URL endpoint OTP kosong.")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    # Jika URL mengarah langsung ke Google Sheets CSV
    if "docs.google.com/spreadsheets" in url_dasar:
        try:
            resp = requests.get(url_dasar, headers=headers, timeout=(3, 8))
            if resp.status_code == 200:
                content = resp.text.strip()
                lines = content.splitlines()
                if not lines or len(lines) < 2:
                    return ""
                reader = csv.reader(lines)
                rows = list(reader)
                headers_row = [h.strip().lower() for h in rows[0]]
                
                otp_idx = -1
                for idx, h in enumerate(headers_row):
                    if "otp" in h:
                        otp_idx = idx
                        break
                
                if otp_idx == -1:
                    otp_idx = 1 if len(rows[0]) > 1 else 0
                    
                last_row = rows[-1]
                if len(last_row) > otp_idx:
                    return last_row[otp_idx].strip()
                return ""
        except Exception as e:
            print(f"Gagal membaca OTP dari Sheets: {e}")
            return ""

    parsed = urlparse(url_dasar)
    query_params = dict(parse_qsl(parsed.query))
    query_params["action"] = action
    if label_email:
        query_params["label"] = label_email
    url_final = urlunparse(parsed._replace(query=urlencode(query_params)))

    try:
        resp = requests.get(url_final, headers=headers, timeout=(3, 8))
        if resp.status_code == 200:
            return resp.text.strip()
        return ""
    except Exception as e:
        return ""


def tunggu_otp_terbaru(url_dasar, action="getOtp", label_email=None, interval_detik=1.5, otp_awal_override=None, timeout_detik=30):
    """
    Menunggu OTP terbaru yang berbeda dari nilai awal agar tidak memakai OTP sebelumnya.
    otp_awal_override: Jika diisi, gunakan nilai ini sebagai baseline (snapshot sebelum OTP dikirim).
    """
    if otp_awal_override is not None:
        otp_awal = otp_awal_override
    else:
        try:
            otp_awal = ambil_otp_dari_endpoint(url_dasar, action=action, label_email=label_email)
        except Exception:
            otp_awal = ""
    
    batas_waktu = time.time() + timeout_detik
    print(f"   Menunggu OTP baru masuk ke inbox (maksimal {timeout_detik} detik)...")

    while time.time() < batas_waktu:
        time.sleep(interval_detik)
        try:
            otp_baru = ambil_otp_dari_endpoint(url_dasar, action=action, label_email=label_email)
            if otp_baru and otp_baru != otp_awal and otp_baru.isdigit() and len(otp_baru) in (4, 6):
                return otp_baru
        except Exception:
            pass

    return otp_awal


def login_outlet(outlet_info, proxy_config=None):
    """
    Membuka browser Chromium untuk login manual 1 outlet.
    Menunggu sampai access_token cookie / storage terdeteksi.
    Mengembalikan dict session data, atau None jika gagal.
    """
    nama = outlet_info['nama_outlet']
    cabang = outlet_info.get('cabang', '')
    emails_to_try = outlet_info.get('emails', [])
    if not emails_to_try:
        single_email = outlet_info.get('email', '')
        if single_email:
            emails_to_try = [single_email]
    phone = outlet_info.get('phone', '')

    label = f"{nama} - {cabang}" if cabang else nama

    print(f"\n{'='*60}")
    print(f"  LOGIN: {label}")
    if emails_to_try:
        print(f"  Emails: {', '.join(emails_to_try)}")
    if phone:
        print(f"  Phone: {phone}")
    print(f"{'='*60}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disk-cache-size=10485760'
            ]
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1366, 'height': 768},
            proxy=proxy_config
        )

        # Injeksi stealth script
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['id-ID', 'id', 'en-US', 'en']
            });
        """)

        access_token = None
        user_data = None
        all_cookies = []
        local_storage = {}
        session_storage = {}

        for email_idx, current_email in enumerate(emails_to_try or ['']):
            if access_token:
                break

            page = context.new_page()
            if current_email:
                print(f"\n   [Email: {current_email}] Membuka halaman login email langsung...")
                page.goto("https://portal.gofoodmerchant.co.id/auth/login/email", wait_until="domcontentloaded")
            else:
                print("\n   Membuka halaman login...")
                page.goto("https://portal.gofoodmerchant.co.id/auth/login", wait_until="domcontentloaded")

            time.sleep(0.5)

            otp_endpoint = os.getenv("OTP_ENDPOINT_URL") or DEFAULT_OTP_ENDPOINT_URL
            label_email_cfg = os.getenv("GMAIL_OTP_LABEL", "OTP-GO")
            action_type = "getOtpEmail" if current_email else "getOtp"
            otp_snapshot_awal = ""

            # Tutup cookie banner jika ada
            try:
                cookie_btn = page.locator('button:has-text("Terima Semua Cookie"), button#onetrust-accept-btn-handler').first
                if cookie_btn.count() > 0 and cookie_btn.is_visible():
                    cookie_btn.click()
                    time.sleep(0.3)
            except Exception:
                pass

            # Ketik email
            if current_email:
                try:
                    # Switch ke mode email jika perlu
                    try:
                        btn_switch = page.locator('button:has-text("Masuk dengan email"), a:has-text("Masuk dengan email")').first
                        if btn_switch.count() > 0 and btn_switch.is_visible():
                            btn_switch.click()
                            time.sleep(1)
                    except Exception:
                        pass

                    email_input = page.wait_for_selector(
                        'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]',
                        timeout=15000
                    )
                    if email_input:
                        email_input.click()
                        email_input.fill(current_email)
                        time.sleep(0.3)

                        submit_btn = page.locator('button:has-text("Lanjut"), button:has-text("Submit"), button:has-text("Masuk"), button[type="submit"]').first
                        if submit_btn.count() > 0 and submit_btn.is_visible() and submit_btn.is_enabled():
                            submit_btn.click()
                        else:
                            email_input.press("Enter")
                        time.sleep(1.0)

                        # Tombol "Masuk dengan OTP"
                        try:
                            btn_otp = page.locator('button:has-text("Masuk dengan OTP"), a:has-text("Masuk dengan OTP")').first
                            btn_otp.wait_for(state="visible", timeout=6000)
                            time.sleep(0.5)

                            if otp_endpoint:
                                try:
                                    otp_snapshot_awal = ambil_otp_dari_endpoint(otp_endpoint, action=action_type, label_email=label_email_cfg)
                                    print(f"   Snapshot OTP awal: '{otp_snapshot_awal or '(kosong)'}'")
                                except Exception:
                                    otp_snapshot_awal = ""

                            btn_otp.click()
                            print("   Tombol 'Masuk dengan OTP' diklik. OTP sedang dikirim...")
                            time.sleep(2)
                        except Exception:
                            if otp_endpoint and not otp_snapshot_awal:
                                try:
                                    otp_snapshot_awal = ambil_otp_dari_endpoint(otp_endpoint, action=action_type, label_email=label_email_cfg)
                                    print(f"   Snapshot OTP awal: '{otp_snapshot_awal or '(kosong)'}'")
                                except Exception:
                                    otp_snapshot_awal = ""

                        # Tunggu field OTP & polling
                        if otp_endpoint:
                            try:
                                print("   Menunggu field OTP muncul...")
                                otp_input_selector = '#auth-otp-input, input[name="otp"]:not(#vendor-search-handler), input[autocomplete="one-time-code"]:not(#vendor-search-handler), input[aria-label*="digit" i]:not(#vendor-search-handler), input[maxlength="1"]:not(#vendor-search-handler):not([type="checkbox"]):not([type="radio"])'
                                
                                start_wait_otp = time.time()
                                otp_appeared = False
                                while time.time() - start_wait_otp < 20:
                                    all_otp = page.locator(otp_input_selector).all()
                                    if any(f.is_visible() for f in all_otp):
                                        otp_appeared = True
                                        break
                                    time.sleep(1.0)

                                if otp_appeared:
                                    print("   Polling OTP dari Gmail...")
                                    otp_code = tunggu_otp_terbaru(otp_endpoint, action=action_type, label_email=label_email_cfg, interval_detik=3, otp_awal_override=otp_snapshot_awal, timeout_detik=20)
                                    
                                    if otp_code and otp_code.isdigit() and len(otp_code) in (4, 6):
                                        print(f"   OTP didapat: {otp_code}. Memasukkan OTP...")
                                        raw_otp = page.locator(otp_input_selector).all()
                                        otp_fields = [f for f in raw_otp if f.is_visible()]
                                        if len(otp_fields) == 1:
                                            otp_fields[0].focus()
                                            time.sleep(0.2)
                                            otp_fields[0].fill(otp_code)
                                            time.sleep(0.3)
                                            print("   OTP berhasil diisi otomatis.")
                                        elif len(otp_fields) > 1:
                                            for idx, digit in enumerate(otp_code[:len(otp_fields)]):
                                                otp_fields[idx].focus()
                                                otp_fields[idx].fill(digit)
                                                time.sleep(0.1)
                                            print("   OTP multi-field berhasil diisi otomatis.")

                                        time.sleep(1.0)
                                        clicked = False
                                        specific_submit = page.locator('#verify-otp-button, button[name="verify-otp-button"]').first
                                        if specific_submit.count() > 0 and specific_submit.is_visible():
                                            for _ in range(15):
                                                if specific_submit.is_enabled():
                                                    specific_submit.click()
                                                    clicked = True
                                                    break
                                                time.sleep(0.2)

                                        if not clicked:
                                            submit_otp_btn = page.locator('button[type="submit"]:has-text("Masuk"), button:has-text("Konfirmasi"), button:has-text("Verifikasi")')
                                            for i in range(submit_otp_btn.count()):
                                                btn = submit_otp_btn.nth(i)
                                                btn_text = btn.text_content().strip().lower()
                                                if "password" in btn_text:
                                                    continue
                                                if btn.is_visible() and btn.is_enabled():
                                                    btn.click()
                                                    clicked = True
                                                    break

                                        if not clicked:
                                            page.keyboard.press("Enter")
                                        time.sleep(2)
                                    else:
                                        print("   OTP tidak diterima otomatis. Silakan isi manual di browser.")
                            except Exception as e:
                                print(f"   Automasi OTP dilewati: {e}. Silakan isi manual di browser.")
                        else:
                            print("   Silakan isi kode OTP secara manual di browser.")
                except Exception as e:
                    print(f"   Gagal proses email: {e}")

            # Tunggu access_token muncul di cookies / storage (max 120 detik untuk manual login)
            start_time = time.time()
            try:
                while time.time() - start_time < 120:
                    if page.is_closed():
                        print("Browser ditutup sebelum login selesai.")
                        break

                    cookies = context.cookies()
                    for cookie in cookies:
                        if cookie.get('name') == 'access_token' and cookie.get('value'):
                            access_token = cookie['value']
                            break

                    if not access_token:
                        try:
                            ls_token = page.evaluate("() => localStorage.getItem('access_token') || sessionStorage.getItem('access_token')")
                            if ls_token and len(str(ls_token)) > 20:
                                access_token = ls_token
                        except Exception:
                            pass

                    if access_token:
                        break

                    # Deteksi layar pemilihan outlet
                    try:
                        if "/choose-outlet" in page.url or "/outlet" in page.url:
                            outlet_pick = page.locator('button:has-text("Pilih"), div[role="button"]:has-text("Pilih")').first
                            if outlet_pick.count() > 0 and outlet_pick.is_visible() and outlet_pick.is_enabled():
                                print("   Terdeteksi halaman pemilihan outlet. Memilih outlet...")
                                outlet_pick.click()
                                time.sleep(2)
                    except Exception:
                        pass

                    # Deteksi modal persetujuan
                    try:
                        modal_btn = page.locator('button:has-text("Saya Mengerti"), button:has-text("Mengerti"), button:has-text("Setuju")').first
                        if modal_btn.count() > 0 and modal_btn.is_visible() and modal_btn.is_enabled():
                            modal_btn.click()
                            time.sleep(1)
                    except Exception:
                        pass

                    time.sleep(1.0)

            except KeyboardInterrupt:
                print("\nDibatalkan oleh pengguna.")
                break
            except Exception as e:
                print(f"Error: {e}")

            if access_token:
                try:
                    user_data = page.evaluate("""async (token) => {
                        try {
                            const res = await fetch("https://api.gobiz.co.id/v1/users/me", {
                                headers: {
                                    "Authorization": "Bearer " + token,
                                    "Authentication-Type": "go-id"
                                }
                            });
                            return await res.json();
                        } catch (e) { return null; }
                    }""", access_token)
                except Exception:
                    pass

                all_cookies = context.cookies()
                try:
                    local_storage = page.evaluate("() => ({...localStorage})")
                    session_storage = page.evaluate("() => ({...sessionStorage})")
                except Exception:
                    pass
                break
            else:
                try:
                    page.close()
                except Exception:
                    pass

        try:
            browser.close()
        except Exception:
            pass

        if access_token:
            print(f"LOGIN SUKSES untuk {label}!")
            if user_data and "user" in user_data:
                user = user_data["user"]
                print(f"   User: {user.get('full_name', '?')} | Phone: {user.get('phone', '?')}")

            return {
                'access_token': access_token,
                'user_data': user_data,
                'cookies': all_cookies,
                'localStorage': local_storage,
                'sessionStorage': session_storage,
            }
        else:
            print(f"Gagal mendapatkan token untuk {label}.")
            return None


def main():
    import argparse
    parser = argparse.ArgumentParser(description="GoFood Multi-Outlet Manual Login")
    parser.add_argument("--no-proxy", action="store_true", help="Nonaktifkan proxy/WARP")
    args_cli = parser.parse_args()

    print("=" * 60)
    print("  🔑 GOFOOD MULTI-OUTLET LOGIN (dari Google Sheet)  ")
    print("=" * 60)

    # Proxy config
    use_proxy = os.getenv("USE_PROXY", "false").lower() in ("true", "1", "yes")
    proxy_server = os.getenv("PROXY_SERVER")

    if args_cli.no_proxy:
        use_proxy = False
        print("Proxy dinonaktifkan.")

    proxy_config = None
    if use_proxy and proxy_server:
        print(f"Menggunakan proxy: {proxy_server}")
        parsed = urlparse(proxy_server)
        if parsed.username and parsed.password:
            server_url = f"{parsed.scheme}://{parsed.hostname}"
            if parsed.port:
                server_url += f":{parsed.port}"
            proxy_config = {"server": server_url, "username": parsed.username, "password": parsed.password}
        else:
            proxy_config = {"server": proxy_server}

    # Ambil daftar outlet dari Google Sheet
    print("\nMengambil daftar outlet GoFood dari Google Sheet...")
    outlets = fetch_gofood_outlets()

    if not outlets:
        print("Tidak ada outlet GoFood Live yang ditemukan.")
        return

    # Filter hanya yang punya email
    outlets_with_email = [o for o in outlets if o['email'] and '@' in o['email']]

    if not outlets_with_email:
        print("Tidak ada outlet GoFood dengan email kredensial yang tersedia.")
        return

    # Cek token yang sudah ada di .env
    existing_tokens = {}
    for key, value in os.environ.items():
        if key.startswith('BEARER_TOKEN_') and value:
            suffix = key[len('BEARER_TOKEN_'):]
            phone_part = suffix.split('_')[0]
            phone_norm = normalisasi_nomor_hp(phone_part)
            if phone_norm:
                existing_tokens[phone_norm] = True

    # Tampilkan daftar
    print(f"\nDitemukan {len(outlets_with_email)} outlet GoFood Live dengan email:\n")
    for i, o in enumerate(outlets_with_email, 1):
        phone_norm = normalisasi_nomor_hp(o['phone'])
        has_token = False
        if phone_norm and phone_norm in existing_tokens:
            has_token = True
        for em in o.get('emails', [o['email']]):
            em_norm = normalisasi_nomor_hp(em)
            if em_norm in existing_tokens or em.strip().lower() in existing_tokens:
                has_token = True
                break
        status_token = "Sudah Login" if has_token else "Belum Login"
        cabang_str = f" - {o['cabang']}" if o['cabang'] else ""
        store_str = f" (Store: {o['store_id']})" if o['store_id'] else ""
        emails_display = ", ".join(o.get('emails', [o['email']]))
        print(f"  [{i:2d}] {o['nama_outlet']}{cabang_str}{store_str}")
        print(f"       Emails: {emails_display}  |  {status_token}")

    # Pilihan user
    print(f"\n  Pilih outlet untuk login (contoh: 1,3,5 atau 'all' atau 'new' untuk yang belum login):")
    pilihan = input("  Pilihan: ").strip().lower()

    selected = []
    if pilihan in ['all', 'semua']:
        selected = list(range(len(outlets_with_email)))
    elif pilihan == 'new':
        for i, o in enumerate(outlets_with_email):
            phone_norm = normalisasi_nomor_hp(o['phone'])
            has_token = False
            if phone_norm and phone_norm in existing_tokens:
                has_token = True
            for em in o.get('emails', [o['email']]):
                em_norm = normalisasi_nomor_hp(em)
                if em_norm in existing_tokens or em.strip().lower() in existing_tokens:
                    has_token = True
                    break
            if not has_token:
                selected.append(i)
        if not selected:
            print("\nSemua outlet sudah memiliki token login.")
            return
    else:
        for p in pilihan.split(','):
            p = p.strip()
            if p.isdigit():
                idx = int(p) - 1
                if 0 <= idx < len(outlets_with_email):
                    selected.append(idx)

    if not selected:
        print("Tidak ada outlet yang dipilih.")
        return

    print(f"\nAkan login ke {len(selected)} outlet secara berurutan.\n")

    # Login satu per satu
    success_count = 0
    for seq, idx in enumerate(selected, 1):
        outlet = outlets_with_email[idx]
        print(f"\n[{seq}/{len(selected)}] ", end="")

        result = login_outlet(outlet, proxy_config)

        if result and result.get('access_token'):
            token = result['access_token']
            phone_norm = normalisasi_nomor_hp(outlet['phone'])
            sanitized_name = re.sub(r'[^a-zA-Z0-9]', '', outlet['nama_outlet'])
            suffix = f"_{phone_norm}_{sanitized_name}"

            # Simpan ke .env (gofood/.env dan parent src/.env)
            target_envs = [env_path]
            if os.path.exists(parent_env) and parent_env != env_path:
                target_envs.append(parent_env)

            for target_env in target_envs:
                try:
                    set_key(target_env, "BEARER_TOKEN", token)
                    set_key(target_env, f"BEARER_TOKEN{suffix}", token)
                    set_key(target_env, "ACTIVE_NOMOR_HP", phone_norm)
                    set_key(target_env, f"NAMA_OUTLET{suffix}", outlet['nama_outlet'])
                    if outlet['cabang']:
                        set_key(target_env, f"CABANG{suffix}", outlet['cabang'])
                    if outlet['store_id']:
                        set_key(target_env, f"STORE_ID{suffix}", outlet['store_id'])

                    # Simpan juga untuk setiap email outlet
                    for em in outlet.get('emails', [outlet.get('email')]):
                        if em and em != phone_norm:
                            em_suffix = f"_{em.strip().lower()}_{sanitized_name}"
                            set_key(target_env, f"BEARER_TOKEN{em_suffix}", token)
                            set_key(target_env, f"NAMA_OUTLET{em_suffix}", outlet['nama_outlet'])
                            if outlet['cabang']:
                                set_key(target_env, f"CABANG{em_suffix}", outlet['cabang'])
                            if outlet['store_id']:
                                set_key(target_env, f"STORE_ID{em_suffix}", outlet['store_id'])
                except Exception as e:
                    print(f"   Gagal simpan ke {target_env}: {e}")

            print(f"   Token disimpan: BEARER_TOKEN{suffix}")
            success_count += 1

            # Dump session JSON
            try:
                dump = {
                    'timestamp': time.time(),
                    'outlet': outlet,
                    'user': result.get('user_data'),
                    'cookies': result.get('cookies', []),
                    'localStorage': result.get('localStorage', {}),
                    'sessionStorage': result.get('sessionStorage', {}),
                }
                json_file = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)),
                    f"session_{phone_norm or sanitized_name}.json"
                )
                with open(json_file, 'w') as f:
                    json.dump(dump, f, indent=4)
                print(f"   Session dump: {os.path.basename(json_file)}")
            except Exception:
                pass

        if seq < len(selected):
            print(f"\n   Lanjut ke outlet berikutnya dalam 2 detik...")
            time.sleep(2)

    # Summary
    print(f"\n{'='*60}")
    print(f"  SELESAI: {success_count}/{len(selected)} outlet berhasil login.")
    print(f"{'='*60}")
    print(f"\n  Jalankan 'python src/gofood/gofood.py' untuk menarik data analytics.")


if __name__ == "__main__":
    main()
