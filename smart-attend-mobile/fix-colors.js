const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/miche/OneDrive/Desktop/Smart_attendance/smart-attend-mobile/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Colors[scheme]')) {
    content = content.replace(/Colors\[scheme\]/g, "Colors[scheme === 'dark' ? 'dark' : 'light']");
    fs.writeFileSync(file, content);
  }
});
