import re

with open("src/lib/db/index.ts", "r") as f:
    content = f.read()

# Fix the placement
content = content.replace("  }\n    this.version(4)", "    this.version(4)")
content = content.replace("      });\n    });\n}\n\nexport const db = new DevPilotDB();", "      });\n    });\n  }\n}\n\nexport const db = new DevPilotDB();")

with open("src/lib/db/index.ts", "w") as f:
    f.write(content)
