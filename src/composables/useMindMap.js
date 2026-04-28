import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'apple-mind-map-state-v1'

const NODE_WIDTH = 224
const NODE_HEIGHT = 72

const BRANCH_COLORS = [
  {
    bg: '#eff6ff',
    border: '#bfdbfe',
    accent: '#2563eb',
    shadow: 'rgba(37, 99, 235, 0.15)',
  },
  {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    accent: '#16a34a',
    shadow: 'rgba(22, 163, 74, 0.15)',
  },
  {
    bg: '#fff7ed',
    border: '#fed7aa',
    accent: '#ea580c',
    shadow: 'rgba(234, 88, 12, 0.15)',
  },
  {
    bg: '#faf5ff',
    border: '#e9d5ff',
    accent: '#9333ea',
    shadow: 'rgba(147, 51, 234, 0.15)',
  },
  {
    bg: '#f0f9ff',
    border: '#bae6fd',
    accent: '#0284c7',
    shadow: 'rgba(2, 132, 199, 0.15)',
  },
  {
    bg: '#fdf2f8',
    border: '#fbcfe8',
    accent: '#db2777',
    shadow: 'rgba(219, 39, 119, 0.15)',
  },
]

const createNode = (id, text, x, y, incomingDirection = null) => ({
  id,
  text,
  x,
  y,
  incomingDirection,
  pinned: false,
  children: [],
})

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const clone = (value) => JSON.parse(JSON.stringify(value))

const createInitialTree = () => createNode(uid(), 'Start here', 0, 0)

const buildBranchColorMap = (rootNode) => {
  const map = new Map()
  rootNode.children.forEach((child, index) => {
    map.set(child.id, BRANCH_COLORS[index % BRANCH_COLORS.length])
  })
  return map
}

const traverseWithParent = (
  node,
  parentId = null,
  list = [],
  rootId = null,
  branchRootId = null,
  branchColorMap = new Map(),
) => {
  const currentRootId = rootId || node.id
  const currentBranchRootId =
    parentId === null
      ? null
      : parentId === currentRootId
        ? node.id
        : branchRootId
  const color = currentBranchRootId ? branchColorMap.get(currentBranchRootId) || null : null

  list.push({
    id: node.id,
    text: node.text,
    x: node.x,
    y: node.y,
    parentId,
    incomingDirection: node.incomingDirection || null,
    color,
  })

  for (const child of node.children) {
    traverseWithParent(
      child,
      node.id,
      list,
      currentRootId,
      currentBranchRootId,
      branchColorMap,
    )
  }

  return list
}

const findNodeWithParent = (node, targetId, parent = null) => {
  if (!node) return null
  if (node.id === targetId) {
    return { node, parent }
  }

  for (const child of node.children) {
    const result = findNodeWithParent(child, targetId, node)
    if (result) return result
  }

  return null
}

const layoutByDirection = (node, options = {}) => {
  if (!node.children.length) return

  const horizontalGap = 320
  const verticalGap = 220
  const verticalSiblingGap = NODE_HEIGHT + 56
  const horizontalSiblingGap = NODE_WIDTH + 56
  const subtreeWeightGap = 26

  const childrenByDirection = {
    right: [],
    left: [],
    top: [],
    bottom: [],
  }

  for (const child of node.children) {
    const direction = child.incomingDirection || 'right'
    if (!childrenByDirection[direction]) {
      childrenByDirection.right.push(child)
    } else {
      childrenByDirection[direction].push(child)
    }
  }

  const slotSizes = (group, baseGap) =>
    group.map((child) => baseGap + Math.max(0, (child.layoutWeight || 1) - 1) * subtreeWeightGap)

  const distributeSlots = (sizes) => {
    if (!sizes.length) return []
    const total = sizes.reduce((sum, size) => sum + size, 0)
    let cursor = -total / 2
    return sizes.map((size) => {
      const center = cursor + size / 2
      cursor += size
      return center
    })
  }

  const positionGroup = (group, direction, options) => {
    if (!group.length) return

    const siblingGap =
      direction === 'top' || direction === 'bottom' ? horizontalSiblingGap : verticalSiblingGap
    const offsets = distributeSlots(slotSizes(group, siblingGap))
    group.forEach((child, index) => {
      if (options.preservePinned && child.pinned) {
        return
      }
      const spread = offsets[index]
      if (direction === 'right') {
        child.x = node.x + horizontalGap
        child.y = node.y + spread
      } else if (direction === 'left') {
        child.x = node.x - horizontalGap
        child.y = node.y + spread
      } else if (direction === 'top') {
        child.x = node.x + spread
        child.y = node.y - verticalGap
      } else {
        child.x = node.x + spread
        child.y = node.y + verticalGap
      }
    })
  }

  positionGroup(childrenByDirection.right, 'right', options)
  positionGroup(childrenByDirection.left, 'left', options)
  positionGroup(childrenByDirection.top, 'top', options)
  positionGroup(childrenByDirection.bottom, 'bottom', options)

  for (const child of node.children) {
    if (options.preservePinned && child.pinned) {
      continue
    }
    layoutByDirection(child, options)
  }
}

const collectLayoutWeight = (node) => {
  if (!node.children.length) {
    node.layoutWeight = 1
    return node.layoutWeight
  }

  const weight = node.children.reduce((sum, child) => sum + collectLayoutWeight(child), 0)
  node.layoutWeight = Math.max(1, weight)
  return node.layoutWeight
}

