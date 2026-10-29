# AGENT.md — Penguin Slide: Game random học sinh cho Toán 8

## 1. Vai trò và mục tiêu

Bạn là AI coding agent chịu trách nhiệm khảo sát codebase hiện tại, lập kế hoạch và triển khai một mini game web dùng trong lớp học Toán 8.

Tên game: **Penguin Slide — Đua chim cánh cụt trượt băng**.

Mục tiêu chính:
- Hiển thị tên của tất cả học sinh cùng lúc trên đường đua.
- Tạo cuộc đua hoạt hình có nhiều lần vượt nhau, thay đổi thứ hạng và hồi hộp đến cuối.
- Cho giáo viên cấu hình thời lượng cuộc đua.
- Kết thúc cuộc đua, chọn một học sinh bằng cơ chế ngẫu nhiên công bằng.
- Sau khi công bố người được chọn, **dừng tại màn hình kết quả** để giáo viên tự chọn hoặc trình chiếu câu hỏi. Không tự động chọn câu hỏi và không bắt buộc phải xây dựng ngân hàng câu hỏi trong phạm vi này.

## 2. Quy tắc làm việc trước khi code

1. Khảo sát cấu trúc dự án, công nghệ, lệnh chạy, quy ước code và các component đang có trước khi sửa.
2. Nếu dự án đã có framework hoặc hệ thống giao diện, hãy tiếp tục sử dụng chúng; không tự ý thay toàn bộ stack.
3. Nếu thư mục chưa có dự án, hãy đề xuất cấu trúc web đơn giản, dễ chạy tại máy giáo viên. Ưu tiên HTML/CSS/JavaScript thuần nếu không có yêu cầu công nghệ khác.
4. Trước thay đổi lớn, trình bày ngắn gọn kế hoạch và các file dự kiến sửa/tạo. Không dừng lại để hỏi những chi tiết có thể giải quyết bằng mặc định hợp lý.
5. Chia code thành các phần có trách nhiệm rõ ràng; tránh một file khổng lồ nếu dự án hiện tại có cấu trúc module.
6. Không thêm backend, tài khoản, dịch vụ trả phí, tracking hoặc phụ thuộc bên ngoài nếu không cần thiết.
7. Không tuyên bố đã chạy/test thành công nếu chưa thực sự chạy. Sau khi code, chạy các kiểm tra khả thi và báo rõ kết quả, giới hạn còn lại.

## 3. Luồng sử dụng chính

1. Giáo viên mở trang game.
2. Giáo viên nhập hoặc dán danh sách tên học sinh; mỗi dòng là một học sinh.
3. Giáo viên có thể sửa danh sách, xóa tên, tải danh sách mẫu hoặc khôi phục danh sách đang dùng.
4. Giáo viên thiết lập thời lượng cuộc đua.
5. Nhấn **Bắt đầu cuộc đua**.
6. Màn hình chuyển sang đường đua băng. Tất cả chim cánh cụt và tên học sinh xuất hiện cùng lúc.
7. Cuộc đua diễn ra trong thời gian đã đặt; chim cánh cụt liên tục thay đổi tốc độ và thứ hạng.
8. Giai đoạn cuối có hiệu ứng nước rút, đếm ngược hoặc nhấn nhá hình ảnh/âm thanh nếu âm thanh được bật.
9. Khi hết giờ, hoạt ảnh kết thúc và hệ thống công bố một học sinh được chọn.
10. Màn hình kết quả giữ nguyên cho đến khi giáo viên nhấn **Lượt tiếp theo** hoặc **Quay lại cài đặt**. Không tự chuyển sang câu hỏi.

## 4. Yêu cầu chức năng

### 4.1. Danh sách học sinh
- Cho phép nhập danh sách bằng cách dán nhiều dòng.
- Loại bỏ dòng trống và khoảng trắng thừa ở đầu/cuối tên.
- Không âm thầm gộp hai học sinh có tên giống nhau; nếu phát hiện tên trùng, cảnh báo giáo viên để họ xác nhận hoặc chỉnh sửa.
- Có thể chỉnh sửa danh sách trước mỗi lượt.
- Hiển thị tổng số học sinh hợp lệ.
- Không yêu cầu kết nối Internet để sử dụng các chức năng cốt lõi.
- Nếu lưu danh sách trên trình duyệt, thông báo rõ dữ liệu được lưu cục bộ; cung cấp nút xóa dữ liệu đã lưu. Không gửi danh sách học sinh ra ngoài thiết bị.

### 4.2. Cài đặt cuộc đua
- Có điều khiển thời lượng cuộc đua với giá trị mặc định hợp lý, ví dụ 20 giây.
- Hỗ trợ các mức thời gian dễ chọn, ví dụ 10, 15, 20, 30, 45 và 60 giây; đồng thời có thể cho nhập giá trị tùy chỉnh trong giới hạn hợp lý.
- Hiển thị thời gian còn lại khi cuộc đua diễn ra.
- Không cho sửa thời lượng giữa cuộc đua; cài đặt mới áp dụng cho lượt tiếp theo.
- Có nút bật/tắt âm thanh để phù hợp môi trường lớp học.

