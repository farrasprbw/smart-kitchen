Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\FF\.gemini\antigravity-ide\brain\157c03db-ff44-4fd7-b71a-c1a2cb1e7fd9\.user_uploaded\media_1792542778257.jpg"
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
    
    # Background color Warm Culinary Green
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#00652c")
    $g.Clear($bgColor)
    
    # Logo size: fit within 40% of shortest side, max 400px
    $shortSide = [Math]::Min($w, $h)
    $logoSize = [Math]::Max(120, [int]($shortSide * 0.45))
    if ($logoSize -gt 512) { $logoSize = 512 }
    
    $x = [int](($w - $logoSize) / 2)
    $y = [int](($h - $logoSize) / 2)
    
    $g.DrawImage($src, $x, $y, $logoSize, $logoSize)
    $g.Dispose()
    return $bmp
}

# 1. Launcher icons
$iconSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $iconSizes.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    
    $iconBmp = Resize-Image $srcImage $entry.Value $entry.Value
    $iconBmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()
    Write-Host "Generated icon for $($entry.Key) ($($entry.Value)x$($entry.Value))"
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

# Also update web favicon & logo
$favBmp = Resize-Image $srcImage 64 64
$favBmp.Save("d:\Work\Code\smart-kitchen\favicon.ico", [System.Drawing.Imaging.ImageFormat]::Icon)
$favBmp.Dispose()

$srcImage.Dispose()
Write-Host "All assets generated successfully!"
