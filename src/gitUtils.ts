import { execSync } from 'child_process';

export interface MergeInfo {
  sourceBranch: string;
  targetBranch: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
  commits: number;
  summary: string;
}

export class GitUtils {
  static executeGit(command: string, repoPath: string): string {
    try {
      return execSync(command, { cwd: repoPath, encoding: 'utf8' }).toString().trim();
    } catch (error) {
      throw new Error(`Git error: ${(error as Error).message}`);
    }
  }

  static getCurrentBranch(repoPath: string): string {
    return this.executeGit('git branch --show-current', repoPath);
  }

  static getMainBranch(repoPath: string): string {
    try {
      this.executeGit('git show-ref --verify refs/heads/master', repoPath);
      return 'master';
    } catch {
      return 'main';
    }
  }

  static getMergeInfo(repoPath: string, fromBranch: string, toBranch: string): MergeInfo {
    const filesOutput = this.executeGit(
      `git diff --name-only ${fromBranch}..${toBranch}`,
      repoPath
    );
    const filesChanged = filesOutput ? filesOutput.split('\n').filter(f => f.trim()) : [];

    const statsOutput = this.executeGit(
      `git diff --numstat ${fromBranch}..${toBranch}`,
      repoPath
    );
    
    let insertions = 0;
    let deletions = 0;
    
    if (statsOutput) {
      statsOutput.split('\n').forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          insertions += parseInt(parts[0]) || 0;
          deletions += parseInt(parts[1]) || 0;
        }
      });
    }

    const commitsOutput = this.executeGit(
      `git rev-list --count ${fromBranch}..${toBranch}`,
      repoPath
    );
    const commits = parseInt(commitsOutput) || 0;

    const summary = commits === 0
      ? 'No new commits for merge'
      : `${commits} commits, ${filesChanged.length} files, +${insertions}/-${deletions} lines`;

    return {
      sourceBranch: fromBranch,
      targetBranch: toBranch,
      filesChanged,
      insertions,
      deletions,
      commits,
      summary,
    };
  }

  static getQuickStats(repoPath: string, baseBranch: string, currentBranch: string) {
    if (baseBranch === currentBranch) {
      return {
        message: 'Already on the base branch',
        needsMerge: false,
      };
    }

    try {
      const ahead = this.executeGit(
        `git rev-list --count ${baseBranch}..${currentBranch}`,
        repoPath
      );
      
      const behind = this.executeGit(
        `git rev-list --count ${currentBranch}..${baseBranch}`,
        repoPath
      );

      const aheadCount = parseInt(ahead) || 0;
      const behindCount = parseInt(behind) || 0;

      let message = '';
      if (aheadCount === 0 && behindCount === 0) {
        message = 'Branches are synchronized';
      } else if (aheadCount > 0 && behindCount === 0) {
        message = `Ahead by ${aheadCount} commits`;
      } else if (aheadCount === 0 && behindCount > 0) {
        message = `Behind by ${behindCount} commits`;
      } else {
        message = `Ahead by ${aheadCount}, behind by ${behindCount} commits`;
      }

      return {
        message,
        aheadBy: aheadCount,
        behindBy: behindCount,
        needsMerge: aheadCount > 0 || behindCount > 0,
      };
    } catch (error) {
      return {
        message: 'Failed to determine status',
        error: (error as Error).message,
      };
    }
  }

  static getFileDiff(repoPath: string, filename: string, fromBranch: string, toBranch: string): string {
    try {
      return this.executeGit(
        `git diff ${fromBranch}..${toBranch} -- "${filename}"`,
        repoPath
      );
    } catch (error) {
      throw new Error(`Failed to get diff for file ${filename}: ${(error as Error).message}`);
    }
  }
}
