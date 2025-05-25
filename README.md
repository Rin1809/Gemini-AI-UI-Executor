# Gemini UI Executor - AI Generates And Executes Code ᓚᘏᗢ


<!-- Vietnamese -->
<details>
<summary>🇻🇳 Tiếng Việt</summary>

## Giới thiệu

Gemini UI Executor là một giao diện người dùng (UI) web cho phép bạn tương tác với Google Gemini để:

1.  **Tạo mã nguồn:** Sinh mã (Python, Shell, Batch, PowerShell, v.v.) dựa trên yêu cầu bằng ngôn ngữ tự nhiên của bạn.
2.  **Thực thi mã:** Chạy mã vừa tạo trực tiếp trên máy chủ backend (máy tính của bạn).
3.  **Đánh giá & Gỡ lỗi:** Yêu cầu AI đánh giá độ an toàn/hiệu quả của mã hoặc giúp gỡ lỗi khi mã chạy sai.
4.  **Giải thích:** Yêu cầu AI giải thích một đoạn mã, kết quả thực thi, hoặc thông báo lỗi.

Công cụ này được thiết kế để thử nghiệm khả năng sinh mã của AI và thực thi các tác vụ đơn giản một cách nhanh chóng thông qua giao diện đồ họa.

**Giao diện bao gồm:**

*   **Backend:** Một server Flask (Python) xử lý logic, giao tiếp với API Gemini và thực thi mã.
*   **Frontend:** Một ứng dụng React (Vite) cung cấp giao diện người dùng trong trình duyệt.

**LƯU Ý CỰC KỲ QUAN TRỌNG - ĐỌC KỸ:**

*   ⚠️ **RỦI RO BẢO MẬT:** Công cụ này cho phép AI tạo và **THỰC THI MÃ TRỰC TIẾP TRÊN MÁY TÍNH CỦA BẠN**. Mã do AI tạo ra có thể **KHÔNG AN TOÀN**, chứa lỗi, hoặc thực hiện các hành động không mong muốn, **bao gồm cả việc xóa file, thay đổi cài đặt hệ thống, hoặc cài đặt phần mềm độc hại.**
*   🛑 **SỬ DỤNG VỚI SỰ CẨN TRỌNG TỐI ĐA:** Chỉ thực thi mã nếu bạn **HIỂU RÕ** nó làm gì và chấp nhận hoàn toàn rủi ro. **TUYỆT ĐỐI KHÔNG** chạy các yêu cầu hoặc mã mà bạn không chắc chắn. Luôn sử dụng chức năng "Đánh giá" (Review) trước khi "Thực thi" (Execute).
*   🔑 **BẢO MẬT API KEY:** KHÔNG chia sẻ file `.env` hoặc API Key của bạn cho bất kỳ ai. API Key có thể bị lạm dụng và gây tốn kém chi phí.
*   💰 **CHI PHÍ API:** Việc sử dụng API Google Gemini có thể phát sinh chi phí. Hãy kiểm tra bảng giá của Google Cloud.
*   🚫 **TỪ CHỐI TRÁCH NHIỆM:** Người tạo ra công cụ này **KHÔNG CHỊU TRÁCH NHIỆM** cho bất kỳ thiệt hại, mất mát dữ liệu, hoặc sự cố bảo mật nào xảy ra do việc sử dụng công cụ này. **BẠN CHỊU HOÀN TOÀN TRÁCH NHIỆM KHI SỬ DỤNG.**
*   **MỤC ĐÍCH:** Công cụ này chủ yếu dành cho mục đích thử nghiệm, học tập và thực hiện các tác vụ tự động hóa cá nhân đơn giản, **KHÔNG** dành cho môi trường sản xuất (production) hoặc xử lý các tác vụ quan trọng/nhạy cảm.

## Tính năng

*   **Sinh mã đa nền tảng:** Yêu cầu AI tạo mã cho Windows (.bat, .ps1), Linux/macOS (.sh) hoặc Python (.py), hay các loại file tùy chỉnh khác.
*   **Thực thi trực tiếp:** Chạy mã được tạo trên backend với tùy chọn "Run as Admin/Root" (yêu cầu backend có quyền tương ứng).
*   **Đánh giá mã bởi AI:** Nhận xét về độ an toàn, tính đúng đắn và đề xuất cải tiến cho mã.
*   **Gỡ lỗi thông minh:** Khi mã thực thi lỗi, AI sẽ phân tích lỗi (stderr), output (stdout) và mã nguồn để đề xuất sửa lỗi hoặc các bước khắc phục (bao gồm gợi ý `pip install` cho Python).
*   **Cài đặt Package:** Tự động cài đặt các package Python được AI đề xuất trong quá trình gỡ lỗi.
*   **Giải thích bởi AI:** Yêu cầu giải thích cho mã nguồn, kết quả thực thi, kết quả đánh giá/gỡ lỗi, hoặc thông báo lỗi chung.
*   **Tùy chỉnh Gemini:** Điều chỉnh model, nhiệt độ (temperature), top P, top K, và cài đặt an toàn (safety settings).
*   **Quản lý API Key:** Sử dụng API Key từ file `.env` ở backend hoặc nhập trực tiếp vào UI.
*   **Giao diện trực quan:** Hiển thị cuộc hội thoại dưới dạng các khối tương tác, bao gồm output, error, nút hành động và định dạng mã nguồn.
*   **Quản lý hội thoại:** Thu gọn/mở rộng các lượt hội thoại cũ để dễ theo dõi.

