# Application Logic & Business Rules - LandTrack V2

## 1. Tổng Quan Hệ Thống (System Overview)
LandTrack V2 là nền tảng quản lý và phân phối bất động sản thời gian thực, kết nối dữ liệu từ Google Sheets với giao diện người dùng hiện đại, bảo mật qua Firebase.

## 2. Luồng Dữ Liệu (Data Flow)
- **Nguồn dữ liệu:** Google Sheets (Master Sheet).
- **Cơ chế tải:** 
  - Dữ liệu được fetch qua `googleSheets.ts` service.
  - Sử dụng `headerMatrix` để chuẩn hóa tiêu đề cột từ Sheets sang Keys trong code.
  - Hỗ trợ cache dữ liệu để tối ưu hiệu năng.
- **Xử lý dữ liệu:**
  - Lọc bỏ các giá trị "N/A" (không phân biệt hoa thường) trước khi hiển thị.
  - Chuẩn hóa text (loại bỏ dấu) để tìm kiếm và lọc chính xác.

## 3. Quy Tắc Hiển Thị (Display Rules)
- **Tính đáp ứng (Responsiveness):**
  - **Desktop:** Hiển thị dạng bảng (Table) đầy đủ cột, hỗ trợ phân trang và lọc nâng cao.
  - **Mobile:** Chuyển sang dạng thẻ (Card). Khi click vào "Chi tiết", nội dung mở rộng ngay tại thẻ (Inline Expansion) thay vì mở Modal để tối ưu trải nghiệm chạm.
- **Xử lý giá trị trống:**
  - Không hiển thị các trường dữ liệu mang giá trị "N/A", "-", hoặc rỗng.
  - Trạng thái (Status) được đổ màu tương ứng: `Đã bán` (Đỏ), `Đặt chỗ` (Vàng), `Trống` (Xanh), v.v.

## 4. Logic Phân Quyền (Authorization Logic)
- **Firebase Auth:** Chỉ cho phép người dùng đã xác thực truy cập.
- **User Roles:** 
  - `Admin`: Toàn quyền quản lý cấu hình dự án và xem toàn bộ dữ liệu.
  - `Agent/User`: Xem dữ liệu theo phân quyền được chỉ định.
- **Firestore Rules:** Bảo mật dữ liệu ở cấp độ document, ngăn chặn truy cập trái phép vào cấu hình nhạy cảm.

## 5. Quy Tắc Tìm Kiếm & Lọc (Search & Filter Rules)
- **Tìm kiếm:** Hỗ trợ tìm kiếm theo Mã căn, Phân khu, Loại hình.
- **Lọc (Filters):** 
  - Lọc đa điều kiện (Multi-filter) dựa trên các trường được định nghĩa trong cấu hình dự án (`filterFields`).
  - Đồng bộ filter giữa các Tab (ví dụ: chọn Đại lý ở Dashboard sẽ chuyển sang Tab Quỹ căn với filter Đại lý đó).

## 6. Thành Phần Giao Diện (UI Components)
- **Dashboard:** Thống kê tổng quan và danh sách Đại lý đối tác.
- **Quỹ căn (Unit Data):** Trái tim của App, hiển thị trạng thái sản phẩm thời gian thực.
- **Tài liệu (Docs):** Kho lưu trữ tài liệu pháp lý, thiết kế theo từng mã căn.

## 7. Hiệu Năng & Tối Ưu (Performance & Optimization)
- **TanStack Query (@tanstack/react-query):** 
  - Quản lý trạng thái dữ liệu (Data State Management) và Caching.
  - Tự động refetch khi dữ liệu cũ (Stale) hoặc theo yêu cầu thủ công.
  - Giảm thiểu số lần gọi API không cần thiết, tăng tốc độ phản hồi App.
- **Skeleton Loaders:** 
  - Sử dụng thay thế cho Spinner truyền thống để cải thiện trải nghiệm người dùng (Perceived Performance).
  - Hiển thị khung xương của UI trong khi chờ dữ liệu tải về.
- **Multi-select Filters:** 
  - Hỗ trợ chọn nhiều giá trị cùng lúc cho các tiêu chí lọc (Phân khu, Loại hình, Hướng, Quỹ bán).
  - Tăng khả năng lọc chính xác và linh hoạt cho người dùng.
- **Framer Motion (motion/react):** Cho các hiệu ứng chuyển cảnh mượt mà.
- **Tối ưu hóa Re-render:** Sử dụng `useMemo` và `useCallback` để tránh tính toán lại không cần thiết.
