param(
  [string]$Repo = "vutheviet/giapha5",
  [string]$WebTag = "web-latest",
  [string]$ServerTag = "server-latest"
)

# Requires prior: docker login

Write-Host "Building server image..."
Push-Location "$PSScriptRoot\..\server"
docker build -t giapha-server:local .
Pop-Location

docker tag giapha-server:local "${Repo}:${ServerTag}"

Write-Host "Building web image..."
Push-Location "$PSScriptRoot\..\web"
docker build -t giapha-web:local .
Pop-Location

docker tag giapha-web:local "${Repo}:${WebTag}"

Write-Host "Pushing images to Docker Hub..."
docker push "${Repo}:${ServerTag}"
docker push "${Repo}:${WebTag}"

Write-Host ("Done. Pushed:`n - {0}:{1}`n - {0}:{2}" -f $Repo, $ServerTag, $WebTag)