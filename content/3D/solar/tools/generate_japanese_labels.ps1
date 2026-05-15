param(
    [string]$OutputDir = "assets/textures"
)

Add-Type -AssemblyName System.Drawing

$labels = @(
    @{ Key = "sun"; Text = "$([char]0x592A)$([char]0x967D)" },
    @{ Key = "mercury"; Text = "$([char]0x6C34)$([char]0x661F)" },
    @{ Key = "venus"; Text = "$([char]0x91D1)$([char]0x661F)" },
    @{ Key = "earth"; Text = "$([char]0x5730)$([char]0x7403)" },
    @{ Key = "mars"; Text = "$([char]0x706B)$([char]0x661F)" },
    @{ Key = "jupiter"; Text = "$([char]0x6728)$([char]0x661F)" },
    @{ Key = "saturn"; Text = "$([char]0x571F)$([char]0x661F)" },
    @{ Key = "uranus"; Text = "$([char]0x5929)$([char]0x738B)$([char]0x661F)" },
    @{ Key = "neptune"; Text = "$([char]0x6D77)$([char]0x738B)$([char]0x661F)" }
)

$fullOutputDir = Join-Path (Get-Location) $OutputDir
New-Item -ItemType Directory -Force -Path $fullOutputDir | Out-Null

foreach ($label in $labels) {
    $bitmap = New-Object System.Drawing.Bitmap 512, 160
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $font = New-Object System.Drawing.Font "Yu Gothic UI", 74, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF 0, 0, 512, 160
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 0, 0, 0))
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
    $shadowRect = New-Object System.Drawing.RectangleF 3, 4, 512, 160

    $graphics.DrawString($label.Text, $font, $shadowBrush, $shadowRect, $format)
    $graphics.DrawString($label.Text, $font, $textBrush, $rect, $format)

    $path = Join-Path $fullOutputDir ("label_{0}_ja.png" -f $label.Key)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $textBrush.Dispose()
    $shadowBrush.Dispose()
    $format.Dispose()
    $font.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host "Wrote Japanese label textures to $fullOutputDir"
