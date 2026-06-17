@echo off
title Geoportal InfoVias - Servidor Local
color 0A

echo.
echo  =============================================
echo   GEOPORTAL DAS INFOVIAS - INICIO DO SERVIDOR
echo  =============================================
echo.

:: Verificar se a porta 8000 esta em uso e encerrar processos antigos
echo [INFO] Verificando porta 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [INFO] Encerrando processo antigo (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 1 /nobreak >nul

:: Verificar se o Python esta disponivel
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado! Instale o Python e tente novamente.
    pause
    exit /b 1
)

echo [OK] Python disponivel.
echo [OK] Iniciando servidor sem cache em http://localhost:8000
echo.
echo  Pressione CTRL+C para encerrar o servidor.
echo.

:: Aguardar 1 segundo e abrir o navegador padrao
start "" timeout /t 1 /nobreak >nul
start "" "http://localhost:8000/index.html"

:: Iniciar o servidor Python sem cache
python server.py
