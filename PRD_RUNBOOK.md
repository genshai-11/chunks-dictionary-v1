# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD) & HƯỚNG DẪN VẬN HÀNH (RUNBOOK)
## DỰ ÁN: CHUNKS DICTIONARY (TỪ ĐIỂN PHƯƠNG PHÁP CHUNKING & AI BILINGUAL)

---

## MỤC LỤC
1. [TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)](#1-tổng-quan-dự-án-project-overview)
2. [KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)](#2-kiến-trúc-hệ-thống-system-architecture)
3. [TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD - PRODUCT REQUIREMENTS DOCUMENT)](#3-tài-liệu-yêu-cầu-sản-phẩm-prd---product-requirements-document)
   - [3.1. Đối tượng Người dùng & Phân vai (User Personas & Roles)](#31-đối-tượng-người-dùng--phân-vai-user-personas--roles)
   - [3.2. Tính năng dành cho Học viên (Student Features)](#32-tính-năng-dành-cho-học-viên-student-features)
   - [3.3. Tính năng dành cho Giáo viên / Ban biên soạn (Teacher Features)](#33-tính-năng-dành-cho-giáo-viên--ban-biên-soạn-teacher-features)
   - [3.4. Mô hình Dữ liệu & Quản lý Phân loại (Classification & Data Model)](#34-mô-hình-dữ-liệu--quản-lý-phân-loại-classification--data-model)
4. [TÀI LIỆU KỸ THUẬT & API SPECIFICATIONS](#4-tài-liệu-kỹ-thuật--api-specifications)
   - [4.1. Nhóm Route từ điển công khai (dictionaryRouter)](#41-nhóm-route-từ-điển-công-khai-dictionaryrouter)
   - [4.2. Nhóm Route quản lý giáo viên (teacherRouter)](#42-nhóm-route-quản-lý-giáo-viên-teacherrouter)
   - [4.3. Các dịch vụ tích hợp bên ngoài (External Services)](#43-các-dịch-vụ-tích-hợp-bên-ngoài-external-services)
5. [HƯỚNG DẪN VẬN HÀNH (RUNBOOK)](#5-hướng-dẫn-vận-hành-runbook)
   - [5.1. Cấu hình Biến môi trường (.env)](#51-cấu-hình-biến-môi-trường-env)
   - [5.2. Khởi chạy Môi trường Phát triển (Local Development)](#52-khởi-chạy-môi-trường-phát-triển-local-development)
   - [5.3. Quy trình Build & Deployment lên Production](#53-quy-trình-build--deployment-lên-production)
   - [5.4. Vận hành cơ sở dữ liệu Firestore](#54-vận-hành-cơ-sở-dữ-liệu-firestore)
   - [5.5. Hướng dẫn Xử lý sự cố (Troubleshooting Guide)](#55-hướng-dẫn-xử-lý-sự-cố-troubleshooting-guide)

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Sứ mệnh cốt lõi (Mission)
**CHUNKS Dictionary** là một ứng dụng từ điển song ngữ (Anh - Việt) thông minh được thiết kế dựa trên **phương pháp Chunking (Học theo cụm từ)**. Thay vì học từ vựng đơn lẻ một cách máy móc, CHUNKS giúp người học tiếp cận tiếng Anh thông qua các cấu trúc tự nhiên, câu giao tiếp thực tế và phương pháp "Code-Mixing" (trộn mã ngôn ngữ thích nghi cao với môi trường công sở và giao tiếp hiện đại của người Việt).

### 1.2. Giá trị độc đáo (Unique Value Proposition)
*   **Học theo ngữ cảnh**: Phân chia từ vựng thành 4 nhóm cụm từ chức năng (Gap Fillers, Sentence Frames, Idioms, Key Terms) giúp học viên ghi nhớ cách dùng từ lập tức.
*   **Bản địa hóa thông minh**: Hệ thống tạo ví dụ AI sử dụng cả tiếng Anh chuẩn và lối nói trộn mã song ngữ (Code-Mixing) giúp tối ưu hóa khả năng phản xạ tự nhiên của người Việt làm việc trong văn phòng đa quốc gia.
*   **Sức mạnh tích hợp đa chiều**: Kết hợp lưu trữ đồng bộ Firebase Firestore, giọng nói giáo viên bản địa tự ghi âm phối hợp với công nghệ chuyển đổi văn bản sang giọng nói (TTS) và nhận diện giọng nói (STT) thông qua nền tảng API AI tiên tiến.

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Ứng dụng được thiết kế theo mô hình **Full-Stack nguyên khối tối giản (Monolithic Single-Container Architecture)** chạy mượt mà trên môi trường container hóa (như Cloud Run):

```
┌─────────────────────────────────────────────────────────────┐
│                       TRÌNH DUYỆT CLIENT                    │
│  - React 18 SPA (Vite)                                      │
│  - Tailwind CSS & Framer Motion                             │
│  - Tích hợp ghi âm Web Audio API (Voice Search)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Yêu cầu API & Tải Assets tĩnh
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    EXPRESS WEB SERVER (Node.js)             │
│  - Port cố định: 3000                                       │
│  - Vite Middleware (Môi trường dev)                        │
│  - Serving thư mục static dist/ (Môi trường production)      │
│  - Router phân tách: dictionaryRouter & teacherRouter       │
└──────┬───────────────────────┬───────────────────────┬──────┘
       │                       │                       │
┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
│  FIREBASE   │         │   9ROUTER   │         │ CHUNKS CVR  │
│  SERVICES   │         │  LLM / TTS  │         │ MICROSERVICE│
│ - Firestore │         │ - Gemini 3.5│         │ - Chunk CVR │
│ - Auth      │         │ - TTS / STT │         │ - Gen Batch │
└─────────────┘         └─────────────┘         └─────────────┘
```

*   **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (cho hiệu ứng chuyển trang mượt mà).
*   **Backend**: Node.js & Express sử dụng TypeScript. 
    *   Hỗ trợ chạy trực tiếp thông qua công cụ `tsx` ở chế độ Dev.
    *   Sử dụng trình đóng gói `esbuild` biên dịch toàn bộ mã backend thành một file CommonJS duy nhất `dist/server.cjs` tại môi trường Production nhằm loại bỏ xung đột đường dẫn ESM và rút ngắn thời gian khởi động nguội (cold start).
*   **Cơ sở dữ liệu**: Firebase Firestore giúp lưu trữ dữ liệu lớp học (`classes`), từ vựng (`entries`) và danh sách cấu hình của giáo viên một cách an toàn và bền vững.
*   **AI Router (9Router)**: Cổng phân phối tải mô hình ngôn ngữ lớn (LLM), Text-to-Speech (TTS) và Speech-to-Text (STT) tùy chọn giúp giáo viên cấu hình linh hoạt mà không phụ thuộc cứng vào một nhà cung cấp đơn lẻ.

---

## 3. TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD - PRODUCT REQUIREMENTS DOCUMENT)

### 3.1. Đối tượng Người dùng & Phân vai (User Personas & Roles)

#### 3.1.1. Học viên (Students)
*   **Mục tiêu**: Tra cứu cụm từ nhanh chóng, nghe phát âm chuẩn từ giáo viên bản xứ hoặc TTS, hiểu rõ cấu trúc của câu thông qua tính năng phân đoạn câu (Sentence Segmentation), luyện nói tìm kiếm bằng giọng nói.
*   **Phạm vi giao diện**: Chỉ xem được các lớp học, tìm kiếm từ vựng và xem chi tiết cụm từ được phê duyệt/gợi ý bởi giáo viên. Không được phép can thiệp vào kho dữ liệu hay cài đặt hệ thống.

#### 3.1.2. Ban biên soạn / Giáo viên (Teachers / Admin)
*   **Mục tiêu**: Xây dựng học liệu, nhập dữ liệu từ vựng hàng loạt từ Google Sheets, sinh ví dụ ngữ cảnh tự động bằng AI, tự thu âm giọng đọc và phân phối danh mục từ vựng gợi ý theo từng lớp học.
*   **Phạm vi giao diện**: Đăng nhập thông qua tài khoản được phân quyền (`teacher@chunks.edu.vn`), truy cập hệ thống Quản trị (Teacher Dashboard), quản lý các lớp học, thực hiện các thao tác CRUD từ vựng và cấu hình mô hình AI.

---

### 3.2. Tính năng dành cho Học viên (Student Features)

1.  **Trình duyệt lớp học học viên (Classroom Browser)**:
    *   Hiển thị danh sách các lớp học hiện có trong trường học.
    *   Khi chọn một lớp, hệ thống tự động lọc ra các từ vựng được giáo viên đề xuất (`isRecommended`) riêng cho lớp học đó để học viên tập trung rèn luyện.
2.  **Bộ lọc phân loại từ vựng trực quan**:
    *   Hỗ trợ lọc nhanh từ vựng theo 4 nhóm màu phương pháp chunking giúp ghi nhớ có hệ thống trực quan.
3.  **Hộp tìm kiếm thông minh phối hợp Giọng nói (Voice Search)**:
    *   Học viên có thể nhập văn bản hoặc click vào biểu tượng Microphone để thu âm giọng nói trực tiếp.
    *   Giọng nói thu âm dạng Base64 được gửi lên server qua API STT để nhận diện từ cần tra cứu, tối ưu hóa phát âm.
4.  **Hộp phân tích phân tách câu (Sentence Segmenter)**:
    *   Học viên có thể dán một câu tiếng Anh bất kỳ (ví dụ: *"Hey guys, let's wrap up this project by Friday because we need to submit it to the client"*).
    *   Hệ thống gọi AI bóc tách câu này thành các đoạn nhỏ (chunks) riêng biệt kèm theo định dạng màu phân loại và định nghĩa dịch nghĩa tiếng Việt tương ứng.
5.  **Trình phát âm thanh bài giảng**:
    *   Học viên có thể nghe giọng đọc mẫu. Ưu tiên phát giọng thu âm thực tế của Giáo viên. Nếu không có file thu âm thực tế, hệ thống tự động sinh file âm thanh đọc tự động (TTS) chất lượng cao bằng AI.

---

### 3.3. Tính năng dành cho Giáo viên / Ban biên soạn (Teacher Features)

1.  **Quản lý lớp học (Classroom CRUD)**:
    *   Thêm mới, sửa thông tin, đặt tên và mô tả chi tiết lớp học (ví dụ: *Lớp tiếng Anh văn phòng Chunks Starter*).
2.  **Quản lý từ vựng nâng cao (Vocabulary Management)**:
    *   Giao diện nhập liệu chi tiết: Từ khóa tiếng Anh, bản dịch nghĩa tiếng Việt, phân loại nhóm chunking, ghi chú từ loại, định nghĩa tiếng Anh.
    *   **Batch Actions**: Cho phép chọn nhiều từ vựng đồng thời để:
        *   Xóa hàng loạt (Bulk Delete).
        *   Cập nhật trạng thái màu sắc / loại chunking đồng loạt.
        *   Gọi AI tạo ví dụ hàng loạt (Batch AI Generation).
        *   Gọi AI sinh âm thanh giọng đọc hàng loạt (Batch TTS Audio generation).
3.  **Tích hợp Google Sheets để nhập liệu hàng loạt (Bulk Import)**:
    *   Giáo viên cấu hình Spreadsheet ID, mã GID của trang tính và khoảng phạm vi dữ liệu (Range).
    *   Hệ thống tự động kết nối qua API proxy để phân tích và nạp trực tiếp hàng trăm cụm từ vào hệ thống trong vài giây.
4.  **Bảng cấu hình 9Router & AI**:
    *   Giao diện quản lý tham số kết nối API: Endpoint 9Router, API Key, cấu hình model LLM mặc định cho tác vụ tạo ví dụ, model TTS phát âm, và model STT nhận diện tìm kiếm giọng nói.
5.  **Quản trị file âm thanh (Audio Manager)**:
    *   Quản lý danh sách các bản ghi âm của giáo viên và các file TTS được đồng bộ hóa.

---

### 3.4. Mô hình Dữ liệu & Quản lý Phân loại (Classification & Data Model)

Phương pháp Chunking trong hệ thống chia từ vựng làm 4 nhóm chính:

| Tên nhóm phân loại | Mã định danh màu | Ý nghĩa phương pháp | Ví dụ cụ thể |
| :--- | :--- | :--- | :--- |
| **Gap Fillers** | `#1D4ED8` (Xanh dương) | Những cụm từ đệm để kéo dài thời gian suy nghĩ, tạo sự tự nhiên. | *Honestly speaking, to be fair, you know* |
| **Sentence Frames** | `#D97706` (Vàng ấm) | Khung sườn câu dùng để ráp các nội dung khác vào. | *The main reason why... is that...* |
| **Idioms & Collocations**| `#059669` (Xanh lá) | Thành ngữ hoặc cụm từ thường đi đôi với nhau tự nhiên. | *Learn by heart, pay attention to* |
| **Key Terms** | `#DC2626` (Đỏ) | Từ khóa quan trọng, thuật ngữ chuyên ngành công sở. | *Incorporate, execute, bottleneck, deliverables* |

---

## 4. TÀI LIỆU KỸ THUẬT & API SPECIFICATIONS

Toàn bộ API được nhóm và định tuyến thông qua hai Router Express riêng biệt giúp hệ thống mô-đun hóa sạch sẽ và ngăn ngừa lỗi xung đột định tuyến chéo.

### 4.1. Nhóm Route từ điển công khai (`dictionaryRouter`)
Được đăng ký tại gốc `/api`, phục vụ các tác vụ công khai của học viên:

*   **`GET /api/entries`**
    *   *Chức năng*: Lấy toàn bộ danh sách cụm từ vựng có trong hệ thống từ Firestore.
*   **`GET /api/search?q=...&color=...`**
    *   *Chức năng*: Tìm kiếm cụm từ theo từ khóa song ngữ Anh/Việt kết hợp lọc theo màu sắc phân loại.
*   **`POST /api/segment`**
    *   *Tham số*: `{ sentence: string }`
    *   *Chức năng*: Gọi AI bóc tách phân tích câu tiếng Anh phức tạp thành các mảng cụm từ dễ học.
*   **`POST /api/tts`**
    *   *Tham số*: `{ text: string }`
    *   *Chức năng*: Sinh dữ liệu âm thanh phát âm từ văn bản dưới dạng Base64 (có hỗ trợ cache tránh gọi trùng lặp tốn tài nguyên).
*   **`POST /api/voice-search`**
    *   *Tham số*: `{ audioBase64: string }`
    *   *Chức năng*: Nhận dạng file âm thanh ghi âm từ microphone của học viên để trả về kết quả tìm kiếm dạng text.
*   **`POST /api/measure-cvr`**
    *   *Chức năng*: Gửi chỉ số đo lường hiệu quả chuyển đổi (CVR) của các cụm từ vựng sang microservice phân tích.
*   **`POST /api/chunk-generate`** & **`POST /api/chunk-generate/batch`**
    *   *Chức năng*: Phân tích và sinh cấu trúc chunks đơn lẻ hoặc hàng loạt thông qua microservice liên kết chuyên dụng.

---

### 4.2. Nhóm Route quản lý giáo viên (`teacherRouter`)
Yêu cầu quyền truy cập giáo viên (được kiểm soát thông qua phiên đăng nhập được mã hóa hoặc kiểm tra trạng thái quyền từ phía máy chủ):

*   **`GET /api/classes`**
    *   *Chức năng*: Lấy danh sách toàn bộ lớp học hiện có.
*   **`POST /api/classes`**
    *   *Tham số*: `{ name: string, description?: string }`
    *   *Chức năng*: Tạo thêm lớp học mới.
*   **`PUT /api/classes/:id`**
    *   *Chức năng*: Cập nhật thông tin lớp học.
*   **`DELETE /api/classes/:id`**
    *   *Chức năng*: Xóa lớp học khỏi Firestore.
*   **`POST /api/entries`**
    *   *Chức năng*: Thêm hoặc sửa đổi chi tiết một cụm từ vựng (CRUD từ vựng đơn lẻ).
*   **`POST /api/entries/recommendations`**
    *   *Tham số*: `{ recommendedIds: string[] }`
    *   *Chức năng*: Đánh dấu danh sách các từ vựng khuyến nghị sử dụng cho lớp học cụ thể.
*   **`POST /api/entries/bulk`**
    *   *Chức năng*: Thêm mới hàng loạt từ vựng cùng lúc.
*   **`DELETE /api/entries/:id`**
    *   *Chức năng*: Xóa cụm từ vựng khỏi hệ thống dựa vào ID.
*   **`POST /api/sheets/import`**
    *   *Tham số*: `{ spreadsheetId: string, gid: string, range: string, token: string }`
    *   *Chức năng*: Đóng vai trò proxy gọi Google Sheets API để tải dữ liệu trang tính an toàn về cho server xử lý.
*   **`POST /api/ai/examples`**
    *   *Chức năng*: Gọi mô hình AI sinh ví dụ tiếng Anh tự nhiên phù hợp với đối tượng học viên mục tiêu.
*   **`POST /api/ai/codemix`**
    *   *Chức năng*: Gọi mô hình AI sinh câu ví dụ Code-Mixing độc quyền (Trộn tiếng Anh công sở vào ngữ cảnh tiếng Việt văn phòng).
*   **`GET /api/9router/models`**
    *   *Chức năng*: Lấy danh sách các dòng model khả dụng từ 9Router để hiển thị trên giao diện cấu hình.
*   **`POST /api/9router/test-tts`** & **`POST /api/9router/test-stt`**
    *   *Chức năng*: Kiểm tra tính năng kết nối phát âm và nhận diện giọng nói của cấu hình AI hiện tại.

---

### 4.3. Các dịch vụ tích hợp bên ngoài (External Services)

#### 4.3.1. Chunks CVR Analyzer Microservice
*   **URL Gốc**: `https://chunks-cvr-api-781691010426.asia-southeast1.run.app`
*   Hệ thống Express Backend tự động chuyển tiếp (forward) các yêu cầu phân tích mức độ tương tác và chuyển đổi cụm từ của người học qua API bảo mật bằng Token hoặc API Key (`M2M_API_KEY`).

#### 4.3.2. Google Sheets API Integration
*   Server đóng vai trò trung gian trao đổi dữ liệu định dạng JSON để bóc tách cột và hàng trong bảng tính của Giáo viên, chuyển đổi linh hoạt thành Schema đối tượng `DictionaryEntry` của ứng dụng mà không để lộ token ứng dụng khách trực tiếp.

---

## 5. HƯỚNG DẪN VẬN HÀNH (RUNBOOK)

### 5.1. Cấu hình Biến môi trường (.env)
Tạo file `.env` tại thư mục gốc của dự án (mẫu tham khảo nằm tại `.env.example`):

```env
# Port chạy ứng dụng (Mặc định bắt buộc 3000 cho cơ chế định tuyến Cloud Run)
PORT=3000

# Node Environment
NODE_ENV=development

# Khóa kết nối nội bộ đến Microservice đo lường chuyển đổi cụm từ
M2M_API_KEY=m2m_CHUNK_ANALYZER_SECURE_2026

# Khóa API Gemini Server-side (Dùng trực tiếp khi không đi qua 9router)
GEMINI_API_KEY=AIzaSyD...

# Đường dẫn tệp cấu hình Firebase kết nối (Tự động tải khi khởi chạy)
FIREBASE_CONFIG_PATH=./firebase-applet-config.json
```

---

### 5.2. Khởi chạy Môi trường Phát triển (Local Development)

#### Bước 1: Cài đặt thư viện phụ thuộc
```bash
npm install
```

#### Bước 2: Chạy server ở chế độ Development
```bash
npm run dev
```
*   **Cơ chế**: Lệnh này kích hoạt tệp `server.ts` bằng trình chạy siêu tốc `tsx`. 
*   **Địa chỉ truy cập**: Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).
*   **Lưu ý**: Client-side Hot Module Replacement (HMR) được thiết lập ẩn dưới dạng middleware tích hợp của Vite giúp các thay đổi mã hiển thị lập tức mà không cần khởi động lại Node Express Server.

---

### 5.3. Quy trình Build & Deployment lên Production

#### Bước 1: Biên dịch ứng dụng (Build phase)
Chạy lệnh đóng gói duy nhất:
```bash
npm run build
```
**Cơ chế hoạt động của tiến trình Build:**
1.  **Vite** sẽ tiến hành dịch và tối ưu hóa toàn bộ giao diện Client React SPA, kết quả xuất ra thư mục tĩnh `/dist`.
2.  **Esbuild** tiến hành biên dịch tệp TypeScript Backend `server.ts` và gộp toàn bộ các import cục bộ lại để xuất ra một file CommonJS tự chứa duy nhất tại địa chỉ `/dist/server.cjs`. Các gói thư viện ngoài (external npm packages) được giữ liên kết động an toàn nhờ cờ `--packages=external`.

#### Bước 2: Khởi chạy môi trường Production (Start phase)
Kích hoạt máy chủ chạy file đã được tối ưu hóa:
```bash
npm run start
```
*   Ứng dụng sẽ tự phục vụ giao diện tĩnh và định tuyến mọi yêu cầu `/api` cực kỳ nhanh chóng từ một file đích biên dịch duy nhất, giảm thiểu tối đa độ trễ I/O trên hệ thống file ảo Cloud Run.

---

### 5.4. Vận hành cơ sở dữ liệu Firestore

*   **Tệp cấu hình**: `firebase-applet-config.json` chứa các thông số định danh dự án Firestore.
*   **Tệp khởi tạo Schema & Blueprints**: `firebase-blueprint.json` định nghĩa cấu trúc dữ liệu cơ sở cho Firestore.
*   **Quy tắc bảo mật (Security Rules)**: Được lưu tại `firestore.rules`. Đảm bảo các quy tắc đọc/ghi được cập nhật và kiểm thử an toàn trước khi triển khai hệ thống thật:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Cấu hình phù hợp cho môi trường thử nghiệm / lớp học nội bộ
    }
  }
}
```
*   **Triển khai Firestore Rules**: Sử dụng lệnh deploy của môi trường khi có sự thay đổi tại tệp `firestore.rules`.

---

### 5.5. Hướng dẫn Xử lý sự cố (Troubleshooting Guide)

#### 5.5.1. Lỗi stream gRPC Firestore quá hạn (gRPC idle connection timeout)
*   *Triệu chứng*: Log hệ thống xuất hiện cảnh báo: `@firebase/firestore: Firestore (12.14.0): GrpcConnection RPC 'Listen' stream ... CANCELLED: Disconnecting idle stream. Timed out waiting for new targets.`
*   *Nguyên nhân*: Kết nối gRPC Listener giữa ứng dụng Node.js và máy chủ Google Firestore bị ngắt do không phát sinh truy vấn mới trong thời gian dài (Idle timeout). Đây là hành vi hoàn toàn bình thường của Firestore SDK khi duy trì kênh kết nối dài hạn.
*   *Cách khắc phục*: 
    1.  Hệ thống đã được tích hợp cấu hình tắt bớt mức độ Log thừa thãi bằng phương thức `setLogLevel("error")` trong hàm khởi tạo cơ sở dữ liệu Firestore của `server.ts`. Việc này giúp loại bỏ log trôi gây nhiễu và cải thiện hiệu năng xử lý.
    2.  Nếu luồng dữ liệu bị treo cứng (vô cùng hiếm gặp), chỉ cần gọi API bất kỳ hoặc làm mới giao diện trình duyệt để SDK tự động thiết lập lại kết nối gRPC mới.

#### 5.5.2. Máy chủ không thể khởi chạy thành công (Vite not found hoặc tsx not found)
*   *Nguyên nhân*: Thư mục `node_modules` bị thiếu hoặc hỏng do quá trình kéo mã nguồn bị gián đoạn.
*   *Cách khắc phục*: Thực hiện dọn dẹp và cài đặt sạch lại bằng lệnh:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```

#### 5.5.3. Không nghe được âm thanh phát âm mẫu (TTS / Audio error)
*   *Nguyên nhân*: Cấu hình API Key hoặc Endpoint 9Router bị sai lệch hoặc tài khoản AI hết hạn ngạch (quota).
*   *Cách khắc phục*: 
    1.  Truy cập vào trang **Cấu hình AI** trên thanh điều hướng hoặc góc cấu hình của Giáo viên.
    2.  Kiểm tra các thông số API Endpoint và Key xem có chính xác hay không.
    3.  Thực hiện bấm nút **Test TTS** để kiểm tra phản hồi lỗi trực tiếp từ API Gateway trước khi lưu lại.

---

*Tài liệu này được soạn thảo và kiểm duyệt tự động để đảm bảo tính đồng bộ hoàn hảo với mã nguồn hiện tại của dự án CHUNKS Dictionary.*
