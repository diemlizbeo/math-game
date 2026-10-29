/*
 * Ngân hàng câu hỏi (lấy từ "phiếu trò chơi.docx").
 * Các trường text/options/solution/note là HTML do giáo viên soạn (nội dung tin cậy).
 *
 * Cách thêm câu hỏi:
 *   - Trắc nghiệm: type: 'choice', options: [A, B, C, D], answer: chỉ số đáp án đúng (0 = A).
 *   - Tự luận:     type: 'open',   answerText: đáp án hiển thị khi bấm "Hiện đáp án".
 *   - Nhập số:     type: 'number', answerValue: số nguyên đúng, unit: đơn vị hiển thị cạnh ô nhập,
 *                  answerText: đáp án hiển thị khi bấm "Hiện đáp án".
 *   - figure: đường dẫn ảnh trong thư mục assets (hoặc null).
 */
window.PS = window.PS || {};

(function () {
  const half = '<span class="frac"><span>1</span><span>2</span></span>';

  PS.QUESTIONS = [
    {
      type: 'choice',
      text: 'Cho tam giác ABC có H là trung điểm của AB, K là trung điểm của BC. ' +
            'Đoạn thẳng nào sau đây là đường trung bình của tam giác ABC?',
      figure: null,
      options: ['CK', 'AK', 'HK', 'AC'],
      answer: 2,
      solution: [
        'Xét tam giác ABC có:',
        '• H là trung điểm của AB',
        '• K là trung điểm của BC',
        '⇒ HK là đường trung bình của tam giác ABC (định nghĩa).'
      ],
      note: { label: 'Định nghĩa', text: 'Đoạn thẳng nối trung điểm hai cạnh của tam giác là đường trung bình của tam giác.' }
    },
    {
      type: 'choice',
      text: 'Cho tam giác MNP có D là trung điểm của MP, E là trung điểm của NP. Khi đó ta có:',
      figure: 'assets/cau2-tam-giac-mnp.png',
      figureAlt: 'Tam giác MNP, D là trung điểm MP, E là trung điểm NP',
      options: ['DE // MP', 'DE // NP', 'DE // MN', 'DE = MP : 2'],
      answer: 2,
      solution: [
        'Xét tam giác MNP có:',
        '• D là trung điểm của MP',
        '• E là trung điểm của NP',
        '⇒ DE là đường trung bình của tam giác MNP (định nghĩa)',
        '⇒ DE // MN (định lý).'
      ],
      note: { label: 'Định lý', text: 'Đường trung bình của tam giác song song với cạnh thứ ba và bằng nửa cạnh đó.' }
    },
    {
      type: 'choice',
      text: 'Cho tam giác ABC có E là trung điểm của AB, EF // AC (F thuộc BC). ' +
            'Khẳng định nào sau đây là <strong>sai</strong>?',
      figure: 'assets/cau3-tam-giac-abc.png',
      figureAlt: 'Tam giác ABC, E là trung điểm AB, EF song song AC, F thuộc BC',
      options: [
        'F là trung điểm của BC',
        'F là trung điểm của AB',
        'EF là đường trung bình của tam giác ABC',
        'EF = ' + half + 'BC'
      ],
      answer: 1,
      solution: [
        'Xét tam giác ABC có:',
        '• E là trung điểm của AB',
        '• EF // AC (F thuộc BC)',
        '⇒ F là trung điểm của BC (tính chất).',
        'Vậy khẳng định “F là trung điểm của AB” là sai.'
      ],
      note: { label: 'Tính chất', text: 'Đường thẳng đi qua trung điểm một cạnh của tam giác và song song với cạnh thứ hai thì đi qua trung điểm cạnh thứ ba.' }
    },
    {
      type: 'number',
      answerValue: 1000,
      unit: 'm',
      text: 'Cho B và C là hai điểm cách nhau bởi một hồ nước như hình vẽ, với D, E lần lượt là trung điểm của AB và AC. ' +
            'Biết DE = 500 m. Tính khoảng cách giữa hai điểm B và C.',
      figure: 'assets/cau4-ho-nuoc.jpg',
      figureAlt: 'Ảnh chụp hồ nước với tam giác ABC, D trung điểm AB, E trung điểm AC',
      answerText: 'BC = 1000 m',
      solution: [
        'Vì D, E lần lượt là trung điểm của AB và AC nên DE là đường trung bình của tam giác ABC',
        '⇒ DE = ' + half + 'BC ⇒ BC = 2 · DE.',
        'Khoảng cách giữa hai điểm B và C là: 2 · 500 = <strong>1000 (m)</strong>.'
      ],
      note: null
    }
  ];
})();