### 4.3. Đường đua
- Phong cách hoạt hình vui tươi, phù hợp học sinh THCS; không dùng hình ảnh đáng sợ, bạo lực hoặc nội dung không phù hợp văn hóa học đường.
- Tất cả học sinh phải có mặt trên màn hình cùng lúc và tên phải dễ đọc trên máy chiếu.
- Mỗi học sinh có một chim cánh cụt riêng, tên hiển thị cạnh hoặc phía trên nhân vật.
- Bố trí đường đua để hạn chế che khuất tên và nhân vật. Với lớp đông, ưu tiên nhiều làn chạy hoặc bố cục tự co giãn.
- Hiển thị rõ vạch xuất phát, vạch đích, thời gian và trạng thái cuộc đua.
- Có màn hình đếm ngược trước xuất phát: 3, 2, 1, BẮT ĐẦU.
- Trong suốt cuộc đua, thứ hạng và vị trí thay đổi nhiều lần. Tránh để một nhân vật dẫn đầu cố định ngay từ đầu.
- Có giai đoạn nước rút cuối cuộc đua và hiệu ứng công bố người được chọn.
- Hoạt ảnh mượt và không làm giảm khả năng đọc tên.
- Ưu tiên CSS/SVG/Canvas và tài nguyên tự tạo hoặc có giấy phép sử dụng phù hợp. Không lấy tùy tiện hình ảnh, âm thanh có bản quyền.
- Giao diện phải thích ứng với màn hình máy chiếu/laptop, ưu tiên tỷ lệ ngang 16:9.

### 4.4. Tính ngẫu nhiên và công bằng — yêu cầu bắt buộc
- Kết quả người được chọn phải được xác định bằng một cơ chế random độc lập với thứ hạng hoạt ảnh.
- Mỗi học sinh đủ điều kiện trong lượt đó có xác suất được chọn như nhau.
- Chuyển động, tốc độ, hiệu ứng vượt nhau và vị trí cán đích chỉ nhằm tạo cảm giác cuộc đua; không được dùng để thiên vị một học sinh.
- Chọn người thắng bằng cách lấy mẫu ngẫu nhiên từ danh sách đủ điều kiện, không dựa trên vị trí cuối của nhân vật.
- Nếu giáo viên bật tùy chọn **Hạn chế lặp lại**, loại học sinh vừa được chọn khỏi các lượt tiếp theo cho đến khi tất cả học sinh đủ điều kiện đã có lượt. Sau khi hết danh sách, hỏi hoặc thông báo rõ rằng vòng mới sẽ bắt đầu; không âm thầm reset.
- Nếu không bật hạn chế lặp lại, mỗi lượt là một lần chọn độc lập.
- Không dùng thời gian chạy hoạt ảnh hoặc thao tác của người dùng làm lý do để thay đổi kết quả đã chọn.
- Kết quả phải được khóa ngay khi cuộc đua bắt đầu hoặc theo một quy trình xác định rõ, tránh bị thay đổi bởi thao tác ngẫu nhiên sau đó. Không hiển thị danh tính đã chọn trước khi cuộc đua kết thúc.
- Ghi chú trong code rằng đây là random phục vụ hoạt động lớp học, không phải hệ thống bốc thăm có chứng nhận.

### 4.5. Màn hình kết quả
- Hiển thị rõ tên học sinh được chọn, nhân vật chiến thắng và lời dẫn tích cực, ví dụ: “Đến lượt bạn chinh phục thử thách Toán học!”
- Có nút **Lượt tiếp theo** và **Quay lại cài đặt**.
- Không tự mở câu hỏi, không tự chấm điểm, không yêu cầu học sinh phải trả lời trong thời gian đếm ngược.
- Giáo viên có thể chuyển sang slide, trang web hoặc tài liệu câu hỏi riêng.
- Không hiển thị thông điệp làm xấu hổ học sinh không được chọn hoặc có nhân vật về cuối.

## 5. Yêu cầu giao diện và trải nghiệm

- Ngôn ngữ giao diện: tiếng Việt.
- Tên game: **PENGUIN SLIDE — ĐUA CHIM CÁNH CỤT**.
- Phong cách: hoạt hình mùa đông, đường băng xanh nhạt, tuyết, núi băng và màu sắc tươi sáng; ưu tiên độ tương phản cao.
- Nút chính to, dễ bấm khi giáo viên thao tác nhanh trên lớp.
- Tên học sinh phải dễ đọc từ xa; không đặt chữ nhỏ trên nền phức tạp.
- Tránh nhấp nháy liên tục, hiệu ứng gây khó chịu hoặc âm lượng đột ngột quá lớn.
- Âm thanh là tùy chọn; game phải hoạt động đầy đủ khi tắt tiếng.
- Tôn trọng `prefers-reduced-motion` nếu có thể; cung cấp chế độ chuyển động giảm nhẹ khi cần.
- Có trạng thái rõ ràng: Cài đặt, Sẵn sàng, Đang đua, Kết quả.
- Chặn thao tác bắt đầu nhiều lần trong khi cuộc đua đang chạy.
- Khi thay đổi kích thước màn hình, bố cục phải cập nhật mà không làm mất tên học sinh.

