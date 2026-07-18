#!/usr/bin/env python3
"""Replace Capacitor's default light theme with dark transparent one."""
import os

styles_path = 'android/app/src/main/res/values/styles.xml'
if not os.path.exists(styles_path):
    print('No styles.xml found')
    exit(0)

with open(styles_path) as f:
    c = f.read()

# Replace any light/no-actionbar theme with minimal dark theme
old = 'Theme.AppCompat.Light'
new = 'Theme.AppCompat.NoActionBar'
if old in c or 'AppTheme' in c:
    c = c.replace(old, new)
    c = c.replace('SplashScreen', 'Theme.AppCompat.NoActionBar')
    
    # Add transparent window background if not present
    if 'android:windowBackground' not in c:
        c = c.replace('</resources>', 
            '    <item name="android:windowBackground">@null</item>\n'
            '</resources>')
    
    with open(styles_path, 'w') as f:
        f.write(c)
    print(f'Fixed: {styles_path}')
else:
    print(f'Theme already dark in {styles_path}')