## Điều kiện tiên quyết

Trước khi cài đặt, bạn cần đảm bảo đã cài đặt các phần mềm sau trên máy tính của mình:

1.  **Python 3:** Phiên bản 3.8 trở lên được khuyến nghị. Đảm bảo `python` hoặc `python3` và `pip` đã được thêm vào biến môi trường PATH của hệ thống.
    *   Tải Python: [https://www.python.org/downloads/](https://www.python.org/downloads/)
    *   *Lưu ý khi cài trên Windows:* Đánh dấu vào ô "Add Python to PATH" trong quá trình cài đặt.
2.  **Node.js và npm:** Phiên bản LTS (Long Term Support) được khuyến nghị. `npm` thường đi kèm với Node.js.
    *   Tải Node.js: [https://nodejs.org/](https://nodejs.org/)
3.  **Git:** Để tải mã nguồn từ GitHub.
    *   Tải Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)

## Cài đặt

1.  **Tải mã nguồn:** Mở terminal (Command Prompt, PowerShell, Terminal) và chạy lệnh sau:
    ```bash
    git clone https://github.com/your-username/gemini-ui-executor.git
    cd gemini-ui-executor
    ```
    *(Thay `your-username` bằng tên người dùng GitHub của bạn nếu bạn fork repository).*

2.  **Lấy API Key:**
    *   **Lấy khóa API của Gemini tại:** [https://ai.google.dev/gemini-api/docs/api-key](https://ai.google.dev/gemini-api/docs/api-key)
    *   Bạn có thể cấu hình key này trong file `.env` ở thư mục gốc hoặc nhập trực tiếp vào phần Cài đặt (⚙️) trong giao diện ứng dụng. File `.gitignore` đã được cấu hình để bỏ qua file `.env`. **KHÔNG chia sẻ API Key của bạn.**

3.  **Chạy Script Cài đặt:**
    *   **Trên Linux hoặc macOS:**
        *   Mở terminal, điều hướng đến thư mục `linux-macos`: `cd linux-macos`
        *   Cấp quyền thực thi cho script: `chmod +x setup.sh`
        *   Chạy script cài đặt: `./setup.sh`
    *   **Trên Windows:**
        *   Mở Command Prompt hoặc PowerShell **với quyền Administrator** (Click chuột phải -> Run as administrator).
        *   Điều hướng đến thư mục `windows`: `cd windows`
        *   Chạy script cài đặt: `setup.bat`

    *Script cài đặt sẽ tự động:*
    *   Tạo môi trường ảo Python (`venv`) cho backend.
    *   Kích hoạt môi trường ảo và cài đặt các thư viện Python cần thiết từ `backend/requirements.txt`.
    *   Cài đặt các thư viện Node.js cần thiết cho frontend từ `frontend/package.json` bằng `npm install`.
    *   *Hãy kiên nhẫn, quá trình này có thể mất vài phút.* Theo dõi output trên terminal để phát hiện lỗi (nếu có).

## Chạy ứng dụng

Sau khi cài đặt thành công:

1.  **Chạy Script Khởi động:**
    *   **Trên Linux hoặc macOS:**
        *   Mở terminal, điều hướng đến thư mục `linux-macos`: `cd linux-macos`
        *   Cấp quyền thực thi cho script: `chmod +x run.sh`
        *   Chạy script khởi động: `./run.sh`
    *   **Trên Windows:**
        *   Mở Command Prompt hoặc PowerShell. **Không cần** quyền Administrator cho bước này.
        *   Điều hướng đến thư mục `windows`: `cd windows`
        *   Chạy script khởi động: `run.bat`

    *Script khởi động sẽ tự động mở **HAI** cửa sổ terminal/command prompt mới:*
    *   Một cửa sổ chạy **Backend Server** (Flask trên cổng 5001).
    *   Một cửa sổ chạy **Frontend Dev Server** (Vite trên cổng 5173).

2.  **Truy cập Giao diện Web:** Mở trình duyệt web của bạn và truy cập địa chỉ:
    [http://localhost:5173](http://localhost:5173)

3.  **Để dừng ứng dụng:** Đóng cả hai cửa sổ terminal/command prompt đã được mở bởi script `run`.

## Hướng dẫn sử dụng

1.  **Nhập Yêu cầu:** Gõ yêu cầu của bạn vào ô nhập liệu. Nhấn `Ctrl + Enter` hoặc nút Gửi. Ví dụ prompt:
    *   "tạo file text tên là 'hello.txt' ở Download/ chứa nội dung 'Xin chào thế giới'"
    *   "Ip máy tính của tôi là bao nhiêu?"
    *   "Show pid google"
    *   "Mở youtube"
2.  **Chọn Mục tiêu (trong Sidebar):** Mở Sidebar (biểu tượng bánh răng ⚙️) để chọn:
    *   **Hệ điều hành Mục tiêu:** Nơi mã sẽ được chạy (Windows, Linux, macOS, hoặc Tự động).
    *   **Loại File Thực thi:** Loại file bạn muốn AI tạo (.py, .sh, .bat, .ps1, hoặc nhập tên/đuôi file tùy chỉnh).
3.  **Tạo Mã:** Nhấn nút Gửi. AI sẽ tạo mã và hiển thị trong một khối mới.
4.  **Tương tác với Mã:**
    *   **Sao chép/Tải xuống:** Sử dụng các biểu tượng trên khối mã.
    *   **Đánh giá (Review):** Nhấn nút "Đánh giá" để AI phân tích mã. Kết quả đánh giá sẽ xuất hiện bên dưới.
    *   **Thực thi (Execute):** Nhấn nút "Thực thi". Output (stdout) và Lỗi (stderr) sẽ hiển thị trong một khối mới. *Hãy cực kỳ cẩn thận với chức năng này!*
    *   **Gỡ lỗi (Debug):** Nếu khối "Thực thi" báo lỗi, nút "Gỡ lỗi" sẽ xuất hiện. Nhấn để AI phân tích và đề xuất sửa lỗi.
    *   **Cài đặt Package (Install):** Nếu khối "Gỡ lỗi" đề xuất cài đặt package Python, một nút "Cài đặt" sẽ xuất hiện.
    *   **Áp dụng Mã Sửa lỗi (Apply):** Nếu khối "Gỡ lỗi" cung cấp mã đã sửa, nhấn "Sử dụng Mã Này" để tạo một khối mã mới với phiên bản đã sửa.
    *   **Giải thích (Explain):** Nhấn nút "Giải thích" trên bất kỳ khối nào (mã, kết quả thực thi, đánh giá, gỡ lỗi, lỗi) để yêu cầu AI làm rõ nội dung.
5.  **Cài đặt (Sidebar):**
    *   **Model & Tham số:** Chọn model Gemini, điều chỉnh Temperature, Top P, Top K. Nhấn nút Lưu (💾) để lưu lựa chọn model.
    *   **API Key:** Nhập API Key và nhấn "Sử dụng Key Này" để ghi đè key từ `.env` (nếu có). Nhấn "Sử dụng Key .env" để quay lại dùng key mặc định từ `.env`.
    *   **Cài đặt Khác:** Chọn mức độ lọc an toàn và bật/tắt tùy chọn "Chạy với quyền Admin/Root" (⚠️ Cẩn thận!).

## Cấu trúc thư mục
```
gemini-ui-executor/
├── .env                  # Chứa API Key của bạn 
├── .gitignore            # Các file/thư mục bị Git bỏ qua
├── backend/              # Mã nguồn server Flask Python
│   ├── app.py            # File Flask chính
│   ├── requirements.txt  # Các thư viện Python cần cài
│   └── venv/             # Môi trường ảo Python (được tạo bởi setup)
├── frontend/             # Mã nguồn giao diện React Vite
│   ├── .gitignore        # Gitignore riêng cho frontend
│   ├── index.html        # File HTML gốc
│   ├── package.json      # Thông tin và dependencies của frontend
│   ├── package-lock.json # Khóa phiên bản dependencies
│   ├── vite.config.ts    # Cấu hình Vite
│   ├── tsconfig.json     # Cấu hình TypeScript
│   ├── ... (các file cấu hình khác)
│   ├── public/           # Các tài nguyên tĩnh (icon, ảnh)
│   └── src/              # Mã nguồn React/TypeScript
│       ├── App.tsx       # Component chính
│       ├── main.tsx      # Điểm vào ứng dụng
│       ├── components/   # Các component UI (Sidebar, CenterArea, ...)
│       ├── assets/       # Tài nguyên dùng trong source
│       └── *.css         # Các file CSS
├── linux-macos/          # Script cho Linux và macOS
│   ├── run.sh            # Script để chạy ứng dụng
│   └── setup.sh          # Script để cài đặt dependencies
├── users.txt             # (Có vẻ không được sử dụng)
├── windows/              # Script cho Windows
│   ├── run.bat           # Script để chạy ứng dụng
│   └── setup.bat         # Script để cài đặt dependencies
└── README.md             # File bạn đang đọc
```

</details>

<!-- English -->
<details>
<summary>🇬🇧 English</summary>

## Introduction

Gemini UI Executor is a web-based user interface (UI) that allows you to interact with Google Gemini to:

1.  **Generate Code:** Create code (Python, Shell, Batch, PowerShell, etc.) based on your natural language requests.
2.  **Execute Code:** Run the generated code directly on the backend server (your machine).
3.  **Review & Debug:** Ask the AI to review the code's safety/efficiency or help debug it when execution fails.
4.  **Explain:** Request the AI to explain a piece of code, execution results, or error messages.

This tool is designed for experimenting with AI code generation capabilities and quickly performing simple tasks through a graphical interface.

**The interface consists of:**

*   **Backend:** A Flask (Python) server that handles logic, communicates with the Gemini API, and executes code.
*   **Frontend:** A React (Vite) application that provides the user interface in the browser.

**EXTREMELY IMPORTANT WARNING - READ CAREFULLY:**

*   ⚠️ **SECURITY RISK:** This tool allows AI to generate and **EXECUTE CODE DIRECTLY ON YOUR COMPUTER**. AI-generated code can be **UNSAFE**, contain bugs, or perform unexpected actions, **including deleting files, changing system settings, or installing malicious software.**
*   🛑 **USE WITH EXTREME CAUTION:** Only execute code if you **FULLY UNDERSTAND** what it does and accept all risks. **NEVER** run requests or code you are unsure about. Always use the "Review" function before "Execute".
*   🔑 **API KEY SECURITY:** DO NOT share your `.env` file or API Key with anyone. API Keys can be misused and incur costs.
*   💰 **API COSTS:** Using the Google Gemini API may incur costs. Please check Google Cloud's pricing.
*   🚫 **DISCLAIMER:** The creator of this tool is **NOT RESPONSIBLE** for any damage, data loss, or security incidents resulting from its use. **YOU USE IT ENTIRELY AT YOUR OWN RISK.**
*   **PURPOSE:** This tool is primarily for experimental, educational purposes, and simple personal automation tasks. It is **NOT** intended for production environments or handling critical/sensitive tasks.

## Features

*   **Cross-Platform Code Generation:** Ask the AI to generate code for Windows (.bat, .ps1), Linux/macOS (.sh), Python (.py), or other custom file types.
*   **Direct Execution:** Run generated code on the backend with an optional "Run as Admin/Root" setting (requires the backend to have corresponding permissions).
*   **AI Code Review:** Get feedback on code safety, correctness, and suggestions for improvement.
*   **Intelligent Debugging:** When code execution fails, the AI analyzes the error (stderr), output (stdout), and source code to suggest fixes or troubleshooting steps (including `pip install` suggestions for Python).
*   **Package Installation:** Automatically install Python packages suggested by the AI during debugging.
*   **AI Explanations:** Request explanations for source code, execution results, review/debug outputs, or general error messages.
*   **Gemini Customization:** Adjust the model, temperature, top P, top K, and safety settings.
*   **API Key Management:** Use the API Key from the backend's `.env` file or input one directly in the UI.
*   **Intuitive Interface:** Displays the conversation as interactive blocks, including output, errors, action buttons, and code highlighting.
*   **Conversation Management:** Collapse/expand old conversation rounds for better tracking.

## Prerequisites

Before installing, ensure you have the following software installed on your computer:

1.  **Python 3:** Version 3.8 or higher is recommended. Make sure `python` or `python3` and `pip` are added to your system's PATH environment variable.
    *   Download Python: [https://www.python.org/downloads/](https://www.python.org/downloads/)
    *   *Note for Windows installation:* Check the "Add Python to PATH" box during installation.
2.  **Node.js and npm:** The LTS (Long Term Support) version is recommended. `npm` usually comes bundled with Node.js.
    *   Download Node.js: [https://nodejs.org/](https://nodejs.org/)
3.  **Git:** To clone the source code from GitHub.
    *   Download Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)

## Installation

1.  **Clone the Repository:** Open your terminal (Command Prompt, PowerShell, Terminal) and run the following command:
    ```bash
    git clone https://github.com/your-username/gemini-ui-executor.git
    cd gemini-ui-executor
    ```
    *(Replace `your-username` with your GitHub username if you forked the repository).*

2.  **Get API Key:**
    *   **Get your Gemini API key at:** [https://ai.google.dev/gemini-api/docs/api-key](https://ai.google.dev/gemini-api/docs/api-key)
    *   You can configure this key in the `.env` file in the root directory or enter it directly in the Settings (⚙️) within the application UI. The `.gitignore` file is already configured to ignore the `.env` file. **DO NOT share your API Key.**

3.  **Run the Setup Script:**
    *   **On Linux or macOS:**
        *   Open a terminal, navigate to the `linux-macos` directory: `cd linux-macos`
        *   Make the script executable: `chmod +x setup.sh`
        *   Run the setup script: `./setup.sh`
    *   **On Windows:**
        *   Open Command Prompt or PowerShell **as Administrator** (Right-click -> Run as administrator).
        *   Navigate to the `windows` directory: `cd windows`
        *   Run the setup script: `setup.bat`

    *The setup script will automatically:*
    *   Create a Python virtual environment (`venv`) for the backend.
    *   Activate the virtual environment and install necessary Python libraries from `backend/requirements.txt`.
    *   Install necessary Node.js libraries for the frontend from `frontend/package.json` using `npm install`.
    *   *Be patient, this process might take a few minutes.* Watch the terminal output for any errors.

## Running the Application

After successful installation:

1.  **Run the Run Script:**
    *   **On Linux or macOS:**
        *   Open a terminal, navigate to the `linux-macos` directory: `cd linux-macos`
        *   Make the script executable: `chmod +x run.sh`
        *   Run the start script: `./run.sh`
    *   **On Windows:**
        *   Open Command Prompt or PowerShell. Administrator rights are **not** needed for this step.
        *   Navigate to the `windows` directory: `cd windows`
        *   Run the start script: `run.bat`

    *The run script will automatically open **TWO** new terminal/command prompt windows:*
    *   One window running the **Backend Server** (Flask on port 5001).
    *   One window running the **Frontend Dev Server** (Vite on port 5173).

2.  **Access the Web UI:** Open your web browser and go to:
    [http://localhost:5173](http://localhost:5173)

3.  **To Stop the Application:** Close both terminal/command prompt windows that were opened by the `run` script.

## Usage Guide

1.  **Enter Request:** Type your request into the input box. Press `Ctrl + Enter` or click the Send button. Example prompts:
    *   "create a text file named 'hello.txt' in Downloads/ containing 'Hello world'"
    *   "What is my computer's IP address?"
    *   "Show google pid"
    *   "Open youtube"
2.  **Select Target (in Sidebar):** Open the Sidebar (gear icon ⚙️) to select:
    *   **Target OS:** Where the code should run (Windows, Linux, macOS, or Auto).
    *   **Executable File Type:** The type of file you want the AI to generate (.py, .sh, .bat, .ps1, or enter a custom name/extension).
3.  **Generate Code:** Click Send. The AI will generate code and display it in a new block.
4.  **Interact with Code:**
    *   **Copy/Download:** Use the icons on the code block.
    *   **Review:** Click the "Review" button to have the AI analyze the code. The review will appear below.
    *   **Execute:** Click the "Execute" button. The output (stdout) and errors (stderr) will be shown in a new block. *Be extremely careful with this feature!*
    *   **Debug:** If the "Execute" block shows an error, a "Debug" button will appear. Click it to have the AI analyze and suggest fixes.
    *   **Install Package:** If the "Debug" block suggests installing a Python package, an "Install" button will appear.
    *   **Apply Corrected Code:** If the "Debug" block provides corrected code, click "Use This Code" to create a new code block with the fixed version.
    *   **Explain:** Click the "Explain" button on any block (code, execution result, review, debug, error) to ask the AI for clarification.
5.  **Settings (Sidebar):**
    *   **Model & Parameters:** Choose the Gemini model, adjust Temperature, Top P, Top K. Click the Save icon (💾) to save the model choice.
    *   **API Key:** Enter an API Key and click "Use This Key" to override the key from `.env` (if present). Click "Use .env Key" to revert to the default key from `.env`.
    *   **Other Settings:** Select the safety filtering level and toggle the "Run as Admin/Root" option (⚠️ Caution!).

## Folder Structure
```
gemini-ui-executor/
├── .env                  # Contains your API Key 
├── .gitignore            # Files/folders ignored by Git
├── backend/              # Flask Python server source code
│   ├── app.py            # Main Flask file
│   ├── requirements.txt  # Python dependencies to install
│   └── venv/             # Python virtual environment (created by setup)
├── frontend/             # React Vite UI source code
│   ├── .gitignore        # Frontend-specific gitignore
│   ├── index.html        # Root HTML file
│   ├── package.json      # Frontend info and dependencies
│   ├── package-lock.json # Locks dependency versions
│   ├── vite.config.ts    # Vite configuration
│   ├── tsconfig.json     # TypeScript configuration
│   ├── ... (other config files)
│   ├── public/           # Static assets (icons, images)
│   └── src/              # React/TypeScript source
│       ├── App.tsx       # Main application component
│       ├── main.tsx      # App entry point
│       ├── components/   # UI components (Sidebar, CenterArea, ...)
│       ├── assets/       # Assets used in source
│       └── *.css         # CSS files
├── linux-macos/          # Scripts for Linux and macOS
│   ├── run.sh            # Script to run the application
│   └── setup.sh          # Script to install dependencies
├── users.txt             # (Appears unused)
├── windows/              # Scripts for Windows
│   ├── run.bat           # Script to run the application
│   └── setup.bat         # Script to install dependencies
└── README.md             # This file
```

</details>

<!-- Japanese -->
<details>
<summary>🇯🇵 日本語</summary>

## Gemini UI Executor - UIインターフェース - AIコード生成＆実行 ᓚᘏᗢ

## 概要

Gemini UI Executorは、Google Geminiと対話するためのWebベースのユーザーインターフェース（UI）です。以下のことが可能です。

1.  **コード生成:** 自然言語によるリクエストに基づいてコード（Python、Shell、Batch、PowerShellなど）を生成します。
2.  **コード実行:** 生成されたコードをバックエンドサーバー（あなたのマシン）で直接実行します。
3.  **レビュー＆デバッグ:** AIにコードの安全性/効率性をレビューさせたり、実行に失敗した場合のデバッグを依頼したりします。
4.  **説明:** コードの一部、実行結果、エラーメッセージについてAIに説明を求めます。

このツールは、AIのコード生成能力を実験し、グラフィカルインターフェースを通じて簡単なタスクを迅速に実行するために設計されています。

**インターフェースの構成:**

*   **バックエンド:** ロジック処理、Gemini APIとの通信、コード実行を行うFlask（Python）サーバー。
*   **フロントエンド:** ブラウザでユーザーインターフェースを提供するReact（Vite）アプリケーション。

**非常に重要な警告 - よくお読みください:**

*   ⚠️ **セキュリティリスク:** このツールはAIにコードを生成させ、**あなたのコンピュータ上で直接実行する**ことを可能にします。AIが生成したコードは**安全でない可能性**があり、バグを含んでいたり、**ファイルの削除、システム設定の変更、悪意のあるソフトウェアのインストール**など、予期しない動作を引き起こす可能性があります。
*   🛑 **細心の注意を払って使用:** コードが何をするかを**完全に理解**し、すべてのリスクを受け入れる場合にのみコードを実行してください。不確かなリクエストやコードは**絶対に実行しないでください**。常に「実行」(Execute)の前に「レビュー」(Review)機能を使用してください。
*   🔑 **APIキーのセキュリティ:** `.env`ファイルやAPIキーを誰とも共有しないでください。APIキーが悪用され、費用が発生する可能性があります。
*   💰 **APIコスト:** Google Gemini APIの使用には費用が発生する場合があります。Google Cloudの料金表を確認してください。
*   🚫 **免責事項:** このツールの作成者は、このツールの使用によって生じたいかなる損害、データ損失、セキュリティインシデントについても**責任を負いません**。**使用は完全に自己責任**です。
*   **目的:** このツールは主に実験、学習、簡単な個人的な自動化タスクを目的としています。本番環境や重要/機密性の高いタスクの処理には**意図されていません**。

## 機能

*   **クロスプラットフォームコード生成:** Windows（.bat、.ps1）、Linux/macOS（.sh）、Python（.py）、またはその他のカスタムファイルタイプ用のコードをAIに生成させます。
*   **直接実行:** バックエンドで生成されたコードを「管理者/ルートとして実行」オプション付きで実行します（バックエンドに対応する権限が必要です）。
*   **AIコードレビュー:** コードの安全性、正確性に関するフィードバック、改善提案を取得します。
*   **インテリジェントデバッグ:** コード実行が失敗した場合、AIはエラー（stderr）、出力（stdout）、ソースコードを分析して、修正またはトラブルシューティング手順（Pythonの場合は`pip install`の提案を含む）を提案します。
*   **パッケージインストール:** デバッグ中にAIによって提案されたPythonパッケージを自動的にインストールします。
*   **AIによる説明:** ソースコード、実行結果、レビュー/デバッグ出力、または一般的なエラーメッセージの説明をリクエストします。
*   **Geminiのカスタマイズ:** モデル、temperature、top P、top K、および安全性設定を調整します。
*   **APIキー管理:** バックエンドの`.env`ファイルからAPIキーを使用するか、UIで直接入力します。
*   **直感的なインターフェース:** 出力、エラー、アクションボタン、コードハイライトを含む対話型ブロックとして会話を表示します。
*   **会話管理:** 古い会話ラウンドを折りたたんだり展開したりして、追跡を容易にします。

## 前提条件

インストールする前に、お使いのコンピュータに以下のソフトウェアがインストールされていることを確認してください。

1.  **Python 3:** バージョン3.8以上を推奨します。`python`または`python3`および`pip`がシステムのPATH環境変数に追加されていることを確認してください。
    *   Pythonのダウンロード: [https://www.python.org/downloads/](https://www.python.org/downloads/)
    *   *Windowsインストール時の注意:* インストール中に「Add Python to PATH」チェックボックスをオンにしてください。
2.  **Node.jsとnpm:** LTS（長期サポート）バージョンを推奨します。`npm`は通常Node.jsにバンドルされています。
    *   Node.jsのダウンロード: [https://nodejs.org/](https://nodejs.org/)
3.  **Git:** GitHubからソースコードをクローンするために必要です。
    *   Gitのダウンロード: [https://git-scm.com/downloads](https://git-scm.com/downloads)

## インストール

1.  **リポジトリのクローン:** ターミナル（コマンドプロンプト、PowerShell、ターミナル）を開き、以下のコマンドを実行します。
    ```bash
    git clone https://github.com/your-username/gemini-ui-executor.git
    cd gemini-ui-executor
    ```
    *(リポジトリをフォークした場合は、`your-username`をあなたのGitHubユーザー名に置き換えてください)*

2.  **APIキーの取得:**
    *   **Gemini APIキーをここで取得:** [https://ai.google.dev/gemini-api/docs/api-key](https://ai.google.dev/gemini-api/docs/api-key)
    *   このキーは、ルートディレクトリの`.env`ファイルで設定するか、アプリケーションUIの設定（⚙️）で直接入力できます。`.gitignore`ファイルは`.env`ファイルを無視するように設定済みです。**APIキーを共有しないでください。**

3.  **セットアップスクリプトの実行:**
    *   **LinuxまたはmacOSの場合:**
        *   ターミナルを開き、`linux-macos` ディレクトリに移動します: `cd linux-macos`
        *   スクリプトに実行権限を付与します: `chmod +x setup.sh`
        *   セットアップスクリプトを実行します: `./setup.sh`
    *   **Windowsの場合:**
        *   コマンドプロンプトまたはPowerShellを**管理者として**開きます（右クリック -> 管理者として実行）。
        *   `windows` ディレクトリに移動します: `cd windows`
        *   セットアップスクリプトを実行します: `setup.bat`

    *セットアップスクリプトは自動的に以下を実行します:*
    *   バックエンド用のPython仮想環境（`venv`）を作成します。
    *   仮想環境をアクティベートし、`backend/requirements.txt` から必要なPythonライブラリをインストールします。
    *   `npm install` を使用して、`frontend/package.json` からフロントエンドに必要なNode.jsライブラリをインストールします。
    *   *しばらくお待ちください。このプロセスには数分かかる場合があります。* エラーが発生した場合は、ターミナルの出力を確認してください。

## アプリケーションの実行

インストールが成功した後:

1.  **実行スクリプトの実行:**
    *   **LinuxまたはmacOSの場合:**
        *   ターミナルを開き、`linux-macos` ディレクトリに移動します: `cd linux-macos`
        *   スクリプトに実行権限を付与します: `chmod +x run.sh`
        *   開始スクリプトを実行します: `./run.sh`
    *   **Windowsの場合:**
        *   コマンドプロンプトまたはPowerShellを開きます。このステップでは管理者権限は**不要**です。
        *   `windows` ディレクトリに移動します: `cd windows`
        *   開始スクリプトを実行します: `run.bat`

    *実行スクリプトは自動的に**2つ**の新しいターミナル/コマンドプロンプトウィンドウを開きます:*
    *   **バックエンドサーバー**（ポート5001でFlask）を実行するウィンドウ。
    *   **フロントエンド開発サーバー**（ポート5173でVite）を実行するウィンドウ。

2.  **Web UIへのアクセス:** Webブラウザを開き、以下のアドレスにアクセスします:
    [http://localhost:5173](http://localhost:5173)

3.  **アプリケーションの停止:** `run` スクリプトによって開かれた両方のターミナル/コマンドプロンプトウィンドウを閉じます。

## 使用ガイド

1.  **リクエスト入力:** 入力ボックスにリクエストを入力します。`Ctrl + Enter` を押すか、送信ボタンをクリックします。プロンプト例:
    *   「Download/フォルダに 'hello.txt' という名前のテキストファイルを作成し、内容は 'こんにちは世界' にしてください」
    *   「私のコンピュータのIPアドレスは何ですか？」
    *   「googleのpidを表示」
    *   「youtubeを開く」
2.  **ターゲット選択（サイドバー内）:** サイドバー（歯車アイコン ⚙️）を開いて以下を選択します:
    *   **ターゲットOS:** コードを実行する場所（Windows、Linux、macOS、または自動）。
    *   **実行ファイルタイプ:** AIに生成させたいファイルの種類（.py、.sh、.bat、.ps1、またはカスタム名/拡張子を入力）。
3.  **コード生成:** 送信ボタンをクリックします。AIがコードを生成し、新しいブロックに表示します。
4.  **コードとの対話:**
    *   **コピー/ダウンロード:** コードブロック上のアイコンを使用します。
    *   **レビュー:** 「レビュー」ボタンをクリックしてAIにコードを分析させます。レビュー結果が下に表示されます。
    *   **実行:** 「実行」ボタンをクリックします。出力（stdout）とエラー（stderr）が新しいブロックに表示されます。 *この機能には細心の注意を払ってください！*
    *   **デバッグ:** 「実行」ブロックでエラーが表示された場合、「デバッグ」ボタンが表示されます。クリックするとAIが分析し、修正を提案します。
    *   **パッケージインストール:** 「デバッグ」ブロックがPythonパッケージのインストールを提案した場合、「インストール」ボタンが表示されます。
    *   **修正コード適用:** 「デバッグ」ブロックが修正済みコードを提供した場合、「このコードを使用」をクリックして修正版で新しいコードブロックを作成します。
    *   **説明:** 任意のブロック（コード、実行結果、レビュー、デバッグ、エラー）の「説明」ボタンをクリックして、AIに内容の明確化を依頼します。
5.  **設定（サイドバー）:**
    *   **モデル＆パラメータ:** Geminiモデルを選択し、Temperature、Top P、Top Kを調整します。保存アイコン（💾）をクリックしてモデルの選択を保存します。
    *   **APIキー:** APIキーを入力し、「このキーを使用」をクリックして`.env`（存在する場合）のキーを上書きします。「.envキーを使用」をクリックして`.env`のデフォルトキーに戻します。
    *   **その他の設定:** 安全性フィルタリングレベルを選択し、「管理者/ルートとして実行」オプションを切り替えます（⚠️注意！）。

## フォルダ構造
```
gemini-ui-executor/
├── .env                  # APIキーを格納
├── .gitignore            # Gitで無視されるファイル/フォルダ
├── backend/              # Flask Pythonサーバーのソースコード
│   ├── app.py            # メインFlaskファイル
│   ├── requirements.txt  # インストールするPython依存関係
│   └── venv/             # Python仮想環境（セットアップで作成）
├── frontend/             # React Vite UIのソースコード
│   ├── .gitignore        # フロントエンド固有のgitignore
│   ├── index.html        # ルートHTMLファイル
│   ├── package.json      # フロントエンド情報と依存関係
│   ├── package-lock.json # 依存関係のバージョンをロック
│   ├── vite.config.ts    # Vite設定
│   ├── tsconfig.json     # TypeScript設定
│   ├── ... (その他の設定ファイル)
│   ├── public/           # 静的アセット（アイコン、画像）
│   └── src/              # React/TypeScriptソース
│       ├── App.tsx       # メインアプリケーションコンポーネント
│       ├── main.tsx      # アプリのエントリーポイント
│       ├── components/   # UIコンポーネント（Sidebar, CenterArea, ...）
│       ├── assets/       # ソースで使用されるアセット
│       └── *.css         # CSSファイル
├── linux-macos/          # LinuxおよびmacOS用スクリプト
│   ├── run.sh            # アプリケーション実行用スクリプト
│   └── setup.sh          # 依存関係インストール用スクリプト
├── users.txt             # (未使用のようです)
├── windows/              # Windows用スクリプト
│   ├── run.bat           # アプリケーション実行用スクリプト
│   └── setup.bat         # 依存関係インストール用スクリプト
└── README.md             # このファイル
```

</details>

## Image: 

![image](https://github.com/user-attachments/assets/c025d77e-0913-46a9-a5f7-cd6d5e739262)

