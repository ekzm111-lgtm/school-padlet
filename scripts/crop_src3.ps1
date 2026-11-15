
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

# 1. 샘플2 사다리타기 게임
Crop-Image $src3 "$outDir\sample2_ladder.png" 185 390 128 65

# 2. Firebase 콘솔
Crop-Image $src3 "$outDir\firebase_logo.png" 520 145 128 60

# 3. GamsGo 할인
Crop-Image $src3 "$outDir\gamsgo_coupon.png" 520 315 128 45

# 4. 엑셀시트 스프레드시트
Crop-Image $src3 "$outDir\excel_sheet.png" 350 260 128 45

# 5. QR 동의서 구글 시트 폼
Crop-Image $src3 "$outDir\qr_sheet_form.png" 350 400 128 50

# 6. HuggingFace 노란 카드
Crop-Image $src3 "$outDir\huggingface_exact.png" 855 220 128 55

# 7. NVIDIA AI 2.0 로봇
Crop-Image $src3 "$outDir\nvidia_exact.png" 855 355 128 55
