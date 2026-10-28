# NEX EV — landing page

Landing page quảng cáo trụ sạc AC 7kW Nex EV, responsive, không dùng framework.

## Chạy thử

Mở `index.html` trực tiếp trong trình duyệt hoặc chạy một static server trong thư mục này.

## Nối đơn hàng vào Google Sheet

1. Tạo một Google Sheet mới.
2. Chọn **Extensions → Apps Script**, dán nội dung `apps-script/Code.gs`.
3. Chạy hàm `setup()` một lần để tạo hàng tiêu đề.
4. Chọn **Deploy → New deployment → Web app**.
5. Chọn **Execute as: Me** và **Who has access: Anyone**, sau đó copy URL web app.
6. Dán URL vào thuộc tính `data-sheet-endpoint` của form trong `index.html`:

```html
<form id="order-form" data-sheet-endpoint="DÁN_URL_WEB_APP_VÀO_ĐÂY">
```

Form sẽ gửi các cột: `created_at`, `name`, `phone`, `model`, `city`, `note`, `source`.

Nếu chưa cấu hình URL, form vẫn lưu bản nháp trong trình duyệt để kiểm tra luồng.

## Đã tạo sẵn

- Google Sheet nhận đơn: https://docs.google.com/spreadsheets/d/11EReW8Ibq3mtfyz3dr6_W4oAFtMmjx4ZsiGCCeHfAPw/edit
- Web app nhận đơn: https://script.google.com/macros/s/AKfycbyyTQPP33kTM568tNspEy7QJ-tmISOP-PxVutwLszo_eHptSMwQAG9xFrQvZFwZZxhRyg/exec

`index.html` đã được điền endpoint, nên form sẽ POST trực tiếp vào tab `Orders` của sheet ở trên.

## Media

Trang dùng ảnh sản phẩm thật trong `assets/product-main.jpg`, ảnh xe đang sạc trong `assets/car-charging.jpg`, và video preview `assets/product-preview.mp4` và poster crop `assets/video-poster.jpg` cho khối media.



Gallery dùng nhiều ảnh thật từ album: price-promo.jpg, home-charging.jpg, portable-setup.jpg, wall-install.jpg, car-red-charging.jpg, car-delivery.jpg, charger-display.jpg, connector-install.jpg.

