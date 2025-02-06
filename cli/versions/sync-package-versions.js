const { globSync } = require('glob');
const path = require('path');
const fs = require('fs');
const rootPackageConfig = require('../../package.json');
const prettier = require('prettier');

start().then(() => console.log('Version synchronization ended successfully'));

async function start() {
  // Fetching root version
  const targetVersion = rootPackageConfig.version;
  console.log(`Packages versions synchronization to root: "v${targetVersion}"...`);

  // Gathering workspace data
  const root = path.join(__dirname, '../..');
  const patterns = rootPackageConfig.workspaces.map((ws) => path.join(root, ws, 'package.json').replace(/\\/g, '/'));

  // Searching package files
  console.log('Searching package config files from npm workspaces...');
  const packageFiles = patterns
    .map((pattern) =>
      globSync(pattern, {
        ignore: 'node_modules/**',
      }),
    )
    .flatMap((o) => o)
    .map((o) => o.replace(/\\/g, '/'));

  console.log('Found: ', packageFiles);

  for (const packageConfigFilePath of packageFiles) {
    const packageData = require(packageConfigFilePath);
    console.log(`  - Updating package "${packageData.name}"...`);
    packageData.version = targetVersion;

    updateDependencies('dependencies');
    updateDependencies('devDependencies');
    updateDependencies('peerDependencies');

    const prettierConfig = await prettier.resolveConfig(path.dirname(packageConfigFilePath));
    fs.writeFileSync(
      packageConfigFilePath,
      await prettier.format(JSON.stringify(packageData), {
        ...prettierConfig,
        filepath: packageConfigFilePath,
      }),
    );

    function updateDependencies(section) {
      const dependencies = packageData[section];
      if (!dependencies) return; // No section found
      for (const dependency of Object.keys(packageData[section]).filter((key) => key.startsWith('@bim-ecs/'))) {
        packageData[section][dependency] = targetVersion;
      }
      for (const dependency of Object.keys(packageData[section]).filter((key) => key === 'bim-ecs')) {
        packageData[section][dependency] = targetVersion;
      }
    }
  }
}
