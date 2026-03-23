$source = $PSScriptRoot
$dest = '\\DDSPLAYGROUND\appdata\nginx\www'
$excludeDirs = @('node_modules', '.git', '.claude', '.gemini', '.idea', '.vscode')
$excludeFiles = @('deploy.ps1', 'GEMINI.md', '*.log', '.DS_Store', 'desktop.ini')

Write-Host "Deploying from $source to $dest..."
Write-Host "Excluding directories: $excludeDirs"
Write-Host "Excluding files: $excludeFiles"

# /MIR :: MIRror a directory tree (equivalent to /E plus /PURGE).
# /XD :: eXclude Directories matching the given names/paths.
# /XF :: eXclude Files matching the given names/paths.
# /R:1 :: number of Retries on failed copies: successful copies.
# /W:1 :: Wait time between retries: default is 30 seconds.
# /FFT :: assume FAT File Times (2-second granularity). Useful for network shares.
# /NJH :: No Job Header.
# /NJS :: No Job Summary.

robocopy $source $dest /MIR /XD $excludeDirs /XF $excludeFiles /R:1 /W:1 /FFT

# Robocopy exit codes:
# 0: No errors occurred, and no copying was done. The source and destination directory trees are completely synchronized.
# 1: One or more files were copied successfully (that is, new files have arrived).
# 2: Some Extra files or directories were detected. No files were copied Examine the output log for details. 
# 4: Some Mismatched files or directories were detected. Examine the output log. Housekeeping might be required.
# 8: Some files or directories could not be copied (copy errors occurred) and the retry limit was exceeded.

if ($LASTEXITCODE -ge 8) {
    Write-Error "Deployment failed with Robocopy exit code $LASTEXITCODE"
    exit 1
} elseif ($LASTEXITCODE -ge 4) {
    Write-Warning "Deployment completed with mismatches (Exit code $LASTEXITCODE). Check output."
} else {
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
}
