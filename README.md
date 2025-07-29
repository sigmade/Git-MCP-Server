# Simple Merge Review MCP

A lightweight MCP server for quick Git merge analysis. Shows only essential information without complex conflict checks.

## 🚀 Features

- **Quick Merge Overview** - core change statistics
- **Changed Files List** - what will be affected by merge
- **Simple Statistics** - number of commits, lines, files

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd local-merge-review-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## 🛠️ Just 2 Simple Tools

### 1. `show_merge_diff`
Show changes between branches before merge.

```javascript
await mcp.call_tool("show_merge_diff", {
  repoPath: "/path/to/your/repo",
  fromBranch: "main", // optional, defaults to main
  toBranch: "feature/new-feature" // optional, defaults to current
});
```

**Result:**
```json
{
  "sourceBranch": "main",
  "targetBranch": "feature/new-feature", 
  "filesChanged": ["src/component.js", "package.json", "README.md"],
  "insertions": 45,
  "deletions": 12,
  "commits": 3,
  "summary": "3 commits, 3 files, +45/-12 lines"
}
```

### 2. `quick_merge_summary`
Quick merge change summary.

```javascript
await mcp.call_tool("quick_merge_summary", {
  repoPath: "/path/to/your/repo",
  branch: "feature/auth" // optional, defaults to current
});
```

**Result:**
```json
{
  "currentBranch": "feature/auth",
  "baseBranch": "main",
  "message": "5 commits ahead",
  "aheadBy": 5,
  "behindBy": 0,
  "needsMerge": true
}
```

## 📋 Common Use Cases

### Quick Pre-merge Check
```bash
"Show changes in feature/payment branch compared to main"
# show_merge_diff
```

### Branch Status Check
```bash
"How many commits ahead is the current branch?"
# quick_merge_summary
```

### Understanding Change Scope
```bash
"How many files will change after merging this branch?"
# show_merge_diff + file list analysis
```

## 📝 Usage with Claude Example

```
"Show changes between main and feature/auth in /home/user/myproject"

"How many commits ahead is current branch from main?"

"Which files will change after merge?"
```

## ⚡ Why Simple is Better

- **Fast** - no complex conflict checks
- **Clear** - only essential information
- **Reliable** - minimal dependencies
- **Practical** - covers 90% of use cases

By default, conflicts are not expected, so complex checks are unnecessary. This MCP shows only what's truly important before merging.

## ⚠️ Requirements

- **Git** installed and available in PATH
- **Node.js** >= 18.0.0

## 🚧 Easy to Add Features

- Format handling for specific files (.js, .py, etc)
- Package.json version integration
- Basic metrics (lines of code, comments)
- Export to various formats