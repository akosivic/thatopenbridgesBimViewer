# PowerShell script to clean up unused debug imports
# This script will remove unused debugWarn and debugError imports

$files = Get-ChildItem -Path "d:\Bridges\thatopenbridgesBimViewer\src" -Recurse -Include "*.ts","*.tsx" | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*debugLogger.ts" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file has debug imports
    if ($content -match 'import\s*\{\s*debugLog[^}]*\}\s*from.*debugLogger') {
        Write-Host "Checking: $($file.FullName)"
        
        # Check what debug functions are actually used
        $usesDebugLog = $content -match '\bdebugLog\s*\('
        $usesDebugWarn = $content -match '\bdebugWarn\s*\('
        $usesDebugError = $content -match '\bdebugError\s*\('
        
        # Build the import list based on what's actually used
        $importList = @()
        if ($usesDebugLog) { $importList += "debugLog" }
        if ($usesDebugWarn) { $importList += "debugWarn" }
        if ($usesDebugError) { $importList += "debugError" }
        
        if ($importList.Count -gt 0) {
            $newImport = "import { " + ($importList -join ", ") + " } from"
            $content = $content -replace 'import\s*\{\s*debugLog[^}]*\}\s*from', $newImport
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "  Updated imports: $($importList -join ', ')"
        }
    }
}