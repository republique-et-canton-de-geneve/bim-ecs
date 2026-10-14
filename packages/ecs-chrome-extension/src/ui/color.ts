/** Provides a stable color for a name: the same component has the same color in every view */
export function colorOf(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index++) hash = (hash * 31 + name.charCodeAt(index)) >>> 0;

  return `hsl(${hash % 360} 62% 56%)`;
}
