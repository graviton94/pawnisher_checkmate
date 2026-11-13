import { climbSample } from '../src/sim/climb-sample';
import type { RunBuild, RunStyle } from '../src/sim/runbot';

const style = (process.env.CL_STYLE ?? 'greedy') as RunStyle;
const build = (process.env.CL_BUILD ?? 'neutral') as RunBuild;
const pool = (process.env.CL_POOL ?? 'all') as 'all' | 'starter';
const persona = (process.env.CL_PERSONA ?? 'standard') as 'standard' | 'risky' | 'hoarder';
const asc = Number(process.env.CL_ASC ?? 0), n = Number(process.env.CL_N ?? 25), off = Number(process.env.CL_OFF ?? 0);
for (let i = 0; i < n; i++) process.stdout.write(`CLIMB ${JSON.stringify(climbSample(70000 + off + i, asc, style, build, pool, persona, Number(process.env.CL_TEMP ?? 0)))}\n`);
