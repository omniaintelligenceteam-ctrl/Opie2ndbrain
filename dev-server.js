process.chdir(__dirname);
process.argv = [process.argv[0], 'dev', '--port', '3001'];
require('./node_modules/next/dist/bin/next');
