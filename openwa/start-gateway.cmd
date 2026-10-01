@echo off
rem Keeps the WhatsApp gateway running: starts it, and restarts it 15s after
rem any crash. Output goes to openwa\logs\gateway.log.
rem Node is found automatically: %NODE_EXE% if set, else the standard install
rem location, else whatever "node" is on PATH.

cd /d "%~dp0"
if not exist logs mkdir logs

set "NODE=%NODE_EXE%"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE set "NODE=node"

:loop
rem Start a fresh log once it passes ~5 MB (keeps one previous file).
for %%F in (logs\gateway.log) do if %%~zF GTR 5000000 move /y logs\gateway.log logs\gateway.old.log >nul
echo ===== gateway start %date% %time% >> logs\gateway.log
"%NODE%" index.js >> logs\gateway.log 2>&1
echo ===== gateway exited (code %errorlevel%), restarting in 15s >> logs\gateway.log
rem ping as a sleep: "timeout" fails when there is no console input (scheduled task).
ping -n 16 127.0.0.1 >nul
goto loop
