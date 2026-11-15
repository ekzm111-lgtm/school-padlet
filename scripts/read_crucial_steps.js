const fs = require('fs');

const steps = ['1855', '2251', '1062', '1179', '1320', '1355'];

for (const s of steps) {
  const p = `C:/Users/User/.gemini/antigravity/brain/624aeb15-129a-4170-91b6-183884e84e05/.system_generated/steps/${s}/output.txt`;
  if (fs.existsSync(p)) {
    const txt = fs.readFileSync(p, 'utf8');
    console.log(`=== STEP ${s} (size ${txt.length}) ===`);
    console.log(txt.substring(0, 1000));
  }
}