const cleanupLayoutWeight = (node) => {
  delete node.layoutWeight
  node.children.forEach(cleanupLayoutWeight)
}

const normalizeNodeState = (node) => {
  if (typeof node.pinned !== 'boolean') {
    node.pinned = false
  }
  if (!Array.isArray(node.children)) {
    node.children = []
  }
  node.children.forEach(normalizeNodeState)
}

const validateNodeShape = (node) => {
  if (!node || typeof node !== 'object') return false
  if (typeof node.id !== 'string' || node.id.trim() === '') return false
  if (typeof node.text !== 'string') return false
  if (typeof node.x !== 'number' || Number.isNaN(node.x)) return false
  if (typeof node.y !== 'number' || Number.isNaN(node.y)) return false
  if (node.incomingDirection !== null && node.incomingDirection !== undefined) {
    const validDirections = ['right', 'left', 'top', 'bottom']
    if (!validDirections.includes(node.incomingDirection)) return false
  }
  if (!Array.isArray(node.children)) return false
  return node.children.every(validateNodeShape)
}

export const useMindMap = () => {
  const root = ref(createInitialTree())
  const selectedNodeId = ref(root.value.id)

  const nodes = computed(() => {
    const colorMap = buildBranchColorMap(root.value)
    return traverseWithParent(root.value, null, [], root.value.id, null, colorMap)
  })

  const edges = computed(() =>
    nodes.value
      .filter((node) => node.parentId)
      .map((node) => ({
        from: node.parentId,
        to: node.id,
        direction: node.incomingDirection || null,
      })),
  )

  const rootId = computed(() => root.value.id)

  const findNode = (id) => findNodeWithParent(root.value, id)

  const setSelectedNode = (id) => {
    selectedNodeId.value = id
  }

  const addChildNode = (input = selectedNodeId.value || root.value.id) => {
    const payload =
      typeof input === 'object' && input !== null ? input : { id: input, direction: 'right' }
    const parentId = payload.id || selectedNodeId.value || root.value.id
    const direction = payload.direction || 'right'

    const match = findNode(parentId)
    if (!match) return null

    const childIndex = match.node.children.length
    const stackOffset = childIndex * 92 - Math.max(0, childIndex - 1) * 46
    const directionOffsets = {
      right: { x: 280, y: stackOffset },
      left: { x: -280, y: stackOffset },
      top: { x: stackOffset, y: -160 },
      bottom: { x: stackOffset, y: 160 },
    }
    const offset = directionOffsets[direction] || directionOffsets.right

    const child = createNode(
      uid(),
      'New idea',
      match.node.x + offset.x,
      match.node.y + offset.y,
      direction,
    )
    match.node.children.push(child)
    selectedNodeId.value = child.id
    return child.id
  }

  const addSiblingNode = (id, direction = 'right') => {
    const match = findNode(id)
    if (!match?.parent) {
      return addChildNode({ id: root.value.id, direction })
    }

    const siblingDirection = match.node.incomingDirection || direction || 'right'
    return addChildNode({ id: match.parent.id, direction: siblingDirection })
  }

  const updateNodeText = (id, text) => {
    const match = findNode(id)
    if (!match) return
    match.node.text = text.trim() || 'Untitled'
  }

  const moveNode = (id, deltaX, deltaY) => {
    const match = findNode(id)
    if (!match) return
    match.node.x += deltaX
    match.node.y += deltaY
    match.node.pinned = true
  }

  const deleteNode = (id) => {
    if (id === root.value.id) return false

    const match = findNode(id)
    if (!match?.parent) return false

    match.parent.children = match.parent.children.filter((child) => child.id !== id)
    selectedNodeId.value = match.parent.id
    return true
  }

  const autoLayout = (mode = 'smart') => {
    collectLayoutWeight(root.value)
    layoutByDirection(root.value, { preservePinned: mode !== 'full' })
    cleanupLayoutWeight(root.value)
  }

  const resetMap = () => {
    root.value = createInitialTree()
    selectedNodeId.value = root.value.id
  }

  const toSerializableState = () => ({
    root: clone(root.value),
    selectedNodeId: selectedNodeId.value,
  })

  const exportState = () => toSerializableState()

  const importState = (nextState) => {
    if (!nextState?.root || !validateNodeShape(nextState.root)) {
      throw new Error('Invalid mind map file.')
    }

    root.value = clone(nextState.root)
    normalizeNodeState(root.value)
    selectedNodeId.value =
      typeof nextState.selectedNodeId === 'string' && nextState.selectedNodeId.trim()
        ? nextState.selectedNodeId
        : nextState.root.id
  }

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed?.root?.id) return
      root.value = parsed.root
      normalizeNodeState(root.value)
      selectedNodeId.value = parsed.selectedNodeId || parsed.root.id
    } catch {
      // ignore broken persisted state
    }
  }

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSerializableState()))
  }

  watch([root, selectedNodeId], saveState, { deep: true })
  loadState()

  return {
    NODE_WIDTH,
    NODE_HEIGHT,
    root,
    rootId,
    nodes,
    edges,
    selectedNodeId,
    setSelectedNode,
    addChildNode,
    addSiblingNode,
    updateNodeText,
    moveNode,
    deleteNode,
    autoLayout,
    resetMap,
    exportState,
    importState,
  }
}
