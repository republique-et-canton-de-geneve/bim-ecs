/** The extension manifest: generated at build time so its version always follows package.json */
export function createManifest(version: string) {
  return {
    manifest_version: 3,
    name: 'BIM ECS DevTools',
    version,
    description: 'Inspect BIM ECS worlds: systems graph, components, entities and resources.',
    minimum_chrome_version: '111',
    // The panel only evaluates code in the inspected page through the devtools API: no permission required
    devtools_page: 'devtools.html',
  };
}
