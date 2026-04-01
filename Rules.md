# Quy tắc và Logic Hệ thống

## 1. Quản lý Số điện thoại cho phép (Allowed Phones)
- **Mục đích**: Kiểm soát các số điện thoại được phép truy cập các tính năng đặc biệt hoặc hiển thị thông tin liên hệ.
- **Dữ liệu**: Lưu trữ trong collection `allowed_phones` trên Firestore.
- **Cấu trúc dữ liệu**:
  - `phone`: Chuỗi số điện thoại (đã chuẩn hóa về định dạng 0xxx).
  - `position`: Chức danh/Vị trí (ví dụ: Giám đốc dự án, Quản lý).
  - `createdAt`: Thời gian tạo (ISO string).
- **Logic chuẩn hóa SĐT**:
  - Loại bỏ tất cả ký tự không phải số.
  - Chuyển đầu số `84` thành `0`.
  - Đảm bảo luôn bắt đầu bằng số `0`.

## 2. Giao diện Admin (AdminPage)
- **Thêm mới**: Cho phép nhập SĐT và Chức danh. Kiểm tra trùng lặp trước khi thêm.
- **Chỉnh sửa**: Cho phép sửa trực tiếp SĐT và Chức danh của các bản ghi đã tồn tại thông qua nút "Chỉnh sửa" (biểu tượng bút).
- **Xóa**: Cho phép xóa số điện thoại khỏi danh sách.
- **Dọn dẹp trùng lặp**: Tính năng tự động quét và xóa các số điện thoại bị lặp lại trong cơ sở dữ liệu.

## 3. Card Liên hệ (ContactCard)
- **Hiển thị**: Xuất hiện ở cuối trang Danh mục Dự án (`ProjectsPage`).
- **Logic chọn liên hệ**:
  - Ưu tiên hiển thị người có chức danh chứa từ khóa "Quản lý" hoặc "Giám đốc".
  - Nếu không có, hiển thị liên hệ đầu tiên trong danh sách.
- **Hành động**:
  - Nút "Liên hệ ngay": Gọi điện trực tiếp qua giao thức `tel:`.
  - Nút "Chat Zalo": Mở link `https://zalo.me/[SĐT]`.

## 4. Quản lý Dữ liệu Hệ thống (AllDataManagement)
- Hiển thị cấu hình mapping giữa Google Sheet và ứng dụng.
- Chỉ hiển thị các trường dữ liệu cốt lõi để đảm bảo tính bảo mật và gọn gàng.
