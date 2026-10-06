import { spawn } from 'node:child_process';

const children = [
    spawn(process.execPath, ['node_modules/@nestjs/cli/bin/nest.js', 'start', '--watch'], { cwd: 'apps/api', stdio: 'inherit' }),
    spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev'], { cwd: 'apps/web', stdio: 'inherit' }),
];

let stopping = false;
function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
        if (child.exitCode === null) child.kill('SIGTERM');
    }
    process.exitCode = code;
}

for (const child of children) {
    child.on('error', (error) => {
        console.error(`No se pudo iniciar uno de los procesos: ${error.message}`);
        stop(1);
    });
    child.on('exit', (code, signal) => {
        if (!stopping) {
            console.log(`Un proceso terminó${signal ? ` (${signal})` : ` con código ${code ?? 0}`}; deteniendo el otro.`);
            stop(code ?? 1);
        }
    });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
