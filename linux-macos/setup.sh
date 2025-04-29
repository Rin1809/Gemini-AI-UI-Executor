#!/bin/bash

echo "=========================================================="
echo "      Tự động Cài đặt (Backend & Frontend) - Linux/macOS"
echo "=========================================================="
echo
echo "Script này sẽ thực hiện các bước cài đặt cần thiết cho cả"
echo "backend (Python) và frontend (Node.js) của dự án."
echo
echo "YÊU CẦU:"
echo "  - Python 3 (python3) đã được cài đặt và có trong PATH."
echo "  - pip (đi kèm Python 3) đã được cài đặt."
echo "  - Node.js và npm đã được cài đặt và có trong PATH."
echo
echo "**Quan trọng:** Script này phải được chạy từ thư mục 'linux-macos'."
echo "Nó sẽ tự động điều hướng về thư mục gốc của dự án."
echo
read -p "Nhấn Enter để bắt đầu..."
echo

# --- Điều hướng về thư mục gốc của dự án ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "[*] Đang chuyển về thư mục gốc của dự án: $PROJECT_ROOT"
cd "$PROJECT_ROOT" || { echo "[LỖI] Không thể chuyển về thư mục gốc '$PROJECT_ROOT'."; exit 1; }
echo "[INFO] Đang ở thư mục gốc: $(pwd)"
echo

# === Thiết lập Backend ===
echo "[+] Đang chuẩn bị thiết lập Backend..."
if [ ! -d "backend" ]; then
    echo "[LỖI] Không tìm thấy thư mục 'backend' ở thư mục gốc."
    exit 1
fi

echo "[INFO] Đang kiểm tra Python 3..."
if ! command -v python3 &> /dev/null; then
    echo "[LỖI] Không tìm thấy lệnh 'python3' trong PATH. Vui lòng cài đặt Python 3."
    exit 1
fi
echo "[INFO] Đã tìm thấy Python 3."

# Tạo môi trường ảo trong thư mục backend
VENV_PATH="backend/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "[INFO] Đang tạo môi trường ảo Python trong '$VENV_PATH'..."
    python3 -m venv "$VENV_PATH" || { echo "[LỖI] Không thể tạo môi trường ảo Python."; exit 1; }
    echo "[INFO] Đã tạo môi trường ảo thành công."
else
    echo "[INFO] Môi trường ảo '$VENV_PATH' đã tồn tại. Bỏ qua bước tạo."
fi
echo
read -p "[*] Nhấn Enter để kích hoạt môi trường ảo và cài đặt thư viện Python..."
echo

# Kích hoạt venv và cài đặt pip
echo "[INFO] Đang kích hoạt môi trường ảo và cài đặt các gói từ backend/requirements.txt..."
source "$VENV_PATH/bin/activate" || { echo "[LỖI] Không thể kích hoạt môi trường ảo '$VENV_PATH/bin/activate'."; exit 1; }

echo "[INFO] Đang cài đặt thư viện Python (có thể mất vài phút)..."
pip install -r backend/requirements.txt
PIP_EXIT_CODE=$?
if [ $PIP_EXIT_CODE -ne 0 ]; then
    echo "[LỖI] Lỗi khi cài đặt các gói Python từ backend/requirements.txt (Mã lỗi: $PIP_EXIT_CODE)."
    echo "     Kiểm tra kết nối mạng, file requirements.txt và output lỗi ở trên."
    deactivate # Cố gắng hủy kích hoạt trước khi thoát
    exit 1
fi
echo "[INFO] Đã cài đặt xong các gói Python."
deactivate
echo "[INFO] Đã hủy kích hoạt môi trường ảo."

echo "[+] Thiết lập Backend hoàn tất."
echo
read -p "[*] Nhấn Enter để bắt đầu thiết lập Frontend..."
echo

# === Thiết lập Frontend ===
echo "[+] Đang chuẩn bị thiết lập Frontend..."
if [ ! -d "frontend" ]; then
    echo "[LỖI] Không tìm thấy thư mục 'frontend' ở thư mục gốc."
    exit 1
fi

echo "[INFO] Đang kiểm tra npm (Node.js)..."
if ! command -v npm &> /dev/null; then
    echo "[LỖI] Không tìm thấy lệnh 'npm' trong PATH. Vui lòng cài đặt Node.js (bao gồm npm)."
    exit 1
fi
echo "[INFO] Đã tìm thấy npm."
echo
read -p "[*] Nhấn Enter để cài đặt các gói Node.js (npm install). Bước này có thể mất vài phút..."
echo

echo "[INFO] Đang chạy \"npm install\" trong thư mục 'frontend'..."
npm install --prefix frontend
NPM_EXIT_CODE=$?

echo
echo "[DEBUG] Lệnh \"npm install --prefix frontend\" ĐÃ CHẠY XONG."
echo "       Kiểm tra xem có thông báo lỗi/cảnh báo nào ở trên không."
echo "       Mã lỗi trả về (0 là thành công): $NPM_EXIT_CODE"
echo
read -p "[*] Nhấn Enter để tiếp tục kiểm tra kết quả..."
echo

if [ $NPM_EXIT_CODE -ne 0 ]; then
    echo
    echo "[CẢNH BÁO/LỖI] \"npm install\" kết thúc với mã lỗi $NPM_EXIT_CODE."
    echo "[CẢNH BÁO/LỖI] Mã lỗi khác 0 có thể do lỗi thực sự HOẶC chỉ là cảnh báo (ví dụ: vulnerabilities)."
    echo "[CẢNH BÁO/LỖI] Vui lòng xem kỹ output ở trên. Nếu chỉ là cảnh báo (WARN), bạn có thể bỏ qua."
    echo "[CẢNH BÁO/LỖI] Nếu có lỗi (ERR!), hãy thử chạy lại lệnh sau thủ công trong terminal tại thư mục gốc dự án:"
    echo "                (cd frontend && npm install)"
    echo
    read -p "[*] Nhấn Enter để tiếp tục (hoặc Ctrl+C để thoát nếu lỗi nghiêm trọng)..."
fi

echo "[+] Thiết lập Frontend hoàn tất."
echo

echo "=========================================================="
echo "                  CÀI ĐẶT HOÀN TẤT!"
echo "=========================================================="
echo
echo "Để chạy ứng dụng, hãy sử dụng file 'run.sh' trong thư mục 'linux-macos'."
echo
exit 0