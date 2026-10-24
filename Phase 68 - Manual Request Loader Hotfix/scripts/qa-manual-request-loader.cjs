// Phase 68 — run inside merged Chef Mujahed codebase: node scripts/qa-manual-request-loader.cjs
// Static regression checks for product loading in manager's internal-order dialog.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dialog = fs.readFileSync(path.join(__dirname,'../src/components/dashboard/ManualRequestDialog.tsx'),'utf8');

assert.match(dialog,/const productsTask=\(async\(\)=>\{/,'productsTask must produce the flattened array of products');
assert.match(dialog,/all\.push\(\.\.\.response\.items\)/,'all product pages should accumulate before the selection UI');
assert.match(dialog,/Promise\.all\(\[customersTask,productsTask\]\)\.then\(\(\[c,allProducts\]\)=>/,'Promise result names must reflect flattened array');
assert.match(dialog,/setProducts\(allProducts\.filter\(item=>item\.channel===type\|\|item\.channel==='BOTH'\)\)/,'manager picker should filter the array by customer channel');
assert.doesNotMatch(dialog,/setProducts\(p\.items\.filter\(/,'do not assume flattened results have an .items property');
assert.match(dialog,/listDashboardProducts\(runtime,\{page,pageSize\}\)/,'must load all pages without an ACTIVE/public filter');
assert.match(dialog,/product\.public_visible===true&&product\.status==='ACTIVE'&&product\.availability==='AVAILABLE'/,'preserve public visibility badge meaning');
assert.match(dialog,/!visible\.length&&!error/,'do not show misleading empty list when loading fails');
console.log('PASS Phase 68: manual request products load all pages and filter the correct array.');
