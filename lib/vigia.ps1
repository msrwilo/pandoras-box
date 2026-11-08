# Vigía de Pandora (respaldo): revisa los controles XInput mientras hay un juego abierto.
# Argumentos: máscara de botones, LT (0/1), RT (0/1), milisegundos sostenidos.
param([int]$Mask = 0x20C0, [int]$LT = 0, [int]$RT = 0, [int]$Hold = 1000)
$src = @"
using System;
using System.Runtime.InteropServices;
public static class PandoraXI {
  [StructLayout(LayoutKind.Sequential)] public struct Pad { public ushort Buttons; public byte LT; public byte RT; public short LX; public short LY; public short RX; public short RY; }
  [StructLayout(LayoutKind.Sequential)] public struct State { public uint Packet; public Pad Gamepad; }
  [DllImport("xinput1_4.dll")] public static extern int XInputGetState(int user, out State state);
}
"@
Add-Type -TypeDefinition $src
$held = 0
while ($true) {
  $combo = $false
  for ($i = 0; $i -lt 4; $i++) {
    $s = New-Object PandoraXI+State
    if ([PandoraXI]::XInputGetState($i, [ref]$s) -eq 0) {
      $b = $s.Gamepad.Buttons
      $ok = (($b -band $Mask) -eq $Mask)
      if ($LT -eq 1 -and $s.Gamepad.LT -lt 100) { $ok = $false }
      if ($RT -eq 1 -and $s.Gamepad.RT -lt 100) { $ok = $false }
      if ($ok) { $combo = $true }
    }
  }
  if ($combo) {
    $held += 50
    if ($held -ge $Hold) { [Console]::Out.WriteLine('salir'); [Console]::Out.Flush(); $held = -60000 }
  } elseif ($held -gt 0) { $held = 0 }
  Start-Sleep -Milliseconds 50
}
