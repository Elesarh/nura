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

# Add Kotlin resolution strategy
resolution = """

configurations.all {
    resolutionStrategy {
        force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.22'
    }
}
"""
content += resolution

# Add signing config INSIDE android block
signing = """    signingConfigs {
        debug {
            storeFile file('../../keystore/nura-debug.keystore')
            storePassword 'nura123'
            keyAlias 'nura'
            keyPassword 'nura123'
        }
    }
"""
content = content.replace('android {', 'android {\n' + signing, 1)

with open(GRADLE_FILE, 'w') as f:
    f.write(content)

print(f'Fixed {GRADLE_FILE}')
print('Added: signingConfigs + resolutionStrategy')
