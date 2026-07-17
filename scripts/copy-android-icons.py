#!/usr/bin/env python3
"""Copy pre-generated custom app icons to Android mipmap resources.
Uses only stdlib - no PIL/Pillow needed since icons are already generated."""
import os
import shutil

res_dir = 'android/app/src/main/res'
icon_dir = 'public/icons'

if not os.path.exists(res_dir):
    print(f'Android res dir not found: {res_dir}')
    exit(0)

# The icon-192.png is our base. We already have pre-sized versions.
mipmap_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

# Check which pre-generated icons exist
for folder, size in mipmap_sizes.items():
    dst_dir = os.path.join(res_dir, folder)
    os.makedirs(dst_dir, exist_ok=True)
    
    # Try to use pre-generated mipmap icons first
    pregen = os.path.join(icon_dir, f'{folder}-foreground.png')
    if os.path.exists(pregen):
        shutil.copy2(pregen, os.path.join(dst_dir, 'ic_launcher_foreground.png'))
        shutil.copy2(pregen, os.path.join(dst_dir, 'ic_launcher.png'))
        print(f'{folder}: using pre-generated {size}x{size}')
    else:
        # Fallback to nearest size
        nearest = min([(abs(s-size), s) for _, s in mipmap_sizes.items()])[1]
        fallback = f'icon-{nearest}.png'
        fallback_path = os.path.join(icon_dir, fallback)
        if os.path.exists(fallback_path):
            shutil.copy2(fallback_path, os.path.join(dst_dir, 'ic_launcher_foreground.png'))
            shutil.copy2(fallback_path, os.path.join(dst_dir, 'ic_launcher.png'))
            print(f'{folder}: using fallback {fallback}')
        else:
            # Last resort - copy 192
            shutil.copy2(os.path.join(icon_dir, 'icon-192.png'), os.path.join(dst_dir, 'ic_launcher_foreground.png'))
            shutil.copy2(os.path.join(icon_dir, 'icon-192.png'), os.path.join(dst_dir, 'ic_launcher.png'))
            print(f'{folder}: using 192px fallback')

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

print('Android icons installed successfully!')
