import { spawn } from "child_process";

function run(name, command, args) {
  const proc = spawn(command, args, {
    stdio: "inherit",
    shell: true, // Important for Git Bash and PowerShell
    env: { ...process.env, NODE_ENV: "development" },
  });

  proc.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });
}

run("backend", "npm", ["run", "backend"]);
