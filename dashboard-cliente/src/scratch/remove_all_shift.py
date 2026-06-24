import os

path = r"c:\Users\IRC009\Desktop\webexplorapp\dashboard-cliente\src\pages\POS\ShiftHistory.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = '<option value="ALL">📍 Todas las sedes (Global)</option>'

# Remove target option tag (taking care of surrounding spaces if any)
if target in content:
    content = content.replace(target, "")
    print("ALL option removed successfully!")
else:
    # Try normalizing spaces
    import re
    cleaned, count = re.subn(r'\s*<option value="ALL">📍 Todas las sedes \(Global\)</option>\s*', '\r\n', content)
    if count > 0:
        content = cleaned
        print("ALL option removed with regex successfully!")
    else:
        print("Target not found in file!")

with open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
