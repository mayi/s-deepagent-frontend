param(
    [Parameter(Mandatory=$false)]
    [string]$version
)

# If version is not provided, get the latest version from version.log and increment it
if (-not $version) {
    if (Test-Path "version.log") {
        $lastVersionLine = Get-Content -Path "version.log" -Tail 1
        if ($lastVersionLine) {
            $lastVersion = $lastVersionLine.Split(' ')[0]
            $versionParts = $lastVersion.Split('.')
            $majorVersion = $versionParts[0]
            $minorVersion = $versionParts[1]
            $patchVersion = [int]$versionParts[2] + 1
            $version = "$majorVersion.$minorVersion.$patchVersion"
            Write-Host "Auto-incrementing version to: $version"
        } else {
            Write-Error "Could not parse version from version.log"
            exit 1
        }
    } else {
        Write-Error "version.log not found"
        exit 1
    }
}

$imageName = "swr.cn-north-4.myhuaweicloud.com/s-deepagent/s-deepagent-website:$version"

Write-Host "Building image: $imageName"
podman build -t $imageName .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful, pushing image to registry..."
    podman push $imageName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Image successfully pushed to registry"
        # Add timestamp and version to version.log
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "$version $timestamp" | Add-Content -Path "version.log"
        
        # Add Git tag and push changes
        Write-Host "Creating Git tag v$version..."
        git tag -a "$version" -m "Version $version release"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pushing changes to remote repository..."
            git push
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Pushing tags to remote repository..."
                git push --tags
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Git operations completed successfully"
                } else {
                    Write-Error "Failed to push tags"
                    exit 1
                }
            } else {
                Write-Error "Failed to push changes"
                exit 1
            }
        } else {
            Write-Error "Failed to create Git tag"
            exit 1
        }
    } else {
        Write-Error "Failed to push image"
        exit 1
    }
} else {
    Write-Error "Build failed"
    exit 1
}