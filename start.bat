@echo off
setlocal
cd /d "%~dp0"
title Geoportal InfoVias
python --version >nul 2>&1
if errorlevel 1 (
    echo Python nao encontrado.
    pause
    exit /b 1
)
echo Acesse http://127.0.0.1:8000/mapa.html apos iniciar.
echo Para outra porta: python server.py --port 8001
python server.py
if errorlevel 1 pause
