
import cairosvg, os
icon_dir = "/tmp/esha_project/public/icons"
svg_path = os.path.join(icon_dir, "icon.svg")

# Generate all android mipmap sizes plus web sizes
sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for dirname, size in sizes.items():
    out_path = os.path.join(icon_dir, f"{dirname}-foreground.png")
    cairosvg.svg2png(url=svg_path, write_to=out_path, output_width=size, output_height=size)
    print(f"Created {dirname}-foreground.png ({size}x{size})")

# Also recreate web icons with the new design
web_sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for s in web_sizes:
    out_path = os.path.join(icon_dir, f"icon-{s}.png")
    cairosvg.svg2png(url=svg_path, write_to=out_path, output_width=s, output_height=s)
    print(f"icon-{s}.png ({s}x{s})")
