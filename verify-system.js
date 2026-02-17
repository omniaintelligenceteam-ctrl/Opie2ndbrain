#!/usr/bin/env node

/**
 * Simple verification script for the Content Creation System
 * Checks if all files exist and have correct structure
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  'src/lib/contentCreation.ts',
  'src/app/api/content-dashboard/create/route.ts',
  'src/app/api/content-dashboard/assets/[id]/regenerate/route.ts',
  'src/app/api/content-dashboard/complete/route.ts',
  'supabase/migrations/20260217_add_versioning.sql'
];

function checkFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Missing: ${filePath}`);
    return false;
  }
  
  const stats = fs.statSync(fullPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`✅ Found: ${filePath} (${sizeKB}KB)`);
  return true;
}

function checkFunctionExists(filePath, functionName) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(`export async function ${functionName}`) || 
      content.includes(`export function ${functionName}`) ||
      content.includes(`async function ${functionName}`) ||
      content.includes(`function ${functionName}`)) {
    console.log(`  ✅ Function: ${functionName}`);
    return true;
  }
  
  console.log(`  ❌ Missing function: ${functionName}`);
  return false;
}

function verifyContentCreationLib() {
  console.log('\n📚 Checking contentCreation.ts functions:');
  const filePath = 'src/lib/contentCreation.ts';
  
  const functions = [
    'createContentBundle',
    'processAgentCompletion', 
    'regenerateAsset',
    'getBundleWithAssets',
    'updateAssetStatus',
    'getContentBundles'
  ];
  
  functions.forEach(fn => checkFunctionExists(filePath, fn));
}

function verifyAPIRoutes() {
  console.log('\n🌐 Checking API routes:');
  
  const routes = [
    { file: 'src/app/api/content-dashboard/create/route.ts', methods: ['POST', 'GET'] },
    { file: 'src/app/api/content-dashboard/assets/[id]/regenerate/route.ts', methods: ['POST', 'GET'] },
    { file: 'src/app/api/content-dashboard/complete/route.ts', methods: ['POST', 'GET'] }
  ];
  
  routes.forEach(({ file, methods }) => {
    if (checkFile(file)) {
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
      methods.forEach(method => {
        if (content.includes(`export async function ${method}`)) {
          console.log(`    ✅ ${method} endpoint`);
        } else {
          console.log(`    ❌ Missing ${method} endpoint`);
        }
      });
    }
  });
}

function verifyDatabase() {
  console.log('\n🗃️  Checking database migration:');
  const migrationFile = 'supabase/migrations/20260217_add_versioning.sql';
  
  if (checkFile(migrationFile)) {
    const content = fs.readFileSync(path.join(__dirname, migrationFile), 'utf8');
    if (content.includes('ADD COLUMN IF NOT EXISTS version')) {
      console.log('  ✅ Version column addition');
    } else {
      console.log('  ❌ Missing version column addition');
    }
  }
}

function verifyAgentPrompts() {
  console.log('\n🤖 Checking agent prompts:');
  const filePath = path.join(__dirname, 'src/lib/contentCreation.ts');
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const agents = ['email_agent', 'linkedin_agent', 'instagram_agent', 'video_agent', 'hooks_agent', 'image_agent'];
    
    agents.forEach(agent => {
      if (content.includes(`${agent}:`)) {
        console.log(`  ✅ ${agent} prompt`);
      } else {
        console.log(`  ❌ Missing ${agent} prompt`);
      }
    });
  }
}

function main() {
  console.log('🔍 Content Creation System Verification');
  console.log('========================================');
  
  console.log('\n📄 Checking required files:');
  let allFilesExist = true;
  REQUIRED_FILES.forEach(file => {
    if (!checkFile(file)) {
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    verifyContentCreationLib();
    verifyAPIRoutes();
    verifyDatabase();
    verifyAgentPrompts();
    
    console.log('\n🎉 System verification complete!');
    console.log('\nNext steps:');
    console.log('1. Run database migration: supabase db push');
    console.log('2. Start development server: npm run dev');
    console.log('3. Test with: POST /api/content-dashboard/create');
    console.log('\n📖 See CONTENT_CREATION_SYSTEM.md for full documentation');
  } else {
    console.log('\n❌ Some files are missing. Please check the setup.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}