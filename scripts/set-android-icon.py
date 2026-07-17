import sys, os
from PIL import Image
icon_dir = sys.argv[1]
icon_path = sys.argv[2]
img = Image.open(icon_path)
sizes = {'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192}
for d, s in sizes.items():
    mdpi_dir = os.path.join(icon_dir, d)
    os.makedirs(mdpi_dir, exist_ok=True)
    img.resize((s, s), Image.LANCZOS).save(os.path.join(mdpi_dir, 'ic_launcher_foreground.png'))
    print(f'Created {d}/ic_launcher_foreground.png ({s}x{s})')
# Create adaptive-icon XML
anydpi_dir = os.path.join(icon_dir, 'mipmap-anydpi-v26')
os.makedirs(anydpi_dir, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>'''
with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w') as f: f.write(xml)
with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w') as f: f.write(xml)
# Background color
values_dir = os.path.join(icon_dir, 'values')
os.makedirs(values_dir, exist_ok=True)
with open(os.path.join(values_dir, 'ic_launcher_background.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#000000</color></resources>')
print('Android icon setup complete')
print(f'Icon dir: {icon_dir}')
