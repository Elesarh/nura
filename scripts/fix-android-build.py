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

content = content.replace('android {', 'android {\n' + signing, 1)

# Find debug buildType and add signing config
# Look for "debug {" inside a buildTypes block
build_types_pattern = r'(buildTypes\s*\{[^}]*debug\s*\{)'
match = re.search(build_types_pattern, content, re.DOTALL)
if match:
    # Add signing config reference inside debug block
    debug_block_end = match.end()
    # Check if signingConfig already set
    if 'signingConfig signingConfigs.debug' not in content:
        # Insert after the debug { opening
        insertion = '\n            signingConfig signingConfigs.debug\n'
        # Find the position of the opening brace of debug block
        debug_start = content.find('debug {', debug_block_end - 50)
        if debug_start == -1:
            debug_start = content.find('debug{', debug_block_end - 50)
        if debug_start != -1:
            brace_pos = content.index('{', debug_start) + 1
            content = content[:brace_pos] + insertion + content[brace_pos:]
            print('Added signingConfig to debug buildType')
        else:
            print('Could not find debug buildType opening brace')
else:
    print('No buildTypes.debug found, adding it')
    # Add buildTypes block with debug signing
    bt_block = (
        '\n    buildTypes {\n'
        '        debug {\n'
        '            signingConfig signingConfigs.debug\n'
        '        }\n'
        '    }\n'
    )
    # Insert before closing of android block
    last_brace = content.rfind('}')
    if last_brace != -1:
        content = content[:last_brace] + bt_block + content[last_brace:]
        print('Added buildTypes block')

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
# Verify
idx_android = content.index('android {')
idx_sc = content.index('signingConfigs')
idx_signing_in_debug = 'signingConfig signingConfigs.debug' in content
print(f'signingConfigs INSIDE android block: {idx_sc > idx_android}')
print(f'signingConfig in buildTypes.debug: {idx_signing_in_debug}')
