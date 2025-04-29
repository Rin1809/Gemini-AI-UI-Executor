@echo off
REM chcp 65001 > nul REM Khong can thiet neu khong co dau

echo ==========================================================
echo       Tu dong Cai dat (Backend & Frontend) - Windows
echo ==========================================================
echo.
echo Script nay se thuc hien cac buoc cai dat can thiet cho ca
echo backend (Python) va frontend (Node.js) cua du an.
echo.
echo YEU CAU:
echo   - Python 3 da duoc cai dat va them vao bien moi truong PATH.
echo   - Node.js va npm da duoc cai dat va them vao bien moi truong PATH.
echo.
echo Script se dung lai (pause) sau cac buoc quan trong de ban
echo co the kiem tra ket qua.
echo.
echo **Quan trong:** Script nay phai duoc chay tu thu muc 'windows'.
echo No se tu dong dieu huong ve thu muc goc cua du an.
echo.
pause
echo.

REM --- Dieu huong ve thu muc goc cua du an ---
echo [*] Dang chuyen ve thu muc goc cua du an...
cd /d "%~dp0.." || (
    echo [LOI] Khong the chuyen ve thu muc goc tu "%~dp0..".
    pause
    exit /b 1
)
echo [INFO] Dang o thu muc goc: "%cd%"
echo.

REM === Thiet lap Backend ===
echo [+] Dang chuan bi thiet lap Backend...
if not exist backend (
    echo [LOI] Khong tim thay thu muc 'backend' o thu muc goc.
    goto :loi_thoat_co_pause
)

echo [INFO] Dang kiem tra Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay 'python' trong PATH. Vui long cai dat Python 3 va dam bao no nam trong PATH.
    goto :loi_thoat_co_pause
)
echo [INFO] Da tim thay Python.

REM Tao moi truong ao trong thu muc backend
if not exist backend\venv (
    echo [INFO] Dang tao moi truong ao Python trong 'backend\venv'...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [LOI] Khong the tao moi truong ao Python. Kiem tra cai dat Python hoac quyen ghi file.
        goto :loi_thoat_co_pause
    )
    echo [INFO] Da tao moi truong ao thanh cong.
) else (
    echo [INFO] Moi truong ao 'backend\venv' da ton tai. Bo qua buoc tao.
)
echo.
echo [*] Nhan phim bat ky de kich hoat moi truong ao va cai dat thu vien Python...
pause
echo.

REM Kich hoat venv va cai dat pip
echo [INFO] Dang kich hoat moi truong ao va cai dat cac goi tu backend\requirements.txt...
call backend\venv\Scripts\activate.bat || (
    echo [LOI] Khong the kich hoat moi truong ao 'backend\venv\Scripts\activate.bat'.
    goto :loi_thoat_co_pause
)

REM Di chuyen tam vao backend de pip khong bao loi khong tim thay requirements.txt o hien tai
cd backend || ( echo [LOI] Khong the vao thu muc backend tam thoi. && goto :loi_thoat_co_pause )

echo [INFO] Dang cai dat thu vien Python (co the mat vai phut)...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [LOI] Loi khi cai dat cac goi Python tu requirements.txt.
    echo      Kiem tra ket noi mang, file requirements.txt va output loi o tren.
    cd ..
    goto :loi_thoat_co_pause
)
echo [INFO] Da cai dat xong cac goi Python.
cd .. || ( echo [LOI] Khong the thoat khoi thu muc backend tam thoi. && goto :loi_thoat_co_pause )

echo [+] Thiet lap Backend hoan tat.
echo.
echo [*] Nhan phim bat ky de bat dau thiet lap Frontend...
pause
echo.

REM === Thiet lap Frontend ===
echo [+] Dang chuan bi thiet lap Frontend...
if not exist frontend (
    echo [LOI] Khong tim thay thu muc 'frontend' o thu muc goc.
    goto :loi_thoat_co_pause
)

echo [INFO] Dang kiem tra npm (Node.js)...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay 'npm' trong PATH. Vui long cai dat Node.js (bao gom npm) va dam bao no nam trong PATH.
    goto :loi_thoat_co_pause
)
echo [INFO] Da tim thay npm.
echo.
echo [*] Nhan phim bat ky de cai dat cac goi Node.js (npm install).
echo     Output va loi (neu co) se duoc ghi vao file 'npm_install_log.txt'
echo     trong thu muc goc du an (%cd%).
echo     Buoc nay co the mat vai phut...
pause
echo.

echo [INFO] Dang chay "npm install" trong thu muc 'frontend'...
REM Chay npm install va GHI LOG vao file npm_install_log.txt o thu muc GOC (.)
npm install --prefix frontend > npm_install_log.txt 2>&1
set NPM_ERRORLEVEL=%errorlevel% REM Luu lai ma loi

REM *** LUON LUON PAUSE DE XEM LOG HOAC KET QUA ***
echo.
echo [DEBUG] Lenh "npm install --prefix frontend" DA THUC THI XONG.
echo        Ma loi tra ve: %NPM_ERRORLEVEL% (0 la thanh cong).
echo        Vui long kiem tra file 'npm_install_log.txt' trong thu muc goc (%cd%)
echo        de xem chi tiet output va loi (neu co).
echo.
echo [*] Nhan phim bat ky de tiep tuc kiem tra ma loi...
pause
echo.

REM *** KIEM TRA LOI SAU KHI DA PAUSE ***
if %NPM_ERRORLEVEL% neq 0 (
    echo.
    echo [CANH BAO/LOI] "npm install" ket thuc voi ma loi %NPM_ERRORLEVEL%.
    echo [CANH BAO/LOI] Ma loi khac 0 co the do loi thuc su HOAC chi la canh bao (vi du: vulnerabilities).
    echo [CANH BAO/LOI] Vui long xem ky file 'npm_install_log.txt'.
    echo [CANH BAO/LOI] Neu chi la canh bao (WARN), ban co the bo qua.
    echo [CANH BAO/LOI] Neu co loi (ERR!), hay thu chay lai lenh sau thu cong trong CMD tai thu muc goc du an:
    echo                 cd frontend ^&^& npm install
    echo.
    echo [*] Nhan phim bat ky de tiep tuc (hoac dong cua so neu loi nghiem trong)...
    pause
)

echo [+] Thiet lap Frontend hoan tat.
echo.

goto :ket_thuc_thanh_cong

:loi_thoat_co_pause
echo.
echo [!!!] Cai dat that bai hoac co loi nghiem trong. Cua so se dung lai de ban xem loi.
echo.
pause
exit /b 1

:ket_thuc_thanh_cong
echo ==========================================================
echo                  CAI DAT HOAN TAT!
echo ==========================================================
echo.
echo De chay ung dung, hay su dung file 'run.bat' trong thu muc 'windows'.
echo.
pause
exit /b 0