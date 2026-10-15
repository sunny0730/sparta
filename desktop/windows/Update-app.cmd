@echo off
setlocal
chcp 65001 >nul
set "CHAGEUN_UPDATE_SOURCE=%~dp0"
set "CHAGEUN_UPDATE_LOG=%TEMP%\Chageun-Update.log"
echo Updating Chageun. Your saved records will be kept...
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; $ErrorActionPreference='Stop'; try { Write-Host 'Chageun journal and memo update'; $folder=Join-Path $env:LOCALAPPDATA 'Chageun'; $appFile=Join-Path $folder 'chageun.html'; if (!(Test-Path -LiteralPath $appFile -PathType Leaf) -or !(Test-Path -LiteralPath (Join-Path $folder '.chageun-installed') -PathType Leaf)) { throw 'The installed Chageun app was not found. No files were changed.' }; $source=Join-Path $env:CHAGEUN_UPDATE_SOURCE 'chageun.html'; if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Extract all ZIP files first. chageun.html must be next to Update-app.cmd.' }; $content=[IO.File]::ReadAllText($source,[Text.Encoding]::UTF8); if (!$content.Contains('diary-input') -or !$content.Contains('memo-input') -or !$content.Contains('record-shortcuts')) { throw 'The update HTML is incomplete. No files were changed.' }; $backupFolder=Join-Path $folder 'App-backups'; New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null; $backup=Join-Path $backupFolder ('chageun-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8)+'.html'); Copy-Item -LiteralPath $appFile -Destination $backup; Copy-Item -LiteralPath $source -Destination $appFile -Force; Write-Host ('App updated: '+$appFile); Write-Host ('Previous app template saved: '+$backup); Write-Host 'Your browser profile, saved records, and shortcut icons were not changed.'; Write-Host 'Close any old Chageun window, then reopen Chageun using the same desktop shortcut.'; Write-Host 'The top of the updated app has buttons for tasks, diary, and work memos.'; } catch { Write-Host ('App update failed: '+$_.Exception.Message); exit 1 }" > "%CHAGEUN_UPDATE_LOG%" 2>&1
set "CHAGEUN_UPDATE_EXIT=%ERRORLEVEL%"
type "%CHAGEUN_UPDATE_LOG%"
if not "%CHAGEUN_UPDATE_EXIT%"=="0" start "" notepad.exe "%CHAGEUN_UPDATE_LOG%"
echo.
echo Reopen Chageun from your existing Desktop shortcut.
echo Log file: %CHAGEUN_UPDATE_LOG%
pause
exit /b %CHAGEUN_UPDATE_EXIT%
