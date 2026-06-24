import os

path = r"c:\Users\IRC009\Desktop\webexplorapp\dashboard-cliente\src\pages\Promotions\PromotionsManager.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = '<option value="ALL">Todas las sedes (General)</option>'

if target in content:
    content = content.replace(target, "")
    print("ALL option removed from PromotionsManager successfully!")
else:
    import re
    cleaned, count = re.subn(r'\s*<option value="ALL">Todas las sedes \(General\)</option>\s*', '\r\n', content)
    if count > 0:
        content = cleaned
        print("ALL option removed from PromotionsManager with regex successfully!")
    else:
        print("Target not found in PromotionsManager!")

# Also fix the default value fallback of the select element from || 'ALL' to || ''
content = content.replace("value={popupState.formData.branchId || 'ALL'}", "value={popupState.formData.branchId || ''}")

with open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
