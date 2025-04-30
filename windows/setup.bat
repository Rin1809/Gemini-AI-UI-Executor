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
pause  REM 

echo [DEBUG] Da qua buoc pause chinh. Nhan phim de tiep tuc...
pause  REM 

echo.
echo [DEBUG] Da qua buoc echo rong. Nhan phim de tiep tuc...
pause  REM 


REM === Thiet lap Frontend ===
echo [+] Dang chuan bi thiet lap Frontend...
echo [DEBUG] Da qua buoc echo header Frontend. Nhan phim de tiep tuc...
pause  REM 

if not exist frontend (
    echo [LOI] Khong tim thay thu muc 'frontend' o thu muc goc.
    goto :loi_thoat_co_pause
)
echo [DEBUG] Da qua buoc kiem tra 'if not exist frontend'. Nhan phim de tiep tuc...
pause  REM 


echo [INFO] Dang kiem tra npm (Node.js)...

echo [DEBUG] Da qua buoc kiem tra loi npm. Nhan phim de tiep tuc...
pause REM

REM --- Phan con lai cua Frontend (Mo cua so moi) ---
echo [INFO] Da tim thay npm.
echo.
echo [*] CHUAN BI MO CUA SO MOI DE CAI DAT FRONTEND (npm install).
echo     Cua so moi nay se chi chay lenh 'cd frontend', 'npm install' va sau do 'pause'.
echo     Hay quan sat xem no co hien thi loi nao tu npm install truoc khi pause khong.
echo     Buoc nay co the mat vai phut.
echo.
echo [*] Nhan phim bat ky de mo cua so moi...
pause
echo.

echo [INFO] Dang mo cua so moi de chay "npm install" trong thu muc 'frontend'...
start "NPM Install Test - Kiem tra cua so nay" cmd /k "cd frontend && echo Da vao 'frontend'. Dang chay npm install... && npm install && echo. && echo === NPM INSTALL DA HOAN TAT  === && echo Neu khong thay loi nao o tren va thay dong nay, co the la OK. && echo  === Su dung run.bat === 
