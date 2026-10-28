# -*- coding: utf-8 -*-
"""
NexEV Zalo Group Bot (Zalo Bot Platform - chinh thuc, bot.zaloplatforms.com)
- Thong bao don hang: do Apps Script code.gs day thang vao nhom (khong qua bot nay)
- Bot nay: nghe tin nhan trong nhom (khi duoc @nhac) + DM 1-1, tra loi FAQ
Chay:  python zalo-groupbot.py          (chat listener)
       python zalo-groupbot.py test     (kiem tra token + gui tin test vao nhom)
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "zalo-bot-config.local.json")
STATE_PATH = os.path.join(BASE_DIR, "zalo-bot-state.json")
LOG_PATH = os.path.join(BASE_DIR, "zalo-groupbot.log")
API = "https://bot-api.zaloplatforms.com/bot{}/{}"

DEFAULT_CONFIG = {
    "token": "",
    "group_chat_id": "",
    "bot_username": ""
}

HELP_TEXT = (
    "🤖 MÌNH LÀ BOT NEXEV\n"
    "Hỏi mình được các chuyện:\n"
    "• Giá bán (3.5kW / 7kW)\n"
    "• Bảo hành\n"
    "• Lắp đặt, đấu nối aptomat\n"
    "• Chuẩn cổng Type 2 / GB/T, adapter\n"
    "• Thời gian sạc\n"
    "• Ship, dùng thử\n"
    "Gọi ngay 0818 574 833 để được tư vấn nhanh nhất!"
)

FALLBACK_TEXT = (
    "Mình là bot NexEV ⚡\n"
    "Hỏi mình về: giá, bảo hành, lắp đặt, chuẩn cổng, thời gian sạc, ship, dùng thử...\n"
    "Hoặc gọi ngay 0818 574 833 nha!"
)

FAQ = [
    (("chào", "xin chao", "hello", "hi ", "alo"), "Chào bạn! 👋 Mình là bot NexEV — trụ sạc cá nhân AC 7kW. Bạn cần hỏi giá, bảo hành, lắp đặt hay chuẩn cổng? (Hotline: 0818 574 833)"),
    (("giá", "gia ", "bao nhiêu", "bao nhiu", "price", "tiền"), "💰 NexEV có 2 bản:\n• Bản DI ĐỘNG 3.5kW — cắm thẳng ổ điện thường, mang theo trong xe\n• Bản CỐ ĐỊNH 7kW — sạc cổng tại nhà, đấu aptomat phụ + dây 2×6mm²\nGiá chi tiết xem tại ohgod.tech hoặc gọi 0818 574 833!"),
    (("bảo hành", "bao hanh", "warranty", "bảo hanh"), "🛡️ Bảo hành 1–2 năm tùy bản sản phẩm. Chi tiết gọi 0818 574 833."),
    (("lắp", "đấu", "lap dat", "aptomat", "aptomat", "cài đặt", " lắp", " đấu"), "🔧 Bản 3.5kW: cắm thẳng ổ điện thường, không cần đấu gì.\nBản 7kW: cần đầu nối aptomat phụ + dây điện 2×6mm² — kỹ thuật NexEV hỗ trợ hướng dẫn. Gọi 0818 574 833!"),
    (("adapter", "chuyển ổ", "chuyển cổng", "chuan", "chuẩn cổng", "type 2", "gb/t", "cổng"), "🔌 Bộ NexEV hỗ trợ 2 chuẩn phổ biến nhất VN:\n• Type 2 — sạc full 7kW\n• GB/T — sạc 3.3kW\nXe dùng cổng khác? Gọi 0818 574 833 để NexEV kiểm tra & tư vấn adapter phù hợp."),
    (("ship", "giao hàng", "miễn phí", "mien phi"), "🚚 MIỄN PHÍ SHIP toàn quốc! Đặt tại ohgod.tech hoặc gọi 0818 574 833."),
    (("thử", "dùng thử", "dung thu", "cắm thử", "cam thu", "test"), "⚡ Có chương trình CẮM THỬ SẠC — dùng thật rồi hẵng quyết. Chi tiết gọi 0818 574 833."),
    (("bao lâu", "bao lau", "mấy tiếng", "may tieng", "thời gian sạc", "thoi gian sac", "sạc lâu", "sac lau"), "⏱️ Ví dụ VinFast VF 6:\n• 7kW (Type 2): 5–7 giờ full\n• 3.3kW (GB/T): 10–14 giờ\nTùy dòng xe & mức pin. Hỏi riêng xe của bạn: gọi 0818 574 833."),
    (("xe nào", "xe nao", "hỗ trợ xe", "ho tro xe", "vinfast", "vin", "byd", "mercedes", "mg", "omoda"), "🚗 Sạc được hầu hết xe điện tại VN:\n• VinFast: VF 3 → VF 9, Minio Green\n• BYD: Dolphin, Atto 3, Seal\n• Omoda E5, MG4, MG ZS EV, Mercedes...\nBản di động cắm ổ điện là sạc được MỌI dòng xe điện."),
    (("hotline", "số điện thoại", "so dien thoai", "liên hệ", "lien he", "contact", "gọi", "goi"), "📞 Hotline NexEV: 0818 574 833 (gọi/zalo đều được)!"),
    (("đặt", "mua", "order", "đăng ký", "dang ky", "website", "web"), "🛒 Đặt nhanh tại ohgod.tech (điền form, NexEV gọi lại) hoặc gọi 0818 574 833."),
    (("cảm ơn", "cam on", "thanks", "thank"), "Không có gì! ⚡ Cần gì cứ hỏi, hoặc gọi 0818 574 833 nha."),
]


def log(msg):
    line = time.strftime("%Y-%m-%d %H:%M:%S") + "  " + str(msg)
    print(line)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def load_config():
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
        log("ĐÃ TẠO file cấu hình: " + CONFIG_PATH)
        log("👉 Mở file đó, dán TOKEN của bot vào \"token\", rồi chạy lại.")
        sys.exit(1)
    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    if not cfg.get("token"):
        log("⚠️ Chưa có token trong " + CONFIG_PATH + " — dán token vào rồi chạy lại.")
        sys.exit(1)
    return cfg


def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def load_state():
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"offset": 0, "seen": []}


def save_state(st):
    try:
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(st, f)
    except OSError:
        pass


def api(token, method, payload=None, timeout=60):
    url = API.format(token, method)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except Exception:
            return {"ok": False, "error": "HTTP " + str(e.code)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def parse_update(item):
    """Do hinh dang update co the doi — boc tach phong thu."""
    msg = item.get("message") or item.get("msg") or item
    chat = msg.get("chat") or {}
    chat_id = str(chat.get("id") or msg.get("chat_id") or item.get("chat_id") or "")
    text = str(msg.get("text") or item.get("text") or "")
    ctype = str(chat.get("chat_type") or msg.get("chat_type") or item.get("chat_type") or "").upper()
    sender = msg.get("from") or msg.get("user") or {}
    sender_name = (sender.get("display_name") or sender.get("displayName")
                   or sender.get("name") or sender.get("username") or "Bạn")
    uid = item.get("update_id") or item.get("updateId")
    ts = str(msg.get("created_at") or msg.get("date") or msg.get("sendDttm") or msg.get("timestamp") or "")
    return {"uid": uid, "chat_id": chat_id, "text": text, "group": "GROUP" in ctype,
            "sender": sender_name, "key": chat_id + "|" + text + "|" + ts}


def answer(text):
    t = " " + re.sub(r"\s+", " ", text.lower()) + " "
    if re.search(r"/(start|help)|\bhelp\b|giúp|giup|hướng dẫn|huong dan", t):
        return HELP_TEXT
    for keys, reply in FAQ:
        for k in keys:
            if k in t:
                return reply
    return FALLBACK_TEXT


def send(bot_token, chat_id, text):
    return api(bot_token, "sendMessage", {"chat_id": chat_id, "text": text})


def run_listener():
    cfg = load_config()
    token = cfg["token"]
    st = load_state()
    offset = st.get("offset", 0)
    seen = list(st.get("seen", []))[-400:]
    seen_set = set(seen)

    me = api(token, "getMe")
    username = cfg.get("bot_username") or ""
    if me.get("ok"):
        r = me.get("result") or {}
        username = username or str(r.get("username") or r.get("user_name") or r.get("name") or "")
        log("Bot online: " + json.dumps(r, ensure_ascii=False)[:200])
    else:
        log("⚠️ getMe lỗi: " + json.dumps(me, ensure_ascii=False)[:200] + " — kiểm tra token!")
        sys.exit(1)
    if username:
        cfg["bot_username"] = username
        save_config(cfg)

    mention = ("@" + username.lower()) if username else None
    log("Đang nghe tin nhắn... (nhóm: gõ @" + (username or "tên_bot") + " + câu hỏi | DM: hỏi thẳng)")
    if not cfg.get("group_chat_id"):
        log("ℹ️ Chưa có group_chat_id — thêm bot vào NHÔM rồi gõ @{} trong nhóm, bot tự lưu ID nhóm.".format(username or "tên_bot"))

    while True:
        try:
            resp = api(token, "getUpdates", {"offset": offset, "limit": 10, "timeout": 50}, timeout=70)
            if not resp.get("ok"):
                log("getUpdates lỗi: " + json.dumps(resp, ensure_ascii=False)[:150])
                time.sleep(5)
                continue
            items = resp.get("result") or []
            max_uid = None
            for item in items:
                u = parse_update(item)
                if u["uid"] is not None:
                    try:
                        max_uid = max(max_uid or 0, int(u["uid"]))
                    except (TypeError, ValueError):
                        pass
                if not u["chat_id"] or not u["text"]:
                    continue
                if u["key"] in seen_set:
                    continue
                seen_set.add(u["key"])
                seen.append(u["key"])
                log("[{}] {}: {}".format("NHÓM" if u["group"] else "DM", u["sender"], u["text"][:80]))

                # tu luu id nhom lan dau tien
                if u["group"] and not cfg.get("group_chat_id"):
                    cfg["group_chat_id"] = u["chat_id"]
                    save_config(cfg)
                    log("🔔 ĐÃ LƯU ID NHÓM = " + u["chat_id"] + " (dán vào Script Properties ZALO_GROUP_CHAT_ID)")

                is_group = u["group"]
                mentioned = bool(mention and mention in u["text"].lower())
                is_cmd = u["text"].lstrip().startswith("/")
                if is_group and not (mentioned or is_cmd):
                    continue  # trong nhom: chi tra loi khi duoc @nhac hoac /lenh
                reply = answer(u["text"])
                r = send(token, u["chat_id"], reply)
                log("  → trả lời " + ("OK" if r.get("ok") else json.dumps(r, ensure_ascii=False)[:120]))

            if max_uid is not None:
                offset = max_uid + 1
            if len(seen) > 400:
                seen = seen[-200:]
            st = {"offset": offset, "seen": seen[-200:]}
            save_state(st)
        except KeyboardInterrupt:
            log("Dừng bot.")
            break
        except Exception as exc:
            log("Lỗi loop: " + repr(exc))
            time.sleep(5)


def run_test():
    cfg = load_config()
    token = cfg["token"]
    me = api(token, "getMe")
    log("getMe: " + json.dumps(me, ensure_ascii=False)[:300])
    if not me.get("ok"):
        log("❌ Token sai hoặc chưa kích hoạt — vào bot.zaloplatforms.com kiểm tra lại.")
        sys.exit(1)
    if cfg.get("group_chat_id"):
        r = send(token, cfg["group_chat_id"], "✅ Bot NexEV đã kết nối nhóm — từ giờ đơn mới + câu hỏi của mọi người sẽ được phản hồi ở đây!")
        log("Gửi tin test vào nhóm: " + ("OK" if r.get("ok") else json.dumps(r, ensure_ascii=False)[:200]))
    else:
        log("Chưa có group_chat_id — thêm bot vào nhóm, gõ @tên_bot trong nhóm để bot tự lưu ID.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        run_test()
    else:
        run_listener()
