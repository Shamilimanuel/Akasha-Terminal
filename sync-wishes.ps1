# Akasha Terminal - wish import
# Reads your wish history straight from the game, the way paimon.moe's
# import does, and writes wishes-sync.js for the dashboard's Wish Counter.
#
# How it works:
#  1. Opening Wish > History in Genshin makes the game cache a link to its
#     wish-history API. That link carries an `authkey`: a temporary pass
#     (about a day) that lets whoever holds it read your wish history.
#  2. This script finds the newest such link in the game's web cache and
#     asks HoYoverse's server for your wishes, 20 at a time.
#  3. New wishes are merged into wish-archive.json (the server only keeps
#     the last 6 months; the archive keeps everything it has seen). Then
#     pity, 50/50 state and 5-star history are worked out and written to
#     wishes-sync.js, which index.html loads.
#
# The authkey only lives in memory: it is never printed, logged or saved,
# and error messages have it masked. wish-archive.json holds the wish
# records only (no UID, no key).
#
# Runs on its own (right-click, Run with PowerShell) before you open the
# dashboard. Any problem is one line of output and exit code 1; it
# never stops the dashboard from opening.

param([switch]$Quiet)

$ErrorActionPreference = 'Stop'
$here        = Split-Path -Parent $MyInvocation.MyCommand.Path
$archivePath = Join-Path $here 'wish-archive.json'
$outPath     = Join-Path $here 'wishes-sync.js'

# 5-star characters in the standard (permanent) pool. Getting one of these on
# a character event banner means the 50/50 was lost. When HoYoverse adds a
# character to the standard pool, add the name here, spelled as in-game.
$StandardPool = @('Diluc', 'Jean', 'Keqing', 'Mona', 'Qiqi', 'Tighnari', 'Dehya', 'Yumemizuki Mizuki')

# API banner types. 301 and 400 are the two character event banners, which
# share pity and the 50/50. Chronicled (500) and Novice (100) are skipped.
$Pools = @{ '301' = 'character'; '400' = 'character'; '302' = 'weapon'; '200' = 'standard' }

# Server clocks per region, in hours from UTC (wish times are server time).
$RegionUtcOffset = @{ 'os_euro' = 1; 'os_usa' = -5; 'os_asia' = 8; 'os_cht' = 8 }

function Say([string]$msg) { if (-not $Quiet) { Write-Host "  wishes: $msg" } }

function Find-WishLink {
    $logDir = Join-Path $env:USERPROFILE 'AppData\LocalLow\miHoYo\Genshin Impact'
    $logs = @('output_log.txt', 'output_log.txt.last') |
        ForEach-Object { Join-Path $logDir $_ } | Where-Object { Test-Path $_ }
    if (-not $logs) { throw "Genshin's log file wasn't found. Start the game once on this PC first." }

    $dataDir = $null
    foreach ($log in $logs) {
        $m = Select-String -Path $log -Pattern '([A-Za-z]:[\\/][^\r\n"]*?(GenshinImpact_Data|YuanShen_Data))' -List
        if ($m) { $dataDir = $m.Matches[0].Groups[1].Value; break }
    }
    if (-not $dataDir) { throw "Couldn't find the game folder in Genshin's log." }

    $version = Get-ChildItem (Join-Path $dataDir 'webCaches') -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d+(\.\d+)+$' } |
        Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
    if (-not $version) { throw "The game has no web cache yet. Open Wish > History in the game first." }

    $file = Join-Path $version.FullName 'Cache\Cache_Data\data_2'
    if (-not (Test-Path $file)) { throw "No wish-history cache yet. Open Wish > History in the game first." }

    # The game keeps this file open while it runs; it only lets others read it
    # if they also allow writes and deletes, like a browser cache.
    $fs = [IO.File]::Open($file, 'Open', 'Read', 'ReadWrite, Delete')
    try {
        $ms = New-Object IO.MemoryStream
        $fs.CopyTo($ms)
        $bytes = $ms.ToArray()
    } finally { $fs.Dispose() }
    $text = [Text.Encoding]::GetEncoding(28591).GetString($bytes)   # Latin-1: one char per byte

    $links = [regex]::Matches($text, 'https://[^\s"''<>\x00-\x1f\x7f-\xff]*/getGachaLog\?[^\s"''<>\x00-\x1f\x7f-\xff]*') |
        Where-Object { $_.Value -match '[?&]authkey=' }
    if (-not $links) { throw "No wish-history link in the game's cache. Open Wish > History in the game, then run this script again." }
    return @($links)[-1].Value   # the newest one is written last
}

function Get-Query([string]$url) {
    $q = [ordered]@{}
    foreach ($pair in (($url -split '\?', 2)[1] -split '&')) {
        if ($pair) { $kv = $pair -split '=', 2; $q[$kv[0]] = $kv[1] }
    }
    return $q
}

function Get-WishPage([string]$base, [string]$type, [string]$endId) {
    $resp = Invoke-WebRequest -Uri "$base&gacha_type=$type&page=1&size=20&end_id=$endId" -UseBasicParsing -TimeoutSec 20
    $body = [Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) | ConvertFrom-Json
    if ($body.retcode -ne 0) {
        if ($body.retcode -eq -101) { throw "The wish-history link has expired (it lasts about a day). Open Wish > History in the game, then run this script again." }
        throw "HoYoverse answered: $($body.message)"
    }
    return @($body.data.list)
}

