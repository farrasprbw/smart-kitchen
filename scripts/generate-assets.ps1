Add-Type -AssemblyName System.Drawing

$srcPath = "d:\Work\Code\smart-kitchen\assets\icons\logo.png"
$resDir = "d:\Work\Code\smart-kitchen\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($src, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $bmp
}

function Create-SplashScreen($src, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Background color Deep Forest / Sage Green sesuai Gambar 3 & Gemini link
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#1b4d3e")
    $g.Clear($bgColor)
    
    # Logo size: fit within 45% of shortest side, max 420px
    $shortSide = [Math]::Min($w, $h)
    $logoSize = [Math]::Max(140, [int]($shortSide * 0.45))
    if ($logoSize -gt 420) { $logoSize = 420 }
    
    $x = [int](($w - $logoSize) / 2)
    $y = [int](($h - $logoSize) / 2)
    
    $g.DrawImage($src, $x, $y, $logoSize, $logoSize)
    $g.Dispose()
    return $bmp
}

# 1. Launcher icons & Adaptive Foreground
$iconSizes = @{
    "mipmap-mdpi" = @{ legacy = 48; fg = 108 }
    "mipmap-hdpi" = @{ legacy = 72; fg = 162 }
    "mipmap-xhdpi" = @{ legacy = 96; fg = 216 }
    "mipmap-xxhdpi" = @{ legacy = 144; fg = 324 }
    "mipmap-xxxhdpi" = @{ legacy = 192; fg = 432 }
}

foreach ($entry in $iconSizes.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    
    # Legacy & round icons
    $iconBmp = Resize-Image $srcImage $entry.Value.legacy $entry.Value.legacy
    $iconBmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()

    # Adaptive icon foreground (Android 8.0+)
    $fgBmp = Resize-Image $srcImage $entry.Value.fg $entry.Value.fg
    $fgBmp.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Host "Generated legacy ($($entry.Value.legacy)px) & foreground ($($entry.Value.fg)px) for $($entry.Key)"
}

# 2. Splash Screens (Portrait & Landscape)
$splashPort = @{
    "drawable" = @{ w = 720; h = 1280 }
    "drawable-port-mdpi" = @{ w = 320; h = 480 }
    "drawable-port-hdpi" = @{ w = 480; h = 800 }
    "drawable-port-xhdpi" = @{ w = 720; h = 1280 }
    "drawable-port-xxhdpi" = @{ w = 960; h = 1600 }
    "drawable-port-xxxhdpi" = @{ w = 1280; h = 1920 }
}

foreach ($entry in $splashPort.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    $splash = Create-SplashScreen $srcImage $entry.Value.w $entry.Value.h
    $splash.Save((Join-Path $dir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $splash.Dispose()
    Write-Host "Generated portrait splash for $($entry.Key) ($($entry.Value.w)x$($entry.Value.h))"
}

$splashLand = @{
    "drawable-land-mdpi" = @{ w = 480; h = 320 }
    "drawable-land-hdpi" = @{ w = 800; h = 480 }
    "drawable-land-xhdpi" = @{ w = 1280; h = 720 }
    "drawable-land-xxhdpi" = @{ w = 1600; h = 960 }
    "drawable-land-xxxhdpi" = @{ w = 1920; h = 1280 }
}

foreach ($entry in $splashLand.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    $splash = Create-SplashScreen $srcImage $entry.Value.w $entry.Value.h
    $splash.Save((Join-Path $dir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $splash.Dispose()
    Write-Host "Generated landscape splash for $($entry.Key) ($($entry.Value.w)x$($entry.Value.h))"
}

# Also update web favicon & icons
$favBmp = Resize-Image $srcImage 64 64
$favBmp.Save("d:\Work\Code\smart-kitchen\favicon.ico", [System.Drawing.Imaging.ImageFormat]::Png)
$favBmp.Dispose()

$icon192 = Resize-Image $srcImage 192 192
$icon192.Save("d:\Work\Code\smart-kitchen\assets\icons\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Dispose()

$icon512 = Resize-Image $srcImage 512 512
$icon512.Save("d:\Work\Code\smart-kitchen\assets\icons\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Dispose()

$srcImage.Dispose()
Write-Host "All assets generated successfully!"
