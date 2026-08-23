/**
 * O(n) buildTree algorithm using a Map.
 * Converts a flat array of nodes with `parentId` into a hierarchical tree array.
 * Missing-parent nodes surface as roots to prevent orphan data loss.
 */
function buildTree(flatNodes) {
  if (!Array.isArray(flatNodes) || flatNodes.length === 0) {
    return [];
  }

  const map = new Map();
  const roots = [];

  // Pass 1: Clone nodes to plain objects and store in map
  flatNodes.forEach(item => {
    const nodeObj = item.toObject ? item.toObject() : { ...item };
    nodeObj.children = [];
    map.set(String(nodeObj._id), nodeObj);
  });

  // Pass 2: Link children to parents or surface as roots
  map.forEach(node => {
    if (node.parentId && map.has(String(node.parentId))) {
      const parent = map.get(String(node.parentId));
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Helper to sort children by order ascending
  function sortNodes(nodes) {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    nodes.forEach(n => {
      if (n.children && n.children.length > 0) {
        sortNodes(n.children);
      }
    });
  }

  sortNodes(roots);
  return roots;
}

module.exports = buildTree;
