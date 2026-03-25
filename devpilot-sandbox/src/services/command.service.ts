import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export class CommandService {
    private activeProcesses: Map<string, ChildProcess> = new Map();

    /**
     * Automatically detects the project root.
     * Priority: 
     * 1. PROJECT_ROOT env var
     * 2. Upwards search for package.json (non-sandbox)
     * 3. Fallback to 3-4 levels up
     */
    private getProjectRoot(): string {
        if (process.env.PROJECT_ROOT) {
            return path.resolve(process.env.PROJECT_ROOT);
        }

        let current = __dirname;
        const root = path.parse(current).root;

        while (current !== root) {
            const pkgPath = path.join(current, "package.json");
            if (fs.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
                    if (pkg.name !== "devpilot-sandbox") {
                        return current;
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
            current = path.dirname(current);
        }

        // Attempt broader fallback for different environments
        const absoluteCheck = path.resolve(__dirname, "../../..");
        if (fs.existsSync(path.join(absoluteCheck, "package.json"))) {
            return absoluteCheck;
        }

        return path.resolve(__dirname, "../../../.."); // Try one more level if needed
    }

    /**
     * Executes a command in the specified directory.
     */
    async execute(command: string, cwd?: string): Promise<ExecutionResult> {
        const finalCwd = cwd || this.getProjectRoot();

        console.log(`[COMMAND] Executing: "${command}" in ${finalCwd}`);

        try {
            if (!fs.existsSync(finalCwd)) {
                throw new Error(`Current working directory does not exist: ${finalCwd}`);
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
            console.error(`[COMMAND] Failed: "${command}" in ${finalCwd}`);

            // Add directory list to help debugging
            let dirList = "Could not list directory";
            try {
                dirList = fs.readdirSync(path.dirname(finalCwd)).join(", ");
            } catch (e) { }

            return {
                stdout: error.stdout || "",
                stderr: `${error.stderr || error.message}\n[DEBUG] finalCwd: ${finalCwd}\n[DEBUG] Parent contains: ${dirList}`,
                exitCode: error.code || 1,
            };
        }
    }

    /**
     * Starts a command in the background.
     */
    async startBackground(id: string, command: string, cwd?: string): Promise<void> {
        const finalCwd = cwd || this.getProjectRoot();

        if (this.activeProcesses.has(id)) {
            await this.stopBackground(id);
        }

        console.log(`[COMMAND] Starting background: "${command}" in ${finalCwd} (ID: ${id})`);

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
