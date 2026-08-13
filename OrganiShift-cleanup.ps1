param(
  [object[]]$Ranges = @(@(5050, 5150), @(5173, 5200))
)

$ErrorActionPreference = 'SilentlyContinue'

foreach ($r in $Ranges) {
  for ($p = $r[0]; $p -le $r[1]; $p++) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen
    if (-not $conn) { continue }

    $seenIds = @{}
    foreach ($owner in $conn.OwningProcess) {
      if ($seenIds.ContainsKey($owner)) { continue }
      $seenIds[$owner] = 1

      $cur = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owner)
      $isOurs = $false
      $root = $null
      $seen2 = @{}

      while ($cur -and -not $seen2.ContainsKey($cur.ProcessId)) {
        $seen2[$cur.ProcessId] = 1
        if ($cur.CommandLine -and $cur.CommandLine -match 'OrganiShift_MERN') {
          $isOurs = $true
        }
        if ($cur.Name -ne 'cmd.exe' -and $cur.Name -ne 'node.exe') { break }
        $root = $cur
        $cur = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cur.ParentProcessId)
      }

      if ($isOurs) {
        if ($root) { 'ours:' + $root.ProcessId } else { 'ours:' + $owner }
      }
    }
  }
}
