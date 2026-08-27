# ECO-KIDS English 3D

Website MVP được xây dựng từ tài liệu Checkpoint 1–3: kết hợp sách giấy, Web 3D, luyện phát âm và dashboard phụ huynh. Frontend hiện dùng Next.js App Router + Tailwind CSS; Express vẫn cung cấp API và lưu dữ liệu.

## Chạy dự án

1. Cài Node.js 20+ và MongoDB.
2. Sao chép `.env.example` thành `.env`.
3. Chạy `npm install`.
4. Chạy `npm run dev`.
5. Chạy `npm run dev`.
6. Mở `http://localhost:3000`.

Nếu MongoDB chưa hoạt động, website tự chuyển sang dữ liệu demo trong bộ nhớ để vẫn xem được đầy đủ giao diện. Khi MongoDB hoạt động, tiến độ học, đơn hàng và đăng ký đối tác được lưu lâu dài. `npm run dev` tự chạy cả Next.js và API Express; khi deploy production, chạy API bằng `npm run start:api` và frontend bằng `npm run build && npm start`.

## Các route frontend

- `/` — Landing page, chủ đề, bộ học liệu, giỏ hàng và đăng ký trường học.
- `/learn` — Phòng khám phá, phát âm, luyện nói, mô hình tương tác và lưu tiến độ.
- `/dashboard` — Góc phụ huynh với thống kê, biểu đồ và hành trình chủ đề.

## Chức năng

- Landing page giới thiệu hệ sinh thái Phygital và lợi thế 70/30.
- Khu học tương tác 3D theo chủ đề Animals, Fruits, Vehicles.
- Phát âm mẫu bằng Web Speech API; nhận diện giọng nói nếu trình duyệt hỗ trợ.
- Nhắc nghỉ mắt sau 20 phút và hoạt động thực hành không màn hình.
- Dashboard phụ huynh: chuỗi ngày học, từ đã học, điểm phát âm, biểu đồ tiến độ.
- Cửa hàng bộ KIT, giỏ hàng và tạo đơn.
- Form đăng ký giải pháp B2B cho trường/trung tâm.

## API chính

- `GET /api/health`
- `GET /api/topics`
- `GET /api/products`
- `GET /api/progress/:childName`
- `POST /api/progress`
- `POST /api/orders`
- `POST /api/partners`
