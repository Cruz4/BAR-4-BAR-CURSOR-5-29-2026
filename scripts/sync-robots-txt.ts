import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRobotsTxt } from '../src/lib/robots-content';

const target = join(process.cwd(), 'public', 'robots.txt');
writeFileSync(target, buildRobotsTxt(), 'utf8');
console.log(`wrote ${target}`);
