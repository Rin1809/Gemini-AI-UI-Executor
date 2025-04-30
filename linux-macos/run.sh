#!/bin/bash

echo "=========================================================="
echo "        Khởi Động Ứng Dụng (Terminal Riêng Biệt)"
echo "=========================================================="
echo
echo "Script này sẽ cố gắng mở HAI cửa sổ terminal mới:"
echo "  1. Một cửa sổ chạy Backend Server (Python/Flask)."
echo "  2. Một cửa sổ chạy Frontend Dev Server (Node/Vite)."
echo
echo "ĐẢM BẢO bạn đã chạy 'setup.sh' thành công trước đó."
echo "**Quan trọng:** Script này phải được chạy từ thư mục 'linux-macos'."
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

# --- Kiểm tra các file cần thiết ---
VENV_ACTIVATE="backend/venv/bin/activate"
BACKEND_SCRIPT="backend/app.py"
FRONTEND_DIR="frontend"

if [ ! -f "$VENV_ACTIVATE" ]; then
    echo "[LỖI] Không tìm thấy file kích hoạt môi trường ảo: '$VENV_ACTIVATE'."
    echo "       Hãy chạy lại 'setup.sh'."
    exit 1
fi

if [ ! -f "$BACKEND_SCRIPT" ]; then
    echo "[LỖI] Không tìm thấy file backend script: '$BACKEND_SCRIPT'."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "[LỖI] Không tìm thấy thư mục frontend: '$FRONTEND_DIR'."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[LỖI] Không tìm thấy lệnh 'npm'. Hãy chạy lại 'setup.sh'."
    exit 1
fi

# --- Định nghĩa các lệnh cần chạy ---
# Sử dụng 'exec bash' cuối cùng để giữ terminal mở sau khi lệnh chính kết thúc
CMD_BACKEND="echo '>>> Dang kich hoat venv & chay Backend...'; source \"$VENV_ACTIVATE\" && python \"$BACKEND_SCRIPT\"; echo '>>> Backend da dung hoac loi. Nhan Enter de dong cua so nay.'; read"
CMD_FRONTEND="echo '>>> Dang vao frontend & chay Frontend Dev Server...'; cd \"$FRONTEND_DIR\" && npm run dev; echo '>>> Frontend da dung hoac loi. Nhan Enter de dong cua so nay.'; read"

# --- Phát hiện hệ điều hành và trình giả lập terminal ---
TERM_CMD=""
OS_TYPE=$(uname)

if [ "$OS_TYPE" == "Darwin" ]; then
    # --- macOS ---
    echo "[INFO] Phat hien macOS. Su dung 'osascript' de mo Terminal.app..."
    osascript -e "tell app \"Terminal\" to do script \"cd \\\"$PROJECT_ROOT\\\" && $CMD_BACKEND\"" &> /dev/null
    sleep 1 # Cho terminal có thời gian mở
    osascript -e "tell app \"Terminal\" to do script \"cd \\\"$PROJECT_ROOT\\\" && $CMD_FRONTEND\"" &> /dev/null
    TERM_CMD="osascript" # Đánh dấu là đã tìm thấy cách chạy

elif [ "$OS_TYPE" == "Linux" ]; then
    # --- Linux ---
    if command -v gnome-terminal &> /dev/null; then
        echo "[INFO] Phat hien gnome-terminal..."
        gnome-terminal --working-directory="$PROJECT_ROOT" --title="Backend (AI Executor)" -- bash -c "$CMD_BACKEND"
        sleep 1
        gnome-terminal --working-directory="$PROJECT_ROOT" --title="Frontend (AI Executor)" -- bash -c "$CMD_FRONTEND"
        TERM_CMD="gnome-terminal"
    elif command -v konsole &> /dev/null; then
        echo "[INFO] Phat hien konsole..."
        konsole --workdir "$PROJECT_ROOT" --new-tab -p tabtitle="Backend (AI Executor)" -e bash -c "$CMD_BACKEND"
        sleep 1
        konsole --workdir "$PROJECT_ROOT" --new-tab -p tabtitle="Frontend (AI Executor)" -e bash -c "$CMD_FRONTEND"
        TERM_CMD="konsole"
    elif command -v xfce4-terminal &> /dev/null; then
        echo "[INFO] Phat hien xfce4-terminal..."
        xfce4-terminal --working-directory="$PROJECT_ROOT" --title="Backend (AI Executor)" --command="bash -c '$CMD_BACKEND'"
        sleep 1
        xfce4-terminal --working-directory="$PROJECT_ROOT" --title="Frontend (AI Executor)" --command="bash -c '$CMD_FRONTEND'"
        TERM_CMD="xfce4-terminal"
     elif command -v xterm &> /dev/null; then
        echo "[INFO] Phat hien xterm (co the can cau hinh font)..."
        xterm -T "Backend (AI Executor)" -e "cd \"$PROJECT_ROOT\" && bash -c \"$CMD_BACKEND\"" &
        sleep 1
        xterm -T "Frontend (AI Executor)" -e "cd \"$PROJECT_ROOT\" && bash -c \"$CMD_FRONTEND\"" &
        TERM_CMD="xterm"
    fi
else
    echo "[CẢNH BÁO] Không nhận diện được hệ điều hành là Linux hay macOS."
fi

# --- Kiểm tra và thông báo ---
if [ -z "$TERM_CMD" ] && [ "$OS_TYPE" == "Linux" ]; then
    echo "[LỖI] Khong tim thay trinh gia lap terminal pho bien (gnome-terminal, konsole, xfce4-terminal, xterm)."
    echo "       Vui long mo 2 cua so terminal thu cong:"
    echo "       1. Chay: cd \"$PROJECT_ROOT\" && source \"$VENV_ACTIVATE\" && python \"$BACKEND_SCRIPT\""
    echo "       2. Chay: cd \"$PROJECT_ROOT/$FRONTEND_DIR\" && npm run dev"
    exit 1
elif [ -n "$TERM_CMD" ]; then
    echo
    echo "[INFO] Da gui lenh mo 2 cua so terminal moi."
    echo "       Hay kiem tra cac cua so terminal do de xem trang thai cua Backend va Frontend."
    echo "       (Script 'run.sh' nay se ket thuc ngay bay gio)."
    echo
else
    echo "[INFO] Script da chay xong (khong phai Linux/macOS hoac khong co hanh dong cu the)."
fi

exit 0