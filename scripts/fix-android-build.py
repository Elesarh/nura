#!/usr/bin/env python3
"""Fix Android build.gradle for NURA - Kotlin duplicates + signing config."""
import os
import re

GRADLE_FILE = 'android/app/build.gradle'

if not os.path.exists(GRADLE_FILE):
    print(f'File not found: {GRADLE_FILE}')
    exit(0)

with open(GRADLE_FILE, 'r') as f:
    content = f.read()

# Remove any previous signing or kotlin-stdlib-jdk references
content = re.sub(r'.*nura-debug\.keystore.*\n?', '', content)
content = re.sub(r".*nura123.*\n?", '', content)
content = re.sub(r'.*kotlin-stdlib-jdk.*\n?', '', content)

# Inject signing config INSIDE android { block
signing = (
    '    signingConfigs {\n'
    '        debug {\n'
    '            storeFile file(\'../../keystore/nura-debug.keystore\')\n'
    '            storePassword \'nura123\'\n'
    '            keyAlias \'nura\'\n'
    '            keyPassword \'nura123\'\n'
    '        }\n'
    '    }\n\n'
)

# Replace first occurrence of 'android {'
content = content.replace('android {', 'android {\n' + signing, 1)

# Add Kotlin resolution strategy at end
resolution = (
    '\n\nconfigurations.all {\n'
    '    resolutionStrategy {\n'
    "        force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'\n"
    "        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.22'\n"
    "        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.22'\n"
    '    }\n'
    '}\n'
)
content += resolution

with open(GRADLE_FILE, 'w') as f:
    f.write(content)

print(f'Fixed {GRADLE_FILE}')
sc_count = content.count('signingConfigs')
print(f'signingConfigs references: {sc_count}')

idx_android = content.index('android {')
idx_sc = content.index('signingConfigs')
if idx_sc > idx_android:
    print('OK: signingConfigs is INSIDE android block')
else:
    print('WARNING: signingConfigs might be in wrong position')
