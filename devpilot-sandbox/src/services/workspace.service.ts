import path from "path";
import fs from "fs";

export class WorkspaceService {
    private currentRepoPath: string | null = null;
    private currentAppPath: string | null = null;

    /**
     * Resolves and verifies the workspace directory.
     */
    async setupWorkspace(repoPath: string): Promise<{ repoPath: string; appPath: string }> {
        const absoluteRepoPath = path.resolve(repoPath);
        this.currentRepoPath = absoluteRepoPath;

        console.log(`[WORKSPACE] Setting up workspace at: ${absoluteRepoPath}`);

        // 1. Check if it's the root
        if (this.hasPackageJson(absoluteRepoPath)) {
            console.log(`[WORKSPACE] Found package.json in repo root.`);
            this.currentAppPath = absoluteRepoPath;
        } else {
            // 2. Intelligent detection of app directory
            const candidates = ["apps/web", "app", "frontend", "client", "web", "website", "packages/app"];
            let found = false;

            for (const candidate of candidates) {
                const fullPath = path.join(absoluteRepoPath, candidate);
                if (this.hasPackageJson(fullPath)) {
                    console.log(`[WORKSPACE] Detected app in candidate path: ${candidate}`);
                    this.currentAppPath = fullPath;
                    found = true;
                    break;
                }
            }

            // 3. Recursive search (last resort)
            if (!found) {
                const deepMatch = this.findPackageJsonRecursively(absoluteRepoPath, 2);
                if (deepMatch) {
                    console.log(`[WORKSPACE] Found package.json via deep search: ${deepMatch}`);
                    this.currentAppPath = deepMatch;
                    found = true;
                }
            }

            if (!found) {
                console.warn(`[WORKSPACE] WARNING: Could not find package.json anywhere in ${absoluteRepoPath}. Falling back to repo root.`);
                this.currentAppPath = absoluteRepoPath;
            }
        }

        return {
            repoPath: this.currentRepoPath,
            appPath: this.currentAppPath!,
        };
    }

    private hasPackageJson(dir: string): boolean {
        const pkgPath = path.join(dir, "package.json");
        const exists = fs.existsSync(pkgPath);
        if (exists) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                // Avoid detecting the sandbox or other tools as the app
                return pkg.name !== 'devpilot-sandbox';
            } catch (e) {
                return true; // Still exists even if unparseable
            }
        }
        return false;
    }

    private findPackageJsonRecursively(dir: string, maxDepth: number): string | null {
        if (maxDepth < 0) return null;
        if (!fs.existsSync(dir)) return null;

        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    if (this.hasPackageJson(fullPath)) return fullPath;
                    const matched = this.findPackageJsonRecursively(fullPath, maxDepth - 1);
                    if (matched) return matched;
                }
            }
        } catch (e) { }
        return null;
    }

    getRepoPath(): string | null {
        return this.currentRepoPath;
    }

    getAppPath(): string | null {
        return this.currentAppPath;
    }

    getWorkspaceInfo() {
        return {
            repoPath: this.currentRepoPath,
            appPath: this.currentAppPath,
            packageJsonExists: this.currentAppPath ? fs.existsSync(path.join(this.currentAppPath, "package.json")) : false,
        };
    }
}

export const workspaceService = new WorkspaceService();
