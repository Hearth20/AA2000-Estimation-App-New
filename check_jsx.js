import fs from 'fs';
const file = 'src/components/estimation/CreateSurveyForm.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
let openDivs = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  if (lineNum >= 201 && lineNum <= 397) {
    const openDivMatches = line.match(/<div(\s|>|$)/g);
    const closeDivMatches = line.match(/<\/div>/g);

    if (openDivMatches) {
      openDivMatches.forEach(() => openDivs.push(lineNum));
    }
    if (closeDivMatches) {
      closeDivMatches.forEach(() => {
        if (openDivs.length === 0) {
          console.log(`Unmatched closing div at line ${lineNum}`);
        } else {
          openDivs.pop();
        }
      });
    }
  }
}

console.log('Remaining open divs started at lines:', openDivs);
