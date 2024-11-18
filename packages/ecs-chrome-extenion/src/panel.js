/* eslint-disable no-undef */
// noinspection JSUnresolvedReference

document.addEventListener('DOMContentLoaded', () => {
  const graphContainer = document.getElementById('graphContainer')
  const resourcesContainer = document.getElementById('resourcesContainer')
  const reloadButton = document.getElementById('reloadButton')

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    useMaxWidth: false,
    securityLevel: 'loose',
    flowchart: {
      wrappingWidth: 500,
    },
    // look: 'handDrawn',
  })

  // Function to fetch and render the Mermaid graph
  function render() {
    chrome.devtools.inspectedWindow.eval(
      'window.__ecs_debug?.data',
      async (data, isException) => {
        const { mermaidGraph, resources } = JSON.parse(data ?? {})
        // graph
        if (isException || !mermaidGraph) {
          graphContainer.innerHTML = 'No graph data available or invalid format.'
        } else {
          const { svg } = await mermaid.render('graphDiv', mermaidGraph)
          graphContainer.innerHTML = svg
        }

        // resources
        resourcesContainer.innerHTML = '';
        try {

          for (const [key, value] of resources ?? []) {
            try {
              const resourceContainerItem = document.createElement('details')
              resourceContainerItem.classList.add('resource')
              const resourceContainerHeader = document.createElement('summary')
              resourceContainerHeader.innerText = key ?? '#no name'

              resourceContainerItem.appendChild(resourceContainerHeader)
              resourceContainerItem.appendChild(generateHtmlForObject(value))

              resourcesContainer.appendChild(resourceContainerItem)
            } catch (e) {
              resourcesContainer.innerHTML += e.toString()
            }
          }
        } catch (e) {
          resourcesContainer.innerHTML += e.toString()
        }
      },
    )
  }

  // Initial render
  render()

  // Reload button handler
  reloadButton.addEventListener('click', () => {
    render()
  })

  // Recursive function to generate foldable HTML for object properties
  function generateHtmlForObject(obj) {
    const container = document.createElement('div');

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'object' && value !== null) {
          // For objects and arrays, use <details> to make them foldable
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.textContent = key;

          details.appendChild(summary);
          details.appendChild(generateHtmlForObject(value));
          container.appendChild(details);
        } else {
          // For primitive types, just display as key: value
          const property = document.createElement('div');
          property.classList.add('property');
          property.textContent = `${key}: ${value}`;
          container.appendChild(property);
        }
      }
    }

    return container;
  }
})
