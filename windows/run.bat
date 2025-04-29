@echo off
REM chcp 65001 > nul

echo ==========================================================
echo                Khoi Dong Ung Dung - Windows
echo ==========================================================
echo.
echo Script nay se mo HAI cua so dong lenh moi:
echo   1. Backend Server (Python/Flask).
echo   2. Frontend Dev Server (Node/Vite).
echo.
echo DAM BAO ban da chay 'setup.bat' thanh cong truoc do.
echo.
pause
echo.

REM --- Chuyen ve thu muc goc DUY NHAT MOT LAN ---
echo [*] Dang chuyen ve thu muc goc cua du an...
cd /d "%~dp0.." || (
    echo [LOI] Khong the chuyen ve thu muc goc tu "%~dp0..".
    pause
    exit /b 1
)
echo [INFO] Hien dang o thu muc goc: "%cd%"
echo.

REM --- Khoi dong Backend Server ---
echo [+] Dang khoi dong Backend Server trong cua so moi...
REM --- Lenh don gian: Kich hoat venv VA chay Python ---
start "Backend Server (AI Executor)" cmd /k "backend\venv\Scripts\activate.bat && python backend/app.py"
if %errorlevel% neq 0 (
    echo [LOI] Co loi khi co gang khoi dong cua so Backend Server.
    goto :loi_thoat
)
echo [INFO] Da gui lenh mo cua so Backend Server.
echo.
timeout /t 1 /nobreak > nul


REM --- Khoi dong Frontend Server ---
echo [+] Dang khoi dong Frontend Dev Server trong cua so moi...
REM --- Lenh don gian: Vao 'frontend' VA chay npm ---
start "Frontend Server (AI Executor)" cmd /k "cd frontend && npm run dev"
if %errorlevel% neq 0 (
    echo [LOI] Co loi khi co gang khoi dong cua so Frontend Server.
    goto :loi_thoat
)
echo [INFO] Da gui lenh mo cua so Frontend Server.
echo.

echo ==========================================================
echo     Da gui lenh khoi dong cho ca Backend va Frontend.
echo     Hay kiem tra hai cua so dong lenh moi co tieu de
echo     "Backend Server (AI Executor)" va
echo     "Frontend Server (AI Executor)".
echo     Chung se tu dong chay cac lenh can thiet.
echo ==========================================================
echo.
goto :ket_thuc

:loi_thoat
echo.
echo [!!!] Khoi dong that bai do co loi. Vui long xem lai cac thong bao o tren.
echo.

:ket_thuc
pause