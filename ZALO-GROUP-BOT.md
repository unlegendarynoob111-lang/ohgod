# Bot Zalo Nhóm NexEV — Thông báo đơn + Trả lời khách trong nhóm

Bot dùng **Zalo Bot Platform chính thức** (bot.zaloplatforms.com) — như bot Telegram:
không sợ khóa tài khoản, vào được NHÓM, thành viên `@nhắc` là nó trả lời.

Hai phần:
- **Thông báo đơn** → Apps Script (`Code.gs`) đẩy thẳng vào nhóm khi khách submit form (không cần máy tính bật).
- **Trả lời chat** → `zalo-groupbot.py` chạy trên máy này, nghe nhóm + DM, trả lời FAQ.

---

## Bước 1 — Tạo bot (1 phút, trên điện thoại hoặc máy này)

1. Vào **https://bot.zaloplatforms.com** → đăng nhập bằng Zalo (quét QR).
2. **Create Bot** — tên PHẢI bắt đầu bằng `Bot`, ví dụ: `Bot NexEV`.
3. Token bot được gửi vào **tin nhắn Zalo của bạn** (dạng `123456:xxxxx`).

## Bước 2 — Thêm bot vào nhóm

Trong nhóm Zalo → Thêm thành viên → tìm tên bot → thêm.

## Bước 3 — Dán token, chạy bot

1. Mở `D:\!trusac\zalo-bot\zalo-bot-config.local.json`, dán token vào trường `"token"`.
2. Double-click `D:\!trusac\zalo-bot\start-zalo-bot.bat`
   (hoặc test trước: `python D:\!trusac\zalo-bot\zalo-groupbot.py test`).
3. Trong nhóm gõ: `@Bot NexEV xin chào`
   → bot trả lời **và tự lưu ID nhóm** vào file config (xem log `zalo-groupbot.log`).

## Bước 4 — Nối thông báo đơn vào nhóm (Apps Script)

1. Vào https://script.google.com → mở project → **paste toàn bộ `D:\!trusac\apps-script\Code.gs`** (đã có sẵn notify nhóm).
2. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
3. **Project Settings → Script Properties** thêm 2 dòng (ID nhóm lấy từ file config ở Bước 3):
   - `ZALO_BOT_TOKEN` = token của bot
   - `ZALO_GROUP_CHAT_ID` = ID nhóm bot vừa lưu

## Bước 5 — Test

- Tạo 1 đơn thử trên ohgod.tech → nhóm nhận thông báo ngay.
- Trong nhóm gõ `@Bot NexEV giá` → bot trả lời bảng giá.

## Bước 6 — Bot tự chạy mỗi khi mở máy

Chạy 1 lần trong CMD (không cần chạy lại nữa):

```
schtasks /Create /TN "ZaloGroupBot" /TR "\"D:\!trusac\zalo-bot\start-zalo-bot.bat\"" /SC ONLOGON /F
```

---

## Bot trả lời được gì (FAQ có sẵn trong zalo-groupbot.py)

giá • bảo hành • lắp đặt/aptomat • chuẩn cổng Type 2 / GB/T / adapter •
thời gian sạc • miễn phí ship • cắm thử sạc • hỗ trợ xe nào • hotline • đặt mua

Sửa câu trả lời: mở `zalo-groupbot.py`, phần `FAQ = [...]`.

## Lưu ý

- **KHÔNG** đưa file `zalo-bot-config.local.json` (chứa token) lên GitHub — đã có `.gitignore` chặn.
- Trong nhóm, bot chỉ trả lời khi được `@tên_bot` nhắc hoặc gõ `/lệnh` — không nhắn lung tung.
- DM riêng bot cũng được — hỏi thẳng là nó trả lời.
