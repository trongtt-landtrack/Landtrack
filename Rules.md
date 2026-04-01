# App Logic & Data Source Rules (Source of Truth)

Tài liệu này chứa toàn bộ logic cốt lõi, quy tắc mapping dữ liệu và thiết kế giao diện đã được thống nhất cho ứng dụng. AI và lập trình viên phải đọc file này trước khi thực hiện bất kỳ thay đổi nào để đảm bảo tính nhất quán.

## 1. Nguồn dữ liệu (Data Sources)
- **Management Sheet (GID=0)**: Dùng để cấu hình dự án (`projectId`, `name`, `location`, `imageUrl`).
- **Master Sheet (GID=1093550895)**: Là nguồn dữ liệu tập trung (Quỹ căn, Dashboard, Tài liệu).
  - **URL**: `https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=1093550895`
  - **Header Row**: 1
  - **Data Start Row**: 2

## 2. Logic Lọc Dự án (Project Filtering)
- Dữ liệu từ Master Sheet được lọc theo tên dự án (`projectName`).
- **Khớp tên không dấu**: Sử dụng hàm `removeAccents` để loại bỏ dấu tiếng Việt khi so sánh tên dự án, đảm bảo khớp chính xác 100% bất kể bảng mã.
- **Cột nhận diện**: Ưu tiên kiểm tra các cột: `ProjectName` -> `Dự án` -> `Tên dự án` -> `projectname` -> `Project Name` -> `DỰ ÁN`.

## 3. Quy tắc Mapping Cột (Header Normalization)
- Sử dụng `HEADER_MATRIX` trong `src/services/googleSheets.ts` để chuẩn hóa tiêu đề cột.
- **Cột TÊN ĐL (Đại lý)**: Mapping từ cột **HB** (F1/F2) trên GID=0 hoặc cột **E** trên Master Sheet.
- **Cột PTG (Tài liệu)**: Mapping từ cột **PTG** trên Master Sheet.
- **Cột Mã căn**: Mapping từ `Mã căn`, `Mã SP`, `Số căn`.

## 4. Tab Tổng quan (Dashboard)
- **Thống kê**: Tập trung vào 3 tiêu chí: **"Loại hình"**, **"TCBG"**, và **"Quỹ"**.
- **Danh sách Đại lý**: 
  - Lấy dữ liệu từ cột **HB** (ĐL), **HE** (Mã ĐL), **HF** (Tên ĐL), **HC** (Link).
  - **Xử lý N/A**: Không ẩn đại lý nếu có giá trị "N/A". Thay vào đó, hiển thị các giá trị "N/A" hoặc "0" thành **khoảng trắng** để giao diện sạch sẽ nhưng vẫn giữ nguyên thông tin ánh xạ.
  - **Chia bảng**: Nếu danh sách dài, chia thành 2 bảng nhưng **STT vẫn đánh số liên tục**.
- **Điều hướng**: Double-click vào thẻ thống kê sẽ chuyển sang tab Quỹ căn với bộ lọc tương ứng.

## 5. Tab Quỹ căn (Unit Data)
- **Giao diện**: Sử dụng dạng **Rich Card/Row**, không dùng bảng truyền thống.
- **Cột TÊN ĐL (Cột 2)**: 
  - Hiển thị **TÊN ĐL đầy đủ** (từ cột E).
  - Gắn link đối chiếu từ cột **SpreadsheetID**.
- **Cột PTG**: 
  - Nếu ô có dữ liệu, hiển thị **Mã căn** dưới dạng link.
  - Khi nhấn vào link: Chuyển sang tab **Tải tài liệu** và tự động điền Mã căn vào ô tìm kiếm.
- **Tương tác**: 
  - Nút **Thả tim (Like)**: Cho phép người dùng lưu căn hộ vào danh sách quan tâm. Dữ liệu được đồng bộ với Firebase (`favorites`) và hiển thị trạng thái "Đã quan tâm" theo thời gian thực.
  - Nút **Quan tâm căn này** (trong Modal): Hoạt động tương tự nút Thả tim, cho phép bật/tắt trạng thái quan tâm ngay trong chi tiết căn hộ.
- **Ẩn cột nhạy cảm**: Tuyệt đối không hiển thị `Giá vốn`, `Chiết khấu`, `SpreadsheetID`, `TabName`.
- **Định dạng giá**: Tự động chuyển đổi giá từ VNĐ sang Tỷ (nếu số > 1.000.000).

## 6. Tab Tài liệu (Docs)
- **Nguồn link**: Ưu tiên lấy từ cột **PTG**, sau đó đến `Link tài liệu`, `Link PTG`.
- **Điều kiện hiển thị**: Link phải bắt đầu bằng `http` và Mã căn không được rỗng hoặc là `-`.
- **Tìm kiếm**: Hỗ trợ tìm kiếm theo Mã căn, Phân khu, Loại hình.

## 7. Quy tắc Giao diện (UI/UX) & Hiệu suất (Performance)
- **Màu sắc**: Sử dụng hệ màu sang trọng (Gold/Accent, Dark Primary).
- **Hiệu ứng**: Sử dụng `motion/react` cho tất cả các hiệu ứng chuyển cảnh, hover và entry.
- **Mobile**: Tối ưu hóa hiển thị thẻ (Card) thay vì dòng (Row) để tránh dòng quá to.
- **Xử lý N/A**: Luôn hiển thị các giá trị "N/A" thành **khoảng trắng**, không để hiện thô trên giao diện.
- **Tối ưu hóa hiệu suất**:
    - **Cơ chế Cache**: 
        - Dữ liệu Quỹ căn từ Google Sheets được cache trong bộ nhớ 5 phút.
        - **Dữ liệu Dự án (Tab Dự án)**: Được cache trong `localStorage` với thời gian 1 giờ. Điều này giúp trang chủ load gần như tức thì khi người dùng quay lại.
    - **Lifting State**: Dữ liệu Master Sheet được tải một lần tại `ProjectDetailPage` và chia sẻ cho các tab con.
    - **Cập nhật dữ liệu (Global Refresh)**: Nút "Cập nhật" (icon xoay) duy nhất nằm trên **Thanh điều hướng (Navbar)**. Khi nhấn, hệ thống sẽ xóa cache toàn cục và tải lại dữ liệu mới nhất từ Google Sheets cho toàn bộ ứng dụng.
    - **Lazy Loading**: Sử dụng phân trang (20 items/page) cho danh sách Quỹ căn để đảm bảo mượt mà trên mobile.

## 8. Firebase & Bảo mật
- **user_history**: Lưu lại lịch sử quan tâm của người dùng (uid, action, unitCode, projectId).
- **favorites**: Lưu danh sách các căn hộ đã được người dùng "Thả tim" (uid, projectId, unitCode, timestamp).
- **firestore.rules**: Bảo mật dữ liệu theo quyền sở hữu (isOwner) và phân quyền Admin.
