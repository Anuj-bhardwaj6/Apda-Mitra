const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.join(projectRoot, 'backend');
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

// Find Python binary: preference given to virtual environment
function getPythonBinary() {
  const isWindows = process.platform === 'win32';
  const venvPaths = [
    path.join(backendDir, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    path.join(backendDir, 'venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    path.join(projectRoot, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    path.join(projectRoot, 'venv', isWindows ? 'Scripts\\python.exe' : 'bin/python')
  ];

  for (const p of venvPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return isWindows ? 'python' : 'python3';
}

const pythonBin = getPythonBinary();
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '   🚀 Starting Apda Mitra Unified Full-Stack Server');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[32m[Backend]\x1b[0m  FastAPI starting on http://localhost:8000`);
console.log(`\x1b[32m[Backend]\x1b[0m  Python binary: ${pythonBin}`);
console.log(`\x1b[35m[Frontend]\x1b[0m Next.js starting on http://localhost:3000`);
console.log('\x1b[36m%s\x1b[0m', '───────────────────────────────────────────────────────────────');

// Start Backend Process
const backendProcess = spawn(pythonBin, ['run.py'], {
  cwd: backendDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false,
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

backendProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`\x1b[32m[BACKEND]\x1b[0m ${line}`);
    }
  });
});

backendProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.error(`\x1b[33m[BACKEND]\x1b[0m ${line}`);
    }
  });
});

backendProcess.on('error', (err) => {
  console.error(`\x1b[31m[BACKEND ERROR]\x1b[0m Failed to start backend: ${err.message}`);
});

// Start Frontend Process directly with node.exe
const frontendProcess = spawn(process.execPath, [nextBin, 'dev', '-p', '3000'], {
  cwd: projectRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false
});

frontendProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`\x1b[35m[FRONTEND]\x1b[0m ${line}`);
    }
  });
});

frontendProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.error(`\x1b[31m[FRONTEND]\x1b[0m ${line}`);
    }
  });
});

frontendProcess.on('error', (err) => {
  console.error(`\x1b[31m[FRONTEND ERROR]\x1b[0m Failed to start frontend: ${err.message}`);
});

// Clean termination handling
function cleanExit() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down Apda Mitra servers...');
  try {
    if (process.platform === 'win32') {
      if (backendProcess && backendProcess.pid) spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      if (frontendProcess && frontendProcess.pid) spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
    } else {
      if (backendProcess && backendProcess.pid) backendProcess.kill('SIGTERM');
      if (frontendProcess && frontendProcess.pid) frontendProcess.kill('SIGTERM');
    }
  } catch (err) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

backendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.log(`\x1b[31m[BACKEND] Process exited with code ${code}\x1b[0m`);
  }
});

frontendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.log(`\x1b[31m[FRONTEND] Process exited with code ${code}\x1b[0m`);
  }
});
