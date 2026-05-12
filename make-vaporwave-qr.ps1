python -m pip install "qrcode[pil]" -q

$tempFile = New-TemporaryFile
$tempPy = "$tempFile.py"
Move-Item $tempFile $tempPy

@'
import qrcode
img = qrcode.make("https://richhank.github.io/ironlog-vaporwave/")
img.save(r"C:\Users\right\Desktop\ironlog-vaporwave-qr.png")
print("SUCCESS")
print("QR_FILE=C:\\Users\\right\\Desktop\\ironlog-vaporwave-qr.png")
print("QR_URL=https://richhank.github.io/ironlog-vaporwave/")
'@ | Out-File -FilePath $tempPy -Encoding UTF8

python $tempPy
Remove-Item $tempPy
