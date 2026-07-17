#!/usr/bin/env python3
"""Copy custom app icons to Android mipmap resources."""
import os
import shutil
from PIL import Image

res_dir = 'android/app/src/main/res'
icon_dir = 'public/icons'

if not os.path.exists(res_dir):
    print(f'Android res dir not found: {res_dir}')
    exit(0)

# Maps Android mipmap density folders to their icon sizes
mipmap_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

# Read the base icon (192px is good quality)
base_icon = Image.open(os.path.join(icon_dir, 'icon-192.png'))

for folder, size in mipmap_sizes.items():
    dst_dir = os.path.join(res_dir, folder)
    os.makedirs(dst_dir, exist_ok=True)
    
    # Resize the icon for this density
    resized = base_icon.resize((size, size), Image.LANCZOS)
    
    # Save as ic_launcher_foreground.png (used by adaptive icon)
    dst_path = os.path.join(dst_dir, 'ic_launcher_foreground.png')
    resized.save(dst_path)
    
    # Also save as ic_launcher.png (fallback for older android)
    dst_path_legacy = os.path.join(dst_dir, 'ic_launcher.png')
    resized.save(dst_path_legacy)
    
    print(f'{folder}: {size}x{size} -> {dst_path}')

# Create adaptive icon XML files
anydpi_dir = os.path.join(res_dir, 'mipmap-anydpi-v26')
os.makedirs(anydpi_dir, exist_ok=True)

adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>'''

with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w') as f:
    f.write(adaptive_xml)

with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w') as f:
    f.write(adaptive_xml)

# Create background color resource
values_dir = os.path.join(res_dir, 'values')
os.makedirs(values_dir, exist_ok=True)

bg_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>'''

with open(os.path.join(values_dir, 'ic_launcher_background.xml'), 'w') as f:
    f.write(bg_xml)

print('Android adaptive icons installed successfully!')
