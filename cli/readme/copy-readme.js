const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../README.md');
const destination = path.resolve(__dirname, '../../packages/ecs/README.md');

fs.copyFile(source, destination, (err) => {
  if (err) {
    console.error('Error copying README.md:', err);
    process.exit(1);
  } else {
    console.log('README.md copied successfully.');
  }
});
