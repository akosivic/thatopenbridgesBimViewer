# PowerShell script to update all console statements to use debug logging
# This script processes all files except those in the server folder

Write-Host "Starting comprehensive debug mode update..." -ForegroundColor Green

# Files to update - TypeScript files in src directory (excluding server folder)
$typescriptFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" -Exclude "*.d.ts" | 
    Where-Object { $_.FullName -notlike "*\server\*" -and $_.FullName -notlike "*debugLogger.ts*" }

# JavaScript test files in root directory
$testFiles = Get-ChildItem -Path "." -Name "test_*.js"

Write-Host "Found $($typescriptFiles.Count) TypeScript files and $($testFiles.Count) test files to update" -ForegroundColor Yellow

# Function to add debug import to TypeScript files
function Add-DebugImport($filePath, $content) {
    # Check if debug import already exists
    if ($content -match "import.*debugLog.*from.*debugLogger") {
        return $content
    }
    
    # Find the last import statement
    $lines = $content -split "`r?`n"
    $lastImportIndex = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^import\s") {
            $lastImportIndex = $i
        }
    }
    
    if ($lastImportIndex -ge 0) {
        # Add debug import after the last import
        $importStatement = 'import { debugLog, debugWarn, debugError } from "../../utils/debugLogger";'
        
        # Calculate relative path depth
        $depth = ($filePath -split "\\").Count - 2  # Subtract 2 for "src" and filename
        $relativePath = "../" * ($depth - 1) + "utils/debugLogger"
        $importStatement = "import { debugLog, debugWarn, debugError } from `"$relativePath`";"
        
        $newLines = $lines[0..$lastImportIndex] + $importStatement + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
        return $newLines -join "`n"
    }
    
    return $content
}

# Function to add debug utility to JavaScript files
function Add-DebugUtility($content) {
    if ($content -match "const debugLog.*isDebugMode") {
        return $content
    }
    
    $debugUtility = @"
// Debug utility - only logs when ?debug parameter is in URL
const isDebugMode = () => typeof window !== 'undefined' && window.location?.search?.toLowerCase().includes('debug') || false;
const debugLog = (...args) => isDebugMode() && console.log(...args);
const debugWarn = (...args) => isDebugMode() && console.warn(...args);
const debugError = (...args) => isDebugMode() && console.error(...args);

"@
    
    # Find first non-comment line
    $lines = $content -split "`r?`n"
    $insertIndex = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^//|^$" -or $lines[$i].Trim() -eq "") {
            $insertIndex = $i + 1
        } else {
            break
        }
    }
    
    $beforeLines = $lines[0..($insertIndex - 1)]
    $afterLines = $lines[$insertIndex..($lines.Count - 1)]
    return ($beforeLines + $debugUtility.Split("`n") + $afterLines) -join "`n"
}

# Update TypeScript files
Write-Host "`nUpdating TypeScript files..." -ForegroundColor Cyan
foreach ($file in $typescriptFiles) {
    $filePath = $file.FullName
    $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
    
    try {
        $content = Get-Content $filePath -Raw -ErrorAction Stop
        $originalContent = $content
        
        # Skip if no console statements
        if (-not ($content -match "console\.(log|warn|error)")) {
            continue
        }
        
        Write-Host "  Processing: $relativePath" -ForegroundColor Gray
        
        # Add debug import (skip for debugLogger.ts itself)
        if ($filePath -notlike "*debugLogger.ts") {
            $content = Add-DebugImport $filePath $content
        }
        
        # Replace console statements (skip those inside debugLogger.ts)
        if ($filePath -notlike "*debugLogger.ts") {
            $content = $content -replace 'console\.log\(', 'debugLog('
            $content = $content -replace 'console\.warn\(', 'debugWarn('
            $content = $content -replace 'console\.error\(', 'debugError('
        }
        
        # Only write if content changed
        if ($content -ne $originalContent) {
            Set-Content $filePath $content -Encoding UTF8
            Write-Host "    ✓ Updated console statements" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "    ✗ Error processing file: $_" -ForegroundColor Red
    }
}

# Update JavaScript test files
Write-Host "`nUpdating JavaScript test files..." -ForegroundColor Cyan
foreach ($file in $testFiles) {
    try {
        $content = Get-Content $file -Raw -ErrorAction Stop
        $originalContent = $content
        
        # Skip if no console statements
        if (-not ($content -match "console\.(log|warn|error)")) {
            continue
        }
        
        Write-Host "  Processing: $file" -ForegroundColor Gray
        
        # Add debug utility
        $content = Add-DebugUtility $content
        
        # Replace console statements (but not inside debug utility definitions)
        $lines = $content -split "`r?`n"
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            # Skip lines that are defining the debug functions
            if ($line -match "const debugLog.*console\.log" -or 
                $line -match "const debugWarn.*console\.warn" -or
                $line -match "const debugError.*console\.error") {
                continue
            }
            # Replace console calls
            $lines[$i] = $line -replace 'console\.log\(', 'debugLog('
            $lines[$i] = $lines[$i] -replace 'console\.warn\(', 'debugWarn('
            $lines[$i] = $lines[$i] -replace 'console\.error\(', 'debugError('
        }
        $content = $lines -join "`n"
        
        # Only write if content changed
        if ($content -ne $originalContent) {
            Set-Content $file $content -Encoding UTF8
            Write-Host "    ✓ Updated console statements" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "    ✗ Error processing file: $_" -ForegroundColor Red
    }
}

Write-Host "`nDebug mode update completed!" -ForegroundColor Green
Write-Host "All console statements now controlled by ?debug URL parameter" -ForegroundColor Yellow