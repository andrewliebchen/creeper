#!/bin/bash
# Create a simple 32x32 PNG icon
python3 << 'PYTHON'
try:
    from PIL import Image
    img = Image.new('RGB', (32, 32), color='#646cff')
    img.save('icon.png')
    img.save('32x32.png')
    img128 = Image.new('RGB', (128, 128), color='#646cff')
    img128.save('128x128.png')
    print('Created icons with PIL')
except ImportError:
    # Fallback: use sips to convert system icon
    import subprocess
    import os
    system_icon = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns'
    if os.path.exists(system_icon):
        subprocess.run(['sips', '-s', 'format', 'png', '-z', '32', '32', system_icon, '--out', 'icon.png'], check=False)
        subprocess.run(['sips', '-s', 'format', 'png', '-z', '32', '32', system_icon, '--out', '32x32.png'], check=False)
        subprocess.run(['sips', '-s', 'format', 'png', '-z', '128', '128', system_icon, '--out', '128x128.png'], check=False)
        print('Created icons with sips')
    else:
        print('Could not create icons - need PIL or system icon')
PYTHON
