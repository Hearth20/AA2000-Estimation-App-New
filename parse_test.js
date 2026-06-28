import fs from 'fs';
import parser from '@babel/parser';

const file = 'src/components/estimation/CreateSurveyForm.tsx';
const content = fs.readFileSync(file, 'utf8');

try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  console.log('Parse successful!');
} catch (err) {
  console.error('Parser error:', err.message);
  console.error('Error details:', err);
}
