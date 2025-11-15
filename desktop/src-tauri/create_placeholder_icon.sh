#!/bin/bash
# Create a simple placeholder icon using sips (macOS built-in)
# This creates a simple colored square as a placeholder

# Create a 512x512 PNG with a simple color
python3 << 'PYTHON'
from PIL import Image, ImageDraw, ImageFont
import os

# Create a simple icon
size = 512
img = Image.new('RGB', (size, size), color='#646cff')
draw = ImageDraw.Draw(img)

# Draw a simple "C" for Creeper
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 300)
except:
    font = ImageFont.load_default()

# Center the text
text = "C"
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = (size - text_width) / 2
y = (size - text_height) / 2

draw.text((x, y), text, fill='white', font=font)

# Save as 512x512
img.save('icons/icon.png')

# Create required sizes
sizes = [32, 128, 256, 512]
for s in sizes:
    resized = img.resize((s, s), Image.Resampling.LANCZOS)
    resized.save(f'icons/{s}x{s}.png')
    if s == 128:
        resized.save('icons/128x128@2x.png')

print("Icons created successfully")
PYTHON
