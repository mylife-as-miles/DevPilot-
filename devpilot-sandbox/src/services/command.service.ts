import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { workspaceService } from "./workspace.service";

const execAsync = promisify(exec);

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export class CommandService {
    private activeProcesses: Map<string, ChildProcess> = new Map();

    /**
     * Resolves the working directory intelligently.
     */
    private async getCwd(): Promise<string> {
        const repoRoot = path.resolve(__dirname, "../../..");
        const { appPath } = await workspaceService.setupWorkspace(repoRoot);
        return appPath;
    }

    /**
     * Executes a command in the resolved workspace.
     */
    async execute(command: string, requestedCwd?: string): Promise<ExecutionResult> {
        const finalCwd = requestedCwd ? path.resolve(requestedCwd) : await this.getCwd();
        const info = workspaceService.getWorkspaceInfo();

        console.log(`\n--- [COMMAND EXECUTION] ---`);
        console.log(`Resolved Repo Path: ${info.repoPath}`);
        console.log(`Resolved App Path:  ${info.appPath}`);
        console.log(`Package.json found: ${info.packageJsonExists}`);
        console.log(`Command:           "${command}"`);
        console.log(`Exact CWD used:     ${finalCwd}`);
        console.log(`---------------------------\n`);

        try {
            if (!fs.existsSync(finalCwd)) {
                throw new Error(`Directory does not exist: ${finalCwd}`);
            }

            // Pre-check for npm commands
            if (command.startsWith("npm") && !fs.existsSync(path.join(finalCwd, "package.json"))) {
                console.warn(`[WARNING] No package.json found in ${finalCwd}. Command might fail.`);
            }

            const { stdout, stderr } = await execAsync(command, {
                cwd: finalCwd,
                env: { ...process.env, CI: "true" },
            });

            return {
                stdout,
                stderr,
                exitCode: 0,
            };
        } catch (error: any) {
            console.error(`[EXECUTION FAILED] "${command}" in ${finalCwd}`);

            let dirList = "n/a";
            try { dirList = fs.readdirSync(finalCwd).slice(0, 10).join(", "); } catch (e) { }

            return {
                stdout: error.stdout || "",
                stderr: `${error.stderr || error.message}\n[DEBUG] finalCwd: ${finalCwd}\n[DEBUG] Files in CWD: ${dirList}`,
                exitCode: error.code || 1,
            };
        }
    }

    /**
     * Starts a command in the background.
     */
    async startBackground(id: string, command: string, requestedCwd?: string): Promise<void> {
        const finalCwd = requestedCwd ? path.resolve(requestedCwd) : await this.getCwd();
        const info = workspaceService.getWorkspaceInfo();

        if (this.activeProcesses.has(id)) {
            await this.stopBackground(id);
        }

        console.log(`\n--- [BACKGROUND PROCESS START] ---`);
        console.log(`ID:                ${id}`);
        console.log(`Resolved Repo Path: ${info.repoPath}`);
        console.log(`Resolved App Path:  ${info.appPath}`);
        console.log(`Command:           "${command}"`);
        console.log(`Exact CWD used:     ${finalCwd}`);
        console.log(`----------------------------------\n`);

        const child = exec(command, {
            cwd: finalCwd,
            env: { ...process.env, CI: "true" },
        });

        child.stdout?.on("data", (data) => console.log(`[${id}] ${data}`));
        child.stderr?.on("data", (data) => console.error(`[${id}] ${data}`));

        this.activeProcesses.set(id, child);
    }

    /**
     * Stops a background command.
     */
    async stopBackground(id: string): Promise<void> {
        const child = this.activeProcesses.get(id);
        if (child) {
            console.log(`[COMMAND] Stopping background ID: ${id}`);
            child.kill();
            this.activeProcesses.delete(id);
        }
    }
}

export const commandService = new CommandService();
