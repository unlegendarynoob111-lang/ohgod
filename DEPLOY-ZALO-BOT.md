# HƯỚNG DẪN DEPLOY + BOT ZALO THÔNG BÁO
# ====================================

## PHẦN 1: DEPLOY APPS SCRIPT (BẮT BUỘC — 5 phút)

1. Mở: https://script.google.com/home → project "Nex EV order intake"
2. Copy toàn bộ nội dung file `D:\!trusac\apps-script\Code.gs` → dán vào editor → Save (Ctrl+S)
3. **Đặt thông số thông báo** (chọn 1 trong 2):
   - **Zalo OA**: Click ⚙️ Project Settings → Script Properties → Add:
     - `ZALO_OA_TOKEN` = access token của Official Account (lấy từ developers.zalo.me)
     - `ZALO_OA_USER_ID` = user_id Zalo cá nhân của bạn (nhắn tin test)
     - HOẶC `ZALO_PHONE` = số điện thoại Zalo của bạn (nếu dùng ZNS)
   - **Telegram** (dễ nhất — khuyên dùng nếu chưa có OA):
     1. Chat với @BotFather → /newbot → lấy token
     2. Chat với bot mới tạo → gửi 1 tin nhắn bất kỳ
     3. Mở `https://api.telegram.org/bot<TOKEN>/getUpdates` → lấy chat_id
     4. Script Properties thêm: `TG_BOT_TOKEN` = <token>, `TG_CHAT_ID` = <chat_id>
4. Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy
5. Test: `python D:\!cool\_pentest.py` — phải trả `ok:false` cho các test 2–9

## PHẦN 2: ZALO BOT — CÁC HƯỚNG

### Option A: Zalo Official Account API (chuyên nghiệp)
- Đăng ký OA: https://oa.zalo.me → tạo Official Account
- Lấy access token: https://developers.zalo.me → tạo app → cấp quyền
- Copy token + user_id vào Script Properties
- Mỗi đơn mới → nhận tin nhắn Zalo có tên/SĐT/xe/tỉnh

### Option B: Cloudflare Worker trung gian (nếu muốn chat 2 chiều)
- Deploy 1 worker nhận webhook Zalo → forward tới Telegram/Email
- Code mẫu: `D:\!trusac\zalo-bot\worker.js` (tôi sẽ tạo)

### Option C: Telegram Bot (nhanh nhất, 5 phút, KHÔNG cần duyệt)
- @BotFather → /newbot → token
- Telegram app trên điện thoại → nhận tin nhắn mỗi khi có khách điền
- Không cần OA token, không cần phê duyệt

## PHẦN 3: FORM CLIENT ĐÃ FIX (live)
- Honeypot + time gate + rate limit + sanitize + spam keyword + duplicate + confirm
- Không cần thay đổi

## PHẦN 4: CÁC FILE ĐÃ TẠO
- `D:\!trusac\apps-script\Code.gs` — code Apps Script mới (7.9KB, có Zalo+Telegram notify)
- `D:\!trusac\zalo-bot\worker.js` — Cloudflare Worker (nếu muốn Option B)
