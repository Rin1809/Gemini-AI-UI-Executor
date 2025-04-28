@echo off
echo ==========================================================
echo       Auto Setup ᓚᘏᗢ ^(Backend ^& Frontend^) 
echo ==========================================================
echo.
echo Kich ban nay se dung lai ^(pause^) sau cac buoc quan trong.
echo Neu cua so dong ngay lap tuc o buoc "npm install",
echo hay mo CMD, di chuyen toi thu muc 'frontend' va chay lenh: npm install
echo De xem loi chi tiet.
echo.
echo YEU CAU: Python 3 va Node.js/npm phai co trong PATH.
echo.
pause
echo.

REM === Thiet lap Backend ===
echo [+] Dang chuan bi thiet lap Backend...
if not exist backend (
    echo [LOI] Khong tim thay thu muc 'backend'. Ban dang chay file .bat tu thu muc goc chua?
    goto :loi_thoat_co_pause
)
cd backend || ( echo [LOI] Khong the vao thu muc backend. && pause && exit /b 1 )
echo [DEBUG] Da vao thu muc backend. Nhan phim bat ky de kiem tra Python...
pause
echo.

REM Kiem tra Python
echo [DEBUG] Dang kiem tra Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python trong PATH. Vui long cai dat Python 3 va them vao PATH.
    goto :loi_thoat_co_pause
)
echo [DEBUG] Tim thay Python. Nhan phim bat ky de kiem tra/tao venv...
pause
echo.

REM Tao moi truong ao
if not exist venv (
    echo [INFO] Dang tao moi truong ao Python ^(venv^)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [LOI] Khong the tao moi truong ao Python. Kiem tra Python hoac quyen ghi file.
        cd ..
        goto :loi_thoat_co_pause
    )
    echo [INFO] Da tao moi truong ao trong backend\venv.
) else (
    echo [INFO] Moi truong ao Python 'venv' da ton tai. Bo qua buoc tao.
)
echo [DEBUG] Buoc venv hoan tat. Nhan phim bat ky de kich hoat venv va cai dat pip...
pause
echo.


REM Kich hoat venv va cai dat pip
echo [INFO] Dang kich hoat moi truong ao va cai dat cac goi Python...
call .\venv\Scripts\activate.bat || ( echo [LOI] Khong the kich hoat venv. && pause && exit /b 1 )
echo [DEBUG] Venv da kich hoat. Dang chay pip install...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [LOI] Khong the cai dat cac goi Python tu requirements.txt. Kiem tra ket noi mang hoac file.
    cd ..
    goto :loi_thoat_co_pause
)
echo [INFO] Da cai dat xong cac goi Python.
echo [DEBUG] Cai dat pip hoan tat. Nhan phim bat ky de thoat thu muc backend...
pause
cd .. || ( echo [LOI] Khong the thoat thu muc backend. && pause && exit /b 1 )
echo [+] Thiet lap Backend hoan tat.
echo.
echo [DEBUG] Da thoat thu muc backend. Nhan phim bat ky de bat dau thiet lap Frontend...
pause
echo.

REM === Thiet lap Frontend ===
echo [+] Dang chuan bi thiet lap Frontend...
if not exist frontend (
    echo [LOI] Khong tim thay thu muc 'frontend'. Ban dang chay file .bat tu thu muc goc chua?
    goto :loi_thoat_co_pause
)
cd frontend || ( echo [LOI] Khong the vao thu muc frontend. && pause && exit /b 1 )
echo [DEBUG] Da vao thu muc frontend. Nhan phim bat ky de kiem tra npm...
pause
echo.

REM Kiem tra npm
echo [DEBUG] Dang kiem tra npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay npm ^(Node.js^) trong PATH. Vui long cai dat Node.js va npm.
    cd ..
    goto :loi_thoat_co_pause
)
echo [DEBUG] Tim thay npm. Nhan phim bat ky de chay "npm install". Luu y buoc nay co the lau va co the khien cua so bi dong neu co loi nghiem trong.
pause
echo.

echo [INFO] Dang chay "npm install" ^(Co the mat vai phut^)...
npm install

REM *** KIEM TRA LOI NGAY SAU NPM INSTALL ***
if %errorlevel% neq 0 (
    echo.
    echo [LOI] "npm install" THAT BAI voi ma loi: %errorlevel%.
    echo [LOI] Nguyen nhan co the do loi mang, thieu quyen, xung dot goi,...
    echo [LOI] Hay thu chay lai lenh sau thu cong trong CMD tai thu muc 'frontend':
    echo   npm install
    goto :loi_thoat_co_pause
)

REM *** PAUSE NGAY SAU KHI NPM INSTALL CHAY XONG (THANH CONG HAY KHONG) DE XEM OUTPUT ***
echo.
echo [DEBUG] Lenh "npm install" DA CHAY XONG. Kiem tra xem co thong bao loi nao o tren khong. Ma loi tra ve: %errorlevel%.
echo [DEBUG] Nhan phim bat ky de tiep tuc...
pause
echo.

REM Neu den duoc day va errorlevel la 0 thi moi la thanh cong
echo [INFO] Da cai dat xong cac goi Node.js (Neu errorlevel o tren la 0).
echo [DEBUG] Nhan phim bat ky de thoat thu muc frontend...
pause

cd .. || ( echo [LOI] Khong the thoat thu muc frontend. && pause && exit /b 1 )
echo [+] Thiet lap Frontend hoan tat.
echo.

echo ==========================================================
echo                  CAI DAT HOAN TAT!
echo ==========================================================
echo.
echo De chay ung dung, hay su dung file 'run.bat'
echo hoac chay thu cong nhu huong dan.
echo.
goto :ket_thuc_co_pause

:loi_thoat_co_pause
echo.
echo [!!!] Cai dat that bai do co loi. Cua so se dung lai de ban xem loi.
echo.
pause
goto :ket_thuc

:ket_thuc_co_pause
echo [INFO] Kich ban da hoan thanh. Nhan phim bat ky de dong.
pause
:ket_thuc