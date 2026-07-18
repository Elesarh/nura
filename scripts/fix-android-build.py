#!/usr/bin/env python3
"""Fix Android build.gradle - Kotlin resolution + signing config + theme."""
import os

GRADLE_FILE = 'android/app/build.gradle'
STYLES_FILE = 'android/app/src/main/res/values/styles.xml'

# --- Fix Gradle ---
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

# --- Fix theme ---
if os.path.exists(STYLES_FILE):
    with open(STYLES_FILE) as f:
        c = f.read()
    c = c.replace('Theme.AppCompat.Light', 'Theme.AppCompat.NoActionBar')
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    if 'android:windowBackground' not in c:
        c = c.replace('</style>', '    <item name="android:windowBackground">@null</item>\n    </style>')
    with open(STYLES_FILE, 'w') as f:
        f.write(c)
    print(f'Theme: {STYLES_FILE} fixed')
else:
    os.makedirs(os.path.dirname(STYLES_FILE), exist_ok=True)
    with open(STYLES_FILE, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n')
        f.write('    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">\n')
        f.write('        <item name="android:windowBackground">@null</item>\n')
        f.write('    </style>\n</resources>\n')
    print(f'Theme: {STYLES_FILE} created')

print('All fixes applied!')
