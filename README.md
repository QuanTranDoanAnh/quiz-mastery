# **Ứng dụng Ôn thi Trắc nghiệm (MCQ Flashcard)**

Ứng dụng web dựa trên React giúp bạn ôn luyện các bộ câu hỏi trắc nghiệm thông qua file Markdown. Phiên bản hiện tại đã được tối ưu hóa giao diện di động (Compact UI) và bổ sung các tính năng phòng thi chuyên nghiệp.

## **🚀 Tính năng chính**

* **Import Markdown Thông minh**: Tự động nhận diện câu hỏi từ file văn bản, hỗ trợ cả định dạng tiêu đề \#\#\#.  
* **Đồng hồ đếm ngược**: Giới hạn 60 phút cho mỗi phiên thi, có cảnh báo đỏ khi còn dưới 5 phút.  
* **Hệ thống Lời khen (Praise)**: Hiển thị các câu chúc mừng như "Correct\!", "Nailed it\!" trong khung xanh lá ngay khi trả lời đúng.  
* **Thoát thi an toàn (Exit Quiz)**: Cho phép hủy phiên thi nhanh chóng thông qua nút nhấn và hộp thoại xác nhận.  
* **Ngẫu nhiên hóa**: Xáo trộn danh sách câu hỏi và thứ tự các lựa chọn trong mỗi câu.  
* **Lưu lịch sử (Persistence)**: Tự động lưu kết quả, điểm số và thời gian làm bài vào trình duyệt (localStorage).  
* **Giao diện Compact**: Font chữ và khoảng cách được tinh chỉnh nhỏ gọn, giúp xem toàn bộ nội dung trên di động mà không cần cuộn trang nhiều.

## **📝 Định dạng File Markdown (.md) chuẩn**

Để ứng dụng parse chính xác, file Markdown cần tuân thủ cấu trúc:

\*\*Question 1\*\*: Nội dung câu hỏi ở đây?  
a. Đáp án sai 1  
b. Đáp án sai 2  
\*\*c. Đáp án đúng (được in đậm toàn bộ dòng)\*\*  
d. Đáp án đúng 2 (nếu là câu multi-choice)

\#\#\# \*\*Question 2:\*\* Câu hỏi dạng tiêu đề...  
a. Lựa chọn a  
\*\*b. Lựa chọn đúng\*\*

* **Câu hỏi**: Bắt đầu bằng \*\*Question {n}\*\*: hoặc \#\#\# \*\*Question {n}\*\*:.  
* **Đáp án**: Mỗi đáp án một dòng, bắt đầu bằng a., b.,...  
* **Đáp án đúng**: Có thể in đậm toàn bộ dòng \*\*a. Nội dung\*\* hoặc chỉ phần nội dung a. \*\*Nội dung\*\*.

## **🛠 Cách thiết lập dự án**

1. **Khởi tạo project với Vite**:  
   npm create vite@latest my-quiz \-- \--template react-ts  
   cd my-quiz  
   npm install  
   npm install lucide-react

2. Cài đặt Tailwind CSS v3:  
   Làm theo hướng dẫn tại tailwindcss.com để cài đặt phiên bản 3.x cho Vite.  
3. Thay thế mã nguồn:  
   Copy nội dung từ file App.tsx mà tôi đã cung cấp vào dự án của bạn (thường nằm tại src/App.tsx).

## **📦 Deploy lên GitHub Pages**

1. Cài đặt gh-pages: npm install gh-pages \--save-dev  
2. Thêm "homepage": "https://{username}.github.io/{repo-name}" vào package.json.  
3. Thêm các scripts (Lưu ý: Vite xuất bản ra thư mục dist thay vì build):  
   "scripts": {  
     "dev": "vite",  
     "build": "tsc && vite build",  
     "preview": "vite preview",  
     "predeploy": "npm run build",  
     "deploy": "gh-pages \-d dist"  
   }

4. Chạy lệnh: npm run deploy

## **🧠 Giải thuật xử lý**

* **Regex Parsing**: Sử dụng Lookahead và Lookbehind trong Regex để cắt khối câu hỏi mà không làm mất dữ liệu. Xử lý logic "Early Break" để tránh gộp câu hỏi khi file Markdown không có dòng trống phân cách.  
* **Scoring Logic**: So sánh mảng (Array Comparison). Câu hỏi chỉ được tính điểm khi tập hợp ID người dùng chọn khớp tuyệt đối với tập hợp ID đáp án đúng.  
* **Timer State**: Quản lý bằng setInterval và useRef để đảm bảo độ chính xác của thời gian thực ngay cả khi component re-render.  
* **Responsive**: Sử dụng Tailwind Responsive Prefixes (sm:, md:) kết hợp với các đơn vị tương đối để đảm bảo giao diện luôn vừa vặn trên mọi kích thước màn hình.