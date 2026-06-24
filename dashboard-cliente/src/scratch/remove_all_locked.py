import os

path = r"c:\Users\IRC009\Desktop\webexplorapp\dashboard-cliente\src\components\LockedFeature.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = '<option value="ALL">Todas las sedes (Global)</option>'

if target in content:
    content = content.replace(target, "")
    print("ALL option removed from LockedFeature successfully!")
else:
    import re
    cleaned, count = re.subn(r'\s*<option value="ALL">Todas las sedes \(Global\)</option>\s*', '\r\n', content)
    if count > 0:
        content = cleaned
        print("ALL option removed from LockedFeature with regex successfully!")
    else:
        print("Target not found in LockedFeature!")

with open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
