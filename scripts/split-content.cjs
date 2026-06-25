const fs = require("fs");

const mainPath = "src/main.js";
let source = fs.readFileSync(mainPath, "utf8");

function extractConst(name, opener, outputPath) {
  const prefix = `const ${name} = ${opener}`;
  const start = source.indexOf(prefix);
  if (start < 0) {
    throw new Error(`Could not find ${name}`);
  }

  let index = start + `const ${name} = `.length;
  let depth = 0;
  let stringQuote = null;
  let escaped = false;

  for (; index < source.length; index += 1) {
    const char = source[index];

    if (stringQuote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      stringQuote = char;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
    }

    if (depth === 0 && source[index + 1] === ";") {
      index += 2;
      break;
    }
  }

  const block = source.slice(start, index);
  source = source.slice(0, start) + source.slice(index).replace(/^\r?\n/, "");
  fs.writeFileSync(outputPath, `export ${block}\n`, "utf8");
}

extractConst("music", "{", "src/engine/audio/music-data.js");
extractConst("levels", "[", "src/games/kaninkapina/content/levels.js");
extractConst("saveKeys", "{", "src/engine/core/save-keys.js");
extractConst("rabbitStyles", "{", "src/games/kaninkapina/content/rabbits.js");
extractConst("editorPresets", "{", "src/engine/editor/editor-presets.js");

const imports = [
  "import { music } from \"./engine/audio/music-data.js\";",
  "import { saveKeys } from \"./engine/core/save-keys.js\";",
  "import { editorPresets } from \"./engine/editor/editor-presets.js\";",
  "import { levels } from \"./games/kaninkapina/content/levels.js\";",
  "import { rabbitStyles } from \"./games/kaninkapina/content/rabbits.js\";",
  "",
].join("\n");

fs.writeFileSync(mainPath, imports + source, "utf8");
fs.writeFileSync(
  "src/games/kaninkapina/content/index.js",
  "export { levels } from \"./levels.js\";\nexport { rabbitStyles } from \"./rabbits.js\";\n",
  "utf8",
);
