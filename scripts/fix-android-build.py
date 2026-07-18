#!/usr/bin/env python3
"""Fix Android build.gradle for NURA + remove native splash."""
import os

GRADLE_FILE = 'android/app/build.gradle'
RES_DIR = 'android/app/src/main/res'

# --- Fix 1: Gradle signing + Kotlin ---
if os.path.exists(GRADLE_FILE):
    with open(GRADLE_FILE) as f:
        content = f.read()

    content += '''

configurations.all {
    resolutionStrategy {
        force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.22'
    }
}
'''

    content = content.replace(
        'android {',
        'android {\n'
        '    signingConfigs {\n'
        '        debug {\n'
        '            storeFile file("../../keystore/nura-debug.keystore")\n'
        '            storePassword "nura123"\n'
        '            keyAlias "nura"\n'
        '            keyPassword "nura123"\n'
        '        }\n'
        '    }\n'
        '\n'
        '    buildTypes {\n'
        '        debug {\n'
        '            signingConfig signingConfigs.debug\n'
        '        }\n'
        '    }\n'
    )

    with open(GRADLE_FILE, 'w') as f:
        f.write(content)
    print(f'Gradle: {GRADLE_FILE} fixed')

# --- Fix 2: Remove native splash (theme background) ---
styles_path = os.path.join(RES_DIR, 'values/styles.xml')
if not os.path.exists(styles_path):
    os.makedirs(os.path.dirname(styles_path), exist_ok=True)
    # Create minimal theme - no splash, dark background
    with open(styles_path, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">\n')
        f.write('        <item name="android:windowBackground">@null</item>\n')
        f.write('        <item name="android:windowIsTranslucent">true</item>\n')
        f.write('    </style>\n')
        f.write('</resources>\n')
    print(f'Created: {styles_path} with transparent bg')
else:
    with open(styles_path) as f:
        c = f.read()
    # Ensure no splash theme
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    c = c.replace('Theme.AppCompat.Light', 'Theme.AppCompat.NoActionBar')
    # Add transparent background
    if 'windowBackground' not in c:
        c = c.replace('</style>', '    <item name="android:windowBackground">@null</item>\n    </style>')
    with open(styles_path, 'w') as f:
        f.write(c)
    print(f'Fixed: {styles_path}')

# --- Fix 3: Remove splash from themes.xml if exists ---
themes_path = os.path.join(RES_DIR, 'values/themes.xml')
if os.path.exists(themes_path):
    with open(themes_path) as f:
        c = f.read()
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    with open(themes_path, 'w') as f:
        f.write(c)
    print(f'Fixed: {themes_path}')

print('✅ All fixes applied - no more native splash!')