## 6. Xử lý lớp đông

- Hỗ trợ tối thiểu khoảng 45 học sinh.
- Khi số học sinh nhiều, không cố dồn tất cả vào một hàng khiến tên không đọc được.
- Có thể chia thành nhiều làn ngang hoặc các nhóm làn trên cùng một đường đua, nhưng tất cả tên vẫn phải xuất hiện đồng thời.
- Dùng kích thước nhân vật và chữ linh hoạt theo số lượng học sinh và kích thước vùng hiển thị.
- Nếu không thể hiển thị tên dễ đọc ở kích thước màn hình hiện tại, đưa ra gợi ý phóng to/toàn màn hình hoặc điều chỉnh bố cục; không tự bỏ bớt học sinh.

## 7. Kiến trúc và chất lượng code

- Tách rõ logic danh sách học sinh, cấu hình, random kết quả, trạng thái cuộc đua và phần trình diễn hoạt ảnh.
- Dùng state machine hoặc mô hình trạng thái tương đương để quản lý các trạng thái: `setup`, `ready`, `countdown`, `racing`, `result`.
- Dùng một nguồn thời gian nhất quán để đo thời lượng; không phụ thuộc vào số frame hoạt ảnh.
- Khi hết giờ, hủy hoặc dừng các animation loop/timer đang hoạt động để tránh rò rỉ tài nguyên.
- Xử lý danh sách rỗng, chỉ có một học sinh, tên dài, ký tự tiếng Việt, tên trùng và thay đổi cấu hình.
- Tránh chèn tên học sinh trực tiếp vào HTML theo cách có thể thực thi markup/script; render như text.
- Dùng semantic HTML, nhãn rõ ràng cho các điều khiển và hỗ trợ thao tác bàn phím cơ bản.
- Không thêm thư viện chỉ để làm một hiệu ứng nhỏ nếu có thể giải quyết gọn bằng công nghệ sẵn có.

## 8. Tiêu chí nghiệm thu

Chỉ xem là hoàn thành khi các mục sau được kiểm tra:

- [ ] Giáo viên nhập/dán danh sách nhiều tên và thấy tổng số học sinh hợp lệ.
- [ ] Danh sách có dòng trống được xử lý đúng; tên trùng được cảnh báo.
- [ ] Có thể cấu hình thời lượng trước cuộc đua.
- [ ] Tất cả chim cánh cụt và tên học sinh xuất hiện đồng thời khi bắt đầu.
- [ ] Có đếm ngược xuất phát.
- [ ] Các nhân vật thay đổi vị trí và có nhiều lần vượt nhau trong thời gian chạy.
- [ ] Cuộc đua kết thúc đúng thời lượng đã cài đặt, với sai số nhỏ hợp lý.
- [ ] Kết quả được chọn ngẫu nhiên độc lập với thứ hạng hoạt ảnh.
- [ ] Danh tính được chọn không bị lộ trước khi cuộc đua kết thúc.
- [ ] Màn hình kết quả dừng lại và chờ giáo viên thao tác.
- [ ] Nút lượt tiếp theo hoạt động và tùy chọn hạn chế lặp lại tuân thủ đúng.
- [ ] Có thể chạy khi tắt âm thanh và không có Internet (nếu toàn bộ tài nguyên được đóng gói cục bộ).
- [ ] Bố cục hoạt động với lớp khoảng 45 học sinh và màn hình ngang.
- [ ] Không có lỗi console nghiêm trọng; các lệnh kiểm tra/build sẵn có đã được chạy.
- [ ] Tóm tắt các file đã thay đổi, cách chạy và kết quả kiểm thử.

## 9. Phạm vi chưa làm

Trừ khi người dùng yêu cầu sau:
- Không xây dựng ngân hàng câu hỏi Toán.
- Không tự động chọn câu hỏi sau khi random tên.
- Không xây dựng hệ thống tài khoản, bảng xếp hạng toàn trường hoặc đồng bộ dữ liệu đám mây.
- Không thêm các hình phạt, loại học sinh khỏi hoạt động hoặc nội dung chế giễu người về cuối.
- Không yêu cầu kết nối mạng để chạy phần game cốt lõi.

## 10. Hướng dẫn đầu ra của coding agent

Trước khi triển khai:
1. Tóm tắt hiểu biết về dự án và kế hoạch ngắn gọn.
2. Nêu những giả định quan trọng.
3. Sau đó bắt đầu triển khai theo quy ước của codebase.

Sau khi triển khai:
1. Tóm tắt tính năng đã hoàn thành.
2. Liệt kê file đã tạo/sửa.
3. Nêu lệnh chạy và cách sử dụng.
4. Báo các bài kiểm tra đã chạy và kết quả thực tế.
5. Nêu rõ phần nào chưa hoàn thành hoặc cần cải thiện; không che giấu lỗi.
