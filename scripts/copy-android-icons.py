#!/usr/bin/env python3
"""Generate android icons directly from pre-made PNG files in public/icons."""
import os
import shutil

res_dir = 'android/app/src/main/res'
icon_dir = 'public/icons'

if not os.path.exists(res_dir):
    print(f'Android res dir not found: {res_dir}')
    exit(1)

# Android mipmap density mapping
density_map = {
    'mipmap-mdpi': 72,
    'mipmap-hdpi': 96,
    'mipmap-xhdpi': 128,
    'mipmap-xxhdpi': 192,
    'mipmap-xxxhdpi': 256,
}

# Source files we have
source_files = {
    72: 'icon-72.png',
    96: 'icon-96.png', 
    128: 'icon-128.png',
    144: 'icon-144.png',
    152: 'icon-152.png',
    192: 'icon-192.png',
    384: 'icon-384.png',
    512: 'icon-512.png',
}

for folder, target_size in density_map.items():
    dst_dir = os.path.join(res_dir, folder)
    os.makedirs(dst_dir, exist_ok=True)
    
    # Find the closest source size >= target size
    best_size = min([s for s in source_files.keys() if s >= target_size] or [512])
    src = os.path.join(icon_dir, source_files[best_size])
    
    if not os.path.exists(src):
        print(f'Warning: {src} not found, skipping {folder}')
        continue
    
    # Copy as ic_launcher_foreground.png (for adaptive icon)
    dst = os.path.join(dst_dir, 'ic_launcher_foreground.png')
    shutil.copy2(src, dst)
    
    # Also copy as ic_launcher.png (legacy fallback)
    dst_legacy = os.path.join(dst_dir, 'ic_launcher.png')
    shutil.copy2(src, dst_legacy)
    
    print(f'{folder}: {best_size}px -> {target_size}px zone ({os.path.getsize(src)} bytes)')

# Create adaptive icon XML files
anydpi_dir = os.path.join(res_dir, 'mipmap-anydpi-v26')
os.makedirs(anydpi_dir, exist_ok=True)

# Create ic_launcher.xml
with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n')
    f.write('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n')
    f.write('    <background android:drawable="@color/ic_launcher_background"/>\n')
    f.write('    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n')
    f.write('</adaptive-icon>\n')

# Create ic_launcher_round.xml (same content)
with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n')
    f.write('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n')
    f.write('    <background android:drawable="@color/ic_launcher_background"/>\n')
    f.write('    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n')
    f.write('</adaptive-icon>\n')

# Create background color resource
values_dir = os.path.join(res_dir, 'values')
os.makedirs(values_dir, exist_ok=True)
with open(os.path.join(values_dir, 'ic_launcher_background.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n')
    f.write('<resources>\n')
    f.write('    <color name="ic_launcher_background">#000000</color>\n')
    f.write('</resources>\n')

print('Icons installed successfully!')
