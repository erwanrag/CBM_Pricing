# check_prod_status.ps1

$smtpServer = "mail.proginov.fr"
$smtpPort = 25
$useSsl = $false
$from = "cbm_data@cbmcompany.com"
$to = "e.ragueneau@cbmcompany.com"
$subject = "CBM Pricing PROD - Erreur au démarrage"
$body = ""

# Tester backend (port 8000)
$backend = Test-NetConnection -ComputerName "127.0.0.1" -Port 8000
if (-not $backend.TcpTestSucceeded) {
    $body += "Backend (port 8000) KO.`n"
}

# Tester frontend (port 5173)
$frontend = Test-NetConnection -ComputerName "127.0.0.1" -Port 5173
if (-not $frontend.TcpTestSucceeded) {
    $body += "Frontend (port 5173) KO.`n"
}

# Envoi si erreur détectée
if ($body -ne "") {
    Send-MailMessage -From $from -To $to -Subject $subject -Body $body `
        -SmtpServer $smtpServer -Port $smtpPort -UseSsl:$useSsl
}
