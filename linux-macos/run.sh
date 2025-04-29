#!/bin/bash

echo "=========================================================="
echo "              Khởi Động Ứng Dụng - Linux/macOS"
echo "=========================================================="
echo
echo "Script này sẽ khởi chạy Backend và Frontend."
echo "Backend (Python/Flask) sẽ chạy ở nền."
echo "Frontend (Node/Vite) sẽ chạy ở nền."
echo "Output của cả hai sẽ được hiển thị trong terminal này."
echo
echo "ĐẢM BẢO bạn đã chạy 'setup.sh' thành công trước đó."
echo
echo "**Quan trọng:** Script này phải được chạy từ thư mục 'linux-macos'."
echo "Nó sẽ tự động điều hướng về thư mục gốc để chạy các lệnh."
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

# --- Hàm dọn dẹp khi thoát (Ctrl+C) ---
cleanup() {
    echo # Xuống dòng cho sạch
    echo "[INFO] Nhận được tín hiệu dừng. Đang dừng các tiến trình con..."
    # Kiểm tra xem PID có tồn tại không trước khi kill
    if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null; then
        echo "[INFO] Đang dừng Backend Server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null; then
        echo "[INFO] Đang dừng Frontend Server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    echo "[INFO] Dọn dẹp hoàn tất."
    exit 0
}

# Đặt bẫy để gọi hàm cleanup khi nhận tín hiệu INT (Ctrl+C) hoặc TERM
trap cleanup SIGINT SIGTERM

# --- Khởi động Backend Server ---
VENV_PATH="backend/venv"
if [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "[LỖI] Không tìm thấy file kích hoạt môi trường ảo: '$VENV_PATH/bin/activate'."
    echo "       Hãy chạy lại 'setup.sh'."
    exit 1
fi

echo "[+] Đang kích hoạt môi trường ảo Backend..."
source "$VENV_PATH/bin/activate" || { echo "[LỖI] Không thể kích hoạt môi trường ảo Backend."; exit 1; }

echo "[+] Đang khởi động Backend Server (python backend/app.py) ở nền..."
# Chạy python trong subshell để có thể deactivate ngay lập tức
(python backend/app.py &)
BACKEND_PID=$!
# Kiểm tra nhanh xem tiến trình có khởi động không
sleep 1 # Chờ 1 giây
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "[LỖI] Backend Server có vẻ đã không khởi động thành công."
    deactivate
    exit 1
fi
echo "[INFO] Backend Server đang chạy với PID: $BACKEND_PID"
deactivate # Hủy kích hoạt ngay sau khi chạy nền
echo "[INFO] Đã hủy kích hoạt môi trường ảo Backend."
echo

# --- Khởi động Frontend Server ---
if ! command -v npm &> /dev/null; then
    echo "[LỖI] Không tìm thấy lệnh 'npm'. Hãy chạy lại 'setup.sh'."
    # Cố gắng dừng backend nếu nó đã chạy
    if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null; then kill $BACKEND_PID; fi
    exit 1
fi

echo "[+] Đang khởi động Frontend Server (npm run dev --prefix frontend) ở nền..."
npm run dev --prefix frontend &
FRONTEND_PID=$!
# Kiểm tra nhanh
sleep 2 # Chờ lâu hơn chút cho Vite
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "[LỖI] Frontend Server có vẻ đã không khởi động thành công."
    # Cố gắng dừng backend nếu nó đã chạy
    if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null; then kill $BACKEND_PID; fi
    exit 1
fi
echo "[INFO] Frontend Server đang chạy với PID: $FRONTEND_PID"
echo

echo "=========================================================="
echo "    Backend và Frontend đang chạy ở chế độ nền."
echo "    - Backend PID: $BACKEND_PID"
echo "    - Frontend PID: $FRONTEND_PID"
echo "    Xem output trong terminal này."
echo "    Nhấn CTRL+C để dừng cả hai tiến trình."
echo "=========================================================="
echo

# Chờ đợi các tiến trình nền kết thúc (hoặc đến khi bị ngắt bởi Ctrl+C)
wait $BACKEND_PID $FRONTEND_PID # Chờ cụ thể 2 PID này