function To-EpochMs([string]$serverTime, [int]$offsetHours) {
    $dt = [datetime]::ParseExact($serverTime, 'yyyy-MM-dd HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)
    return [long]($dt.AddHours(-$offsetHours) - [datetime]'1970-01-01').TotalMilliseconds
}

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $link   = Find-WishLink
    $q      = Get-Query $link
    $offset = if ($RegionUtcOffset.ContainsKey($q['region'])) { $RegionUtcOffset[$q['region']] } else { 0 }
    $keep   = $q.Keys | Where-Object { $_ -notin @('gacha_type', 'page', 'size', 'end_id') }
    $base   = ($link -split '\?', 2)[0] + '?' + (($keep | ForEach-Object { "$_=$($q[$_])" }) -join '&')

    # ---- archive: everything seen so far, by wish id ----
    $archive = @{}
    if (Test-Path $archivePath) {
        $saved = Get-Content $archivePath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($r in @($saved)) { if ($r.id) { $archive[[string]$r.id] = $r } }
    }

    # ---- fetch new wishes, newest first, until we reach ones we already have ----
    Say 'reading your wish history from the game...'
    $added = 0
    foreach ($type in @('301', '400', '302', '200')) {
        $endId = '0'
        for ($page = 0; $page -lt 500; $page++) {
            $list = Get-WishPage $base $type $endId
            if ($list.Count -eq 0) { break }
            $reachedKnown = $false
            foreach ($r in $list) {
                $id = [string]$r.id
                if ($archive.ContainsKey($id)) { $reachedKnown = $true; continue }
                $archive[$id] = [pscustomobject]@{
                    id = $id; gacha_type = [string]$r.gacha_type; name = [string]$r.name
                    item_type = [string]$r.item_type; rank_type = [string]$r.rank_type; time = [string]$r.time
                }
                $added++
            }
            if ($reachedKnown) { break }
            $endId = [string]$list[-1].id
            Start-Sleep -Milliseconds 300   # be gentle with HoYoverse's server
        }
    }

    $records = @($archive.Values | Sort-Object { [decimal]$_.id })
    [IO.File]::WriteAllText($archivePath, (ConvertTo-Json -InputObject $records -Depth 3),
        (New-Object Text.UTF8Encoding($false)))

    # ---- work out pity, 50/50 state and 5-star history ----
    $banners = [ordered]@{
        character = [ordered]@{ pity5 = 0; pity4 = 0; guaranteed = $false }
        weapon    = [ordered]@{ pity5 = 0; pity4 = 0; fatePoint = $null }   # Epitomized Path isn't in the history
        standard  = [ordered]@{ pity5 = 0; pity4 = 0 }
    }
    $totals = [ordered]@{
        character = [ordered]@{ wishes = 0; fours = 0 }
        weapon    = [ordered]@{ wishes = 0; fours = 0 }
        standard  = [ordered]@{ wishes = 0; fours = 0 }
    }
    $history = New-Object Collections.ArrayList
    $spend   = New-Object Collections.ArrayList   # recent wishes, so typed-in Primogems can be kept current
    $spendFrom = [long]((Get-Date).ToUniversalTime().AddDays(-120) - [datetime]'1970-01-01').TotalMilliseconds

    foreach ($r in $records) {
        $pool = $Pools[$r.gacha_type]
        if (-not $pool) { continue }
        $b = $banners[$pool]
        $b['pity5'] += 1; $b['pity4'] += 1
        $totals[$pool]['wishes'] += 1
        $t = To-EpochMs $r.time $offset
        if ($t -ge $spendFrom) { [void]$spend.Add([ordered]@{ b = $pool; t = $t }) }

        if ($r.rank_type -eq '4') { $b['pity4'] = 0; $totals[$pool]['fours'] += 1 }
        if ($r.rank_type -eq '5') {
            $result = $null
            if ($pool -eq 'character') {
                if ($StandardPool -contains $r.name) { $result = 'lost' }
                elseif ($b.guaranteed) { $result = 'guaranteed' }
                else { $result = 'won' }
                $b.guaranteed = ($result -eq 'lost')
            }
            [void]$history.Add([ordered]@{
                banner = $pool; name = $r.name; pity = $b.pity5; result = $result; date = $r.time.Substring(0, 10)
            })
            $b.pity5 = 0
        }
    }

    $now = Get-Date
    $payload = [ordered]@{
        source    = 'game'
        asOf      = $now.ToString('yyyy-MM-ddTHH:mm:ss')
        asOfLabel = $now.ToString('MMM d, HH:mm', [Globalization.CultureInfo]::InvariantCulture)
        banners   = $banners
        totals    = $totals
        history   = $history
        spend     = $spend
    }
    $js = "// Generated by sync-wishes.ps1 on $($payload.asOf). Don't edit by hand: run sync-wishes.ps1 to refresh.`n" +
          "window.LEDGER_DATA.wishesSync = " + (ConvertTo-Json -InputObject $payload -Depth 6 -Compress) + ";`n"
    [IO.File]::WriteAllText($outPath, $js, (New-Object Text.UTF8Encoding($false)))

    $c = $banners.character
    Say ("{0} new wish{1} imported ({2} on record). Character pity {3}, next 5-star {4}." -f
        $added, $(if ($added -eq 1) { '' } else { 'es' }), $records.Count, $c.pity5,
        $(if ($c.guaranteed) { 'guaranteed' } else { 'is a 50/50' }))
    exit 0
}
catch {
    # Never let the authkey reach the screen, even inside an error message.
    $msg = $_.Exception.Message -replace 'authkey=[^&\s"'']+', 'authkey=(hidden)'
    Say "not updated - $msg"
    exit 1
}
