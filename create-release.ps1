# PowerShell script to create a release zip file
# This script creates a timestamped release zip with the server and dist folders

param(
    [string]$OutputFolder = "Releases"
)

# Get current date and time for filename
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFileName = "release-$timestamp.zip"
$tempFolderName = "temp-release-$timestamp"

Write-Host "Creating release zip: $zipFileName" -ForegroundColor Green

try {
    # Create temporary working directory
    $tempPath = Join-Path $PSScriptRoot $tempFolderName
    if (Test-Path $tempPath) {
        Remove-Item $tempPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
    
    # Step 1: Copy server folder to temp directory with zip filename
    Write-Host "Copying server folder..." -ForegroundColor Yellow
    $serverSource = Join-Path $PSScriptRoot "server"
    $releaseBaseName = "release-$timestamp"
    $serverDest = Join-Path $tempPath $releaseBaseName
    
    if (-not (Test-Path $serverSource)) {
        throw "Server folder not found at: $serverSource"
    }
    
    Copy-Item -Path $serverSource -Destination $serverDest -Recurse -Force
    
    # Step 2: Copy dist folder inside server folder
    Write-Host "Copying dist folder into server..." -ForegroundColor Yellow
    $distSource = Join-Path $PSScriptRoot "dist"
    $distDest = Join-Path $serverDest "dist"
    
    if (-not (Test-Path $distSource)) {
        throw "Dist folder not found at: $distSource. Please run 'npm run build' first."
    }
    
    Copy-Item -Path $distSource -Destination $distDest -Recurse -Force
    
    # Step 3: Update paths in server.js
    Write-Host "Updating paths in server.js..." -ForegroundColor Yellow
    $serverJsPath = Join-Path $serverDest "server.js"
    
    if (Test-Path $serverJsPath) {
        $content = Get-Content $serverJsPath -Raw
        
        # Replace ../dist with ./dist
        $updatedContent = $content -replace '\.\./dist', './dist'
        
        # Replace ../public with ./public (in case there are any references)
        $updatedContent = $updatedContent -replace '\.\./public', './public'
        
        # Write updated content back to file
        Set-Content -Path $serverJsPath -Value $updatedContent -Encoding UTF8
        
        Write-Host "Updated server.js paths successfully" -ForegroundColor Green
    } else {
        Write-Warning "server.js not found at: $serverJsPath"
    }
    
    # Step 4: Create releases folder if it doesn't exist
    $releasesPath = Join-Path $PSScriptRoot $OutputFolder
    if (-not (Test-Path $releasesPath)) {
        New-Item -ItemType Directory -Path $releasesPath -Force | Out-Null
        Write-Host "Created releases folder: $releasesPath" -ForegroundColor Green
    }
    
    # Step 5: Create zip file
    Write-Host "Creating zip file..." -ForegroundColor Yellow
    $zipPath = Join-Path $releasesPath $zipFileName
    
    # Remove existing zip if it exists
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # Create zip using .NET compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempPath, $zipPath)
    
    Write-Host "Release created successfully!" -ForegroundColor Green
    Write-Host "Location: $zipPath" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
} catch {
    Write-Error "Error creating release: $($_.Exception.Message)"
    exit 1
} finally {
    # Clean up temporary folder
    if (Test-Path $tempPath) {
        Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
        Remove-Item $tempPath -Recurse -Force
    }
}

Write-Host "Release creation completed!" -ForegroundColor Green
