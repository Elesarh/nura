#!/usr/bin/env python3
"""Fix Android build.gradle - Kotlin resolution + signing config ONLY."""
import os

with open('android/app/build.gradle') as f:
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

with open('android/app/build.gradle', 'w') as f:
    f.write(content)

print('Fixed build.gradle (signing + Kotlin)')
