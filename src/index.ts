import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import { GitUtils } from './gitUtils.js';

class SimpleMergeReviewMCP {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'simple-merge-review',
      version: '1.0.0',
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'show_merge_diff',
            description: 'Show changes between branches before merge',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository',
                },
                fromBranch: {
                  type: 'string',
                  description: 'Branch to merge from (default: main)',
                  default: 'main',
                },
                toBranch: {
                  type: 'string',
                  description: 'Branch to merge into (default: current)',
                },
              },
              required: ['repoPath'],
            },
          },
          {
            name: 'quick_merge_summary',
            description: 'Quick summary of changes for merge',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository',
                },
                branch: {
                  type: 'string',
                  description: 'Branch to analyze (default: current)',
                },
              },
              required: ['repoPath'],
            },
          },
          {
            name: 'show_file_diff',
            description: 'Show specific changes in a file between branches',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository',
                },
                filename: {
                  type: 'string',
                  description: 'Path to the file relative to the repository root',
                },
                fromBranch: {
                  type: 'string',
                  description: 'Branch to compare from (default: main/master)',
                },
                toBranch: {
                  type: 'string',
                  description: 'Branch to compare to (default: current)',
                },
              },
              required: ['repoPath', 'filename'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'show_merge_diff':
            return await this.showMergeDiff(args);
          case 'quick_merge_summary':
            return await this.quickMergeSummary(args);
          case 'show_file_diff':
            return await this.showFileDiff(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Error: ${(error as Error).message}`);
      }
    });
  }

  private async showMergeDiff(args: any) {
    const { repoPath, fromBranch = 'main', toBranch } = args;
    
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository not found: ${repoPath}`);
    }

    const currentBranch = toBranch || GitUtils.getCurrentBranch(repoPath);
    const mergeInfo = GitUtils.getMergeInfo(repoPath, fromBranch, currentBranch);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mergeInfo, null, 2),
        },
      ],
    };
  }

  private async quickMergeSummary(args: any) {
    const { repoPath, branch } = args;
    
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository not found: ${repoPath}`);
    }

    const currentBranch = branch || GitUtils.getCurrentBranch(repoPath);
    const mainBranch = GitUtils.getMainBranch(repoPath);
    
    // Simple summary of changes
    const summary = {
      currentBranch,
      baseBranch: mainBranch,
      ...GitUtils.getQuickStats(repoPath, mainBranch, currentBranch),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async showFileDiff(args: any) {
    const { repoPath, filename, fromBranch, toBranch } = args;
    
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository not found: ${repoPath}`);
    }

    // Determine branches
    const sourceBranch = fromBranch || GitUtils.getMainBranch(repoPath);
    const targetBranch = toBranch || GitUtils.getCurrentBranch(repoPath);

    // Get diff for the specific file
    const diffOutput = GitUtils.getFileDiff(repoPath, filename, sourceBranch, targetBranch);
    
    // Parse diff for more readable output
    const parsedDiff = this.parseFileDiff(diffOutput);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            filename,
            fromBranch: sourceBranch,
            toBranch: targetBranch,
            ...parsedDiff,
            rawDiff: diffOutput.split('\n').slice(0, 100), // Limit the number of lines
          }, null, 2),
        },
      ],
    };
  }

  private parseFileDiff(diffOutput: string): { hasChanges: boolean; additions: string[]; deletions: string[]; summary: string } {
    const lines = diffOutput.split('\n');
    const additions: string[] = [];
    const deletions: string[] = [];
    
    let addedLines = 0;
    let deletedLines = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions.push(line.substring(1)); // Remove the + sign
        addedLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions.push(line.substring(1)); // Remove the - sign
        deletedLines++;
      }
    }

    const hasChanges = addedLines > 0 || deletedLines > 0;
    const summary = hasChanges 
      ? `+${addedLines} lines, -${deletedLines} lines`
      : 'No changes in the file';

    return {
      hasChanges,
      additions: additions.slice(0, 50), // Limit output
      deletions: deletions.slice(0, 50),
      summary,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple Merge Review MCP running');
  }
}

// Start
const server = new SimpleMergeReviewMCP();
server.run().catch(console.error);