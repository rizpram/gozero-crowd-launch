Add-Type -AssemblyName System.Speech
$showRoot = Split-Path -Parent $PSScriptRoot
$audioPath = Join-Path $showRoot 'public/audio'
New-Item -ItemType Directory -Force -Path $audioPath | Out-Null
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
# Use the installed system default voice; no network or speech service required.
$voice.Rate = 0
$voice.Volume = 100
$words = @('Go', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten')
for ($number = 0; $number -le 10; $number++) {
  $target = Join-Path $audioPath "count-$number.wav"
  $voice.SetOutputToWaveFile($target)
  $voice.Speak($words[$number])
  $voice.SetOutputToNull()
}
$voice.Dispose()
Write-Output '11 local countdown voice cues generated.'
