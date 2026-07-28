$env:PORT="4567"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node"
$psi.Arguments = "C:\Users\Mouns\Downloads\Tatakai-main\bridge-server\index.js"
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$p = [System.Diagnostics.Process]::Start($psi)
$p.Id | Out-File -FilePath "C:\Users\Mouns\Downloads\Tatakai-main\bridge.pid" -NoNewline
Write-Host "Bridge started with PID $($p.Id)"
