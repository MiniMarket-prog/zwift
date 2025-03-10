import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define patterns to search for
const patterns = [
  {
    search: /import\s+{\s*createClientComponentClient\s*}\s+from\s+['"]@supabase\/auth-helpers-nextjs['"]/g,
    replace: `import { createClient } from "@/lib/supabase-client"`
  },
  {
    search: /import\s+{\s*createServerComponentClient\s*}\s+from\s+['"]@supabase\/auth-helpers-nextjs['"]/g,
    replace: `import { createServerSupabaseClient } from "@/lib/supabase-server"`
  },
  {
    search: /import\s+.*{\s*User\s*}\s+from\s+['"]@supabase\/auth-helpers-nextjs['"]/g,
    replace: `import type { User } from "@supabase/supabase-js"`
  },
  {
    search: /const\s+supabase\s*=\s*createClientComponentClient[<\w+>]*$$$$/g,
    replace: `const supabase = createClient()`
  },
  {
    search: /const\s+supabase\s*=\s*createClientComponentClient[<\w+>]*$$\{\s*cookies\s*\}$$/g,
    replace: `const supabase = createClient()`
  },
  {
    search: /const\s+supabase\s*=\s*createServerComponentClient[<\w+>]*$$\{\s*cookies\s*\}$$/g,
    replace: `const supabase = await createServerSupabaseClient()`
  },
  {
    search: /const\s+supabase\s*=\s*createServerComponentClient[<\w+>]*$$\{\s*cookies:\s*\($$\s*=>\s*cookies$$$$\s*\}\)/g,
    replace: `const supabase = await createServerSupabaseClient()`
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    for (const pattern of patterns) {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return 0;
  }
}

function searchFiles(dir) {
  let updatedCount = 0;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      // Recursively search subdirectories
      updatedCount += searchFiles(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      // Update file if it matches the patterns
      updatedCount += updateFile(filePath);
    }
  }
  
  return updatedCount;
}

// Start the search from the project root
const updatedCount = searchFiles(path.join(__dirname));
console.log(`Updated ${updatedCount} files.`);

