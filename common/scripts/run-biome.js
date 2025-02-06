const { execSync } = require("child_process");

const args = process.argv.slice(2);
const pathIndex = args.indexOf("--path");
let path = ".";

if (pathIndex !== -1 && args.length > pathIndex + 1) {
  path = args[pathIndex + 1];
}

const filteredArgs = args.filter(
  (arg, index) => index !== pathIndex && index !== pathIndex + 1
);

const command = `pnpm biome check ${path} ${filteredArgs.join(" ")}`.trim();

try {
  execSync(command, { stdio: "inherit", shell: true });
} catch (error) {
  process.exit(1);
}
