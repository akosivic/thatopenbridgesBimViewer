# Fix remaining console statements in key files
$files = @(
    "src\services\loytecAuth.ts",
    "src\config\appConfig.ts", 
    "src\components\LoginButtonComponent.tsx",
    "src\components\common\authentication.tsx"
)

foreach ($file in $files) {
    $filePath = "d:\Bridges\thatopenbridgesBimViewer\$file"
    if (Test-Path $filePath) {
        Write-Host "Processing: $file"
        $content = Get-Content $filePath -Raw
        $originalContent = $content
        
        # Add debug import if needed (calculate relative path)
        $depth = ($file -split "\\").Count - 2  # Subtract 2 for "src" and filename
        $relativePath = "../" * $depth + "utils/debugLogger"
        
        if (-not ($content -match "import.*debugLog.*from.*debugLogger")) {
            # Find last import
            $lines = $content -split "`r?`n"
            $lastImportIndex = -1
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import\s") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                $importStatement = "import { debugLog, debugWarn, debugError } from `"$relativePath`";"
                $newLines = $lines[0..$lastImportIndex] + $importStatement + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                $content = $newLines -join "`n"
                Write-Host "  Added debug import"
            }
        }
        
        # Replace console statements  
        $content = $content -replace 'console\.log\(', 'debugLog('
        $content = $content -replace 'console\.warn\(', 'debugWarn('
        $content = $content -replace 'console\.error\(', 'debugError('
        
        if ($content -ne $originalContent) {
            Set-Content $filePath $content -Encoding UTF8
            Write-Host "  ✓ Updated console statements"
        } else {
            Write-Host "  - No changes needed"
        }
    } else {
        Write-Host "  ✗ File not found: $file"
    }
}

Write-Host "Key files updated!"