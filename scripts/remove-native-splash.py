#!/usr/bin/env python3
"""Remove Android native splash screen entirely."""
import os

res_dir = 'android/app/src/main/res'

# 1. Set styles.xml theme to NoActionBar
styles_path = os.path.join(res_dir, 'values/styles.xml')
if os.path.exists(styles_path):
    with open(styles_path) as f:
        c = f.read()
    # Replace any parent theme that shows a splash
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    c = c.replace('Theme.AppCompat.Light', 'Theme.AppCompat.NoActionBar')
    c = c.replace('Theme.MaterialComponents', 'Theme.AppCompat.NoActionBar')
    with open(styles_path, 'w') as f:
        f.write(c)
    print(f'Fixed: {styles_path}')
else:
    os.makedirs(os.path.dirname(styles_path), exist_ok=True)
    with open(styles_path, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">\n')
        f.write('    </style>\n')
        f.write('</resources>\n')
    print(f'Created: {styles_path}')

# 2. Check for themes.xml (newer Android)  
themes_path = os.path.join(res_dir, 'values/themes.xml')
if os.path.exists(themes_path):
    with open(themes_path) as f:
        c = f.read()
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    with open(themes_path, 'w') as f:
        f.write(c)
    print(f'Fixed: {themes_path}')

# 3. Remove any splash-specific drawables
for root, dirs, files in os.walk(res_dir):
    for f in files:
        if 'splash' in f.lower() and (f.endswith('.xml') or f.endswith('.png')):
            path = os.path.join(root, f)
            os.remove(path)
            print(f'Removed: {path}')

# 4. Remove splash from strings.xml  
strings_path = os.path.join(res_dir, 'values/strings.xml')
if os.path.exists(strings_path):
    with open(strings_path) as f:
        c = f.read()
    if 'splash' in c.lower():
        c = c.replace('splash', '').replace('Splash', '')
        with open(strings_path, 'w') as f:
            f.write(c)
        print(f'Cleaned: {strings_path}')

print('✅ Native splash fully removed!')
