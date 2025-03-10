// Save this as a script file in your project root (note the .mjs extension)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function searchFiles(dir, searchString) {
  const results = [];
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      // Recursively search subdirectories
      results.push(...searchFiles(filePath, searchString));
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      // Read file content and search for the string
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(searchString)) {
        results.push({
          file: filePath,
          content: content
        });
      }
    }
  }
  
  return results;
}

// Search for direct cookie access starting from the project root directory
const results = searchFiles(__dirname, 'cookies().get');

console.log(`Found ${results.length} files with direct cookie access:`);
results.forEach(result => {
  console.log(`\nFile: ${result.file}`);
  
  // Extract lines containing the search string
  const lines = result.content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('cookies().get')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
});

