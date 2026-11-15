
Add-Type -AssemblyName System.Drawing

function Crop-Image($srcPath, $destPath, $x, $y, $w, $h) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $src.Clone($rect, $src.PixelFormat)
    $cropped.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $src.Dispose()
    $cropped.Dispose()
    Write-Host "Saved $destPath ($w x $h)"
}

$outDir = "C:\Users\User\.gemini\antigravity\scratch\school-padlet\crops"
$src3 = "C:\Users\User\.gemini\antigravity\brain\624aeb15-129a-4170-91b6-183884e84e05\.user_uploaded\media_1794181923830_a2cb150c.png"

Crop-Image $src3 "$outDir\sample2_ladder.png" 185 448 128 55
Crop-Image $src3 "$outDir\firebase_logo.png" 522 153 125 48
Crop-Image $src3 "$outDir\gamsgo_coupon.png" 522 330 125 38
Crop-Image $src3 "$outDir\excel_sheet.png" 350 285 125 45
Crop-Image $src3 "$outDir\huggingface_exact.png" 853 252 125 48
Crop-Image $src3 "$outDir\nvidia_exact.png" 853 378 125 48
