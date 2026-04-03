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
- **Giao diện Guest Warning Modal:**
  - Hiển thị khi người dùng Guest (Khách) cố gắng truy cập các tính năng yêu cầu đăng nhập.
  - Giao diện sử dụng tông màu xanh chủ đạo (`#005d8f`), có biểu tượng ổ khóa, danh sách đặc quyền khi đăng nhập, và 2 nút: "ĐĂNG NHẬP" và "Đăng ký".
  - Nút "Đăng ký" chuyển hướng đến trang đăng nhập với tham số `?register=true` để tự động mở form đăng ký.

## 4. Logic Phân Quyền & Xác Thực (Authorization & Authentication Logic)
- **Firebase Auth:** Quản lý đăng nhập, đăng ký, và khôi phục mật khẩu.
- **User Roles & Permissions:** 
  - `super_admin`: Toàn quyền quản lý cấu hình dự án, người dùng, và xem toàn bộ dữ liệu.
  - `admin`: Quản lý dự án, xem dữ liệu, nhưng không quản lý người dùng hay cài đặt hệ thống.
  - `project_director`: Quản lý dự án, xem dữ liệu.
  - `user`: Xem dữ liệu dự án, quỹ căn, tài liệu theo phân quyền được chỉ định. Không có quyền quản trị.
  - `guest`: Khách vãng lai chưa đăng nhập. Chỉ xem được danh sách dự án (ProjectsPage). Các hành động xem chi tiết dự án, xem giá, chính sách, tài liệu, hoặc quan tâm căn hộ sẽ kích hoạt `GuestWarningModal`.
  - `banner`: Người dùng bị khóa tài khoản.
- **Cơ chế hoạt động của Guest:**
  - Khi Guest click vào dự án, căn hộ, tài liệu, hoặc đại lý, hệ thống sẽ hiển thị `GuestWarningModal` thay vì chuyển hướng trực tiếp đến trang đăng nhập.
  - Khi Guest đóng Modal (click nút X), giao diện vẫn giữ nguyên ở trang hiện tại với vai trò Guest.
  - Khi User đăng nhập rồi đăng xuất, hệ thống sẽ chuyển hướng về trang chủ (`/`) và trở lại giao diện với phân cấp Guest.
- **Đăng ký tài khoản:**
  - Yêu cầu số điện thoại hợp lệ (định dạng VN) và số điện thoại người giới thiệu.
  - Số điện thoại người giới thiệu phải nằm trong danh sách `allowed_phones` trên Firestore.
  - Đồng bộ thông tin người dùng mới sang Google Sheets qua `VITE_USER_SYNC_GAS_URL`.

## 5. Quy Tắc Tìm Kiếm & Lọc (Search & Filter Rules)
- **Tìm kiếm:** Hỗ trợ tìm kiếm theo Mã căn, Phân khu, Loại hình.
- **Lọc (Filters):** 
  - Lọc đa điều kiện (Multi-filter) dựa trên các trường được định nghĩa trong cấu hình dự án (`filterFields`).
  - Đồng bộ filter giữa các Tab (ví dụ: chọn Đại lý ở Dashboard sẽ chuyển sang Tab Quỹ căn với filter Đại lý đó).

## 6. Thành Phần Giao Diện (UI Components)
- **Dashboard:** Thống kê tổng quan và danh sách Đại lý đối tác.
- **Quỹ căn (Unit Data):** Trái tim của App, hiển thị trạng thái sản phẩm thời gian thực.
- **Tài liệu (Docs):** Kho lưu trữ tài liệu pháp lý, thiết kế theo từng mã căn.
- **So sánh căn hộ:** Cho phép chọn tối đa 4 căn hộ để so sánh chi tiết các thông số.

## 7. PWA & Cài Đặt App (Progressive Web App)
- **VitePWA Plugin:** Sử dụng `vite-plugin-pwa` để tạo Service Worker và Manifest tự động, biến web app thành một ứng dụng có thể cài đặt.
- **Manifest Configuration:**
  - `theme_color` và `background_color` được thiết lập là `#0f172a` (màu xanh đen đậm) để đồng bộ với màu nền logo, tránh viền trắng khi cài đặt trên Android.
  - Icons sử dụng thuộc tính `purpose: 'any maskable'` để hệ điều hành (như Android) có thể tự động cắt xén (crop) và phóng to logo tràn viền khung hình (squircle/circle) một cách đẹp mắt.
  - Sử dụng đường dẫn logo trực tiếp từ Github (`https://raw.githubusercontent.com/...`) để đảm bảo logo luôn khả dụng trên môi trường production (Vercel) ngay cả khi file local không được commit.
- **Install Prompt Logic (Lời mời cài đặt):**
  - Component `InstallPWA` lắng nghe sự kiện `beforeinstallprompt` của trình duyệt.
  - **Kiểm tra trạng thái cài đặt:** Sử dụng `window.matchMedia('(display-mode: standalone)').matches` để kiểm tra xem App đã được cài đặt và đang mở từ màn hình chính hay chưa. Nếu đã cài đặt, lời mời cài đặt sẽ **tự động bị ẩn hoàn toàn**.
  - Giao diện lời mời cài đặt được thiết kế tinh tế, hiển thị ở góc dưới màn hình, có nút "Cài đặt" và nút "X" để đóng. Sử dụng `framer-motion` để tạo hiệu ứng trượt mượt mà.

## 8. Hiệu Năng & Tối Ưu (Performance & Optimization)
- **Giao diện Mobile (Mobile Layout):**
  - Tiêu đề và Tabbar trên Mobile được tối ưu hóa kích thước chữ (`text-xl`, `text-xs`) và khoảng cách (padding).
  - Tabbar tìm kiếm cho phép cuộn ngang (`overflow-x-auto`, `scrollbar-hide`) để tránh tình trạng dồn ép, méo chữ hoặc rớt dòng khi màn hình nhỏ.
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
