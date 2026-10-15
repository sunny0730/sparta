@echo off
setlocal
chcp 65001 >nul
set "CHAGEUN_ICON_SOURCE=%~dp0"
set "CHAGEUN_ICON_LOG=%TEMP%\Chageun-Icon.log"
echo Updating the Chageun shortcut icon...
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; $ErrorActionPreference='Stop'; try { $folder=Join-Path $env:LOCALAPPDATA 'Chageun'; $profile=Join-Path $folder 'BrowserProfile'; $appFile=Join-Path $folder 'chageun.html'; if (!(Test-Path -LiteralPath (Join-Path $folder '.chageun-installed') -PathType Leaf) -or !(Test-Path -LiteralPath $appFile -PathType Leaf)) { throw 'Chageun is not installed in the expected location. Use the full installer first.' }; $source=Join-Path $env:CHAGEUN_ICON_SOURCE 'chageun-icon-v1.ico'; if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Extract the ZIP first. The ICO file must be next to Change-icon.cmd.' }; $shell=New-Object -ComObject WScript.Shell; $directories=@($shell.SpecialFolders.Item('Desktop'),[Environment]::GetFolderPath('DesktopDirectory'),$folder) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) } | Select-Object -Unique; $links=@(foreach ($directory in $directories) { Get-ChildItem -LiteralPath $directory -Filter '*.lnk' -File | ForEach-Object { $link=$shell.CreateShortcut($_.FullName); if ($link.Description -eq 'Chageun - Today planner' -and $link.WorkingDirectory -eq $folder -and $link.Arguments.Contains($profile)) { [PSCustomObject]@{Path=$_.FullName;Link=$link} } } }); if (!$links.Count) { throw 'No Chageun shortcut was found. Use the full installer to create one.' }; $iconFile=Join-Path $folder 'chageun-icon-v1.ico'; Copy-Item -LiteralPath $source -Destination $iconFile -Force; foreach ($entry in $links) { $entry.Link.IconLocation=$iconFile+',0'; $entry.Link.Save(); $check=$shell.CreateShortcut($entry.Path); if (($check.IconLocation -replace '[\x22]','') -ne ($iconFile+',0')) { throw ('Icon update could not be verified: '+$entry.Path) }; Write-Host ('Icon updated: '+$entry.Path) }; Write-Host 'Done. Refresh your Desktop with F5 if the old icon is still visible.'; Write-Host 'Your app, diary, memos, and browser profile were not changed.'; } catch { Write-Host ('Icon update failed: '+$_.Exception.Message); exit 1 }" > "%CHAGEUN_ICON_LOG%" 2>&1
set "CHAGEUN_ICON_EXIT=%ERRORLEVEL%"
type "%CHAGEUN_ICON_LOG%"
if not "%CHAGEUN_ICON_EXIT%"=="0" start "" notepad.exe "%CHAGEUN_ICON_LOG%"
echo.
echo Log file: %CHAGEUN_ICON_LOG%
pause
exit /b %CHAGEUN_ICON_EXIT%
