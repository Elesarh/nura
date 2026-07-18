#!/usr/bin/env python3
"""Disable native Android SplashScreen by modifying styles.xml."""
import os
import shutil

styles_path = 'android/app/src/main/res/values/styles.xml'

if os.path.exists(styles_path):
    with open(styles_path) as f:
        content = f.read()
    
    # Replace any SplashScreen theme with basic AppCompat
    content = content.replace(
        'android:theme="@style/AppTheme.NoActionBar"',
        'android:theme="@style/Theme.AppCompat.NoActionBar"'
    )
    content = content.replace(
        'Theme.AppCompat.Light',
        'Theme.AppCompat.NoActionBar'
    )
    
    with open(styles_path, 'w') as f:
        f.write(content)
    print(f'Fixed styles.xml: {styles_path}')
else:
    print(f'styles.xml not found, creating default')
    os.makedirs(os.path.dirname(styles_path), exist_ok=True)
    with open(styles_path, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">\n')
        f.write('    </style>\n')
        f.write('</resources>\n')

# Also check strings.xml for app_name
strings_path = 'android/app/src/main/res/values/strings.xml'
if os.path.exists(strings_path):
    with open(strings_path) as f:
        content = f.read()
    if 'splash' in content.lower():
        content = content.replace('splash', '').replace('Splash', '')
        with open(strings_path, 'w') as f:
            f.write(content)
        print('Cleaned splash references from strings.xml')

print('Native splash disabled!')
