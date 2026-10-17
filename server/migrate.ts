import { loadConfig } from './config.js';
import { createDatabase } from './database.js';

const config = loadConfig();
const database = createDatabase(config.dataDir);
database.sqlite.close();
console.log('Database migration complete.');
