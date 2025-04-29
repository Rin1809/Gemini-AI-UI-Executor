@echo off
echo ==========================================================
echo                Khoi Dong Ung Dung ᓚᘏᗢ
echo ==========================================================
echo.
echo Kich ban nay se mo HAI cua so lenh moi:
echo   1. Mot cua so de chay Backend Server (Python/Flask).
echo   2. Mot cua so de chay Frontend Dev Server (Node/Vite).
echo.
echo DAM BAO da chay 'setup.bat' thanh cong truoc do.
pause.
echo.
echo.


REM --- Khoi dong Backend Server ---
echo [+] Dang khoi dong Backend Server trong cua so moi...
REM Dau tien chuyen ve thu muc goc cua script, sau do kich hoat venv va chay python
start "Backend Server" cmd /k "echo Dang chuyen ve thu muc du an... && cd /d "%~dp0" && echo Dang kich hoat venv Backend... && backend\venv\Scripts\activate.bat && echo Dang chay Backend Server... && python backend/app.py"
if %errorlevel% neq 0 (
    echo [LOI] Co loi khi co gang khoi dong Backend Server. Kiem tra cua so 'Backend Server'.
    goto :loi_thoat
)
echo [INFO] Cua so Backend Server da duoc mo (hoac dang mo).
echo.
REM Cho mot chut de cua so backend kip xuat hien (tuy chon)
timeout /t 2 /nobreak > nul


REM --- Khoi dong Frontend Server ---
echo [+] Dang khoi dong Frontend Dev Server trong cua so moi...
REM Dau tien chuyen ve thu muc goc cua script, sau do vao frontend va chay npm
start "Frontend Server" cmd /k "echo Dang chuyen ve thu muc du an... && cd /d "%~dp0" && echo Dang di chuyen toi thu muc Frontend... && cd frontend && echo Dang chay Frontend Server (npm run dev)... && npm run dev"
if %errorlevel% neq 0 (
    echo [LOI] Co loi khi co gang khoi dong Frontend Server. Kiem tra cua so 'Frontend Server'.
    goto :loi_thoat
)
echo [INFO] Cua so Frontend Server da duoc mo (hoac dang mo).
echo.

echo ==========================================================
echo     Da gui lenh khoi dong cho ca Backend va Frontend.
echo     Hay kiem tra hai cua so lenh moi de xem trang thai.
echo ==========================================================
echo.
goto :ket_thuc

:loi_thoat
echo.
echo [!!!] Khoi dong that bai do co loi. Vui long xem lai cac thong bao o tren.
echo.

:ket_thuc
pause