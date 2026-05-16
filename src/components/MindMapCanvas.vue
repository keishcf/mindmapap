<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import MindMapNode from './MindMapNode.vue'

const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
  edges: {
    type: Array,
    required: true,
  },
  selectedNodeId: {
    type: String,
    default: '',
  },
  rootId: {
    type: String,
    required: true,
  },
  nodeWidth: {
    type: Number,
    default: 224,
  },
  nodeHeight: {
    type: Number,
    default: 72,
  },
})

const emit = defineEmits([
  'select-node',
  'update-node-text',
  'add-child',
  'add-sibling',
  'delete-node',
  'move-node',
])

const boardRef = ref(null)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const panning = ref(false)
const panPointerId = ref(null)
const measuredSizes = reactive({})

const getNodeWidth = (id) => measuredSizes[id]?.width ?? props.nodeWidth
const getNodeHeight = (id) => measuredSizes[id]?.height ?? props.nodeHeight

const onNodeResize = ({ id, width, height }) => {
  measuredSizes[id] = { width, height }
}

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const WORLD_PADDING = 520

const worldBounds = computed(() => {
  if (props.nodes.length === 0) {
    return {
      originX: -WORLD_PADDING,
      originY: -WORLD_PADDING,
      width: WORLD_PADDING * 2,
      height: WORLD_PADDING * 2,
    }
  }

  const minX = Math.min(...props.nodes.map((node) => node.x))
  const minY = Math.min(...props.nodes.map((node) => node.y))
  const maxX = Math.max(...props.nodes.map((node) => node.x + getNodeWidth(node.id)))
  const maxY = Math.max(...props.nodes.map((node) => node.y + getNodeHeight(node.id)))

  const originX = minX - WORLD_PADDING
  const originY = minY - WORLD_PADDING
  const width = Math.max(maxX - minX + WORLD_PADDING * 2, 2200)
  const height = Math.max(maxY - minY + WORLD_PADDING * 2, 2200)

  return { originX, originY, width, height }
})

const renderedNodes = computed(() =>
  props.nodes.map((node) => ({
    ...node,
    renderX: node.x - worldBounds.value.originX,
    renderY: node.y - worldBounds.value.originY,
  })),
)

const renderedNodeMap = computed(
  () => new Map(renderedNodes.value.map((node) => [node.id, node])),
)

const resolveDirection = (edge, fromNode, toNode) => {
  if (edge.direction) return edge.direction
  const dx = toNode.renderX - fromNode.renderX
  const dy = toNode.renderY - fromNode.renderY
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

const getAnchor = (node, side) => {
  const width = getNodeWidth(node.id)
  const height = getNodeHeight(node.id)
  const centerX = node.renderX + width / 2
  const centerY = node.renderY + height / 2
  if (side === 'left') return { x: node.renderX, y: centerY }
  if (side === 'right') return { x: node.renderX + width, y: centerY }
  if (side === 'top') return { x: centerX, y: node.renderY }
  return { x: centerX, y: node.renderY + height }
}

const oppositeSide = (side) => {
  if (side === 'left') return 'right'
  if (side === 'right') return 'left'
  if (side === 'top') return 'bottom'
  return 'top'
}

const edgePaths = computed(() =>
  props.edges
    .map((edge) => {
      const fromNode = renderedNodeMap.value.get(edge.from)
      const toNode = renderedNodeMap.value.get(edge.to)
      if (!fromNode || !toNode) return null

      const direction = resolveDirection(edge, fromNode, toNode)
      const fromAnchor = getAnchor(fromNode, direction)
      const toAnchor = getAnchor(toNode, oppositeSide(direction))

      const startX = fromAnchor.x
      const startY = fromAnchor.y
      const endX = toAnchor.x
      const endY = toAnchor.y
      const horizontal = direction === 'left' || direction === 'right'
      const curve = horizontal
        ? Math.max(60, Math.abs(endX - startX) * 0.45)
        : Math.max(50, Math.abs(endY - startY) * 0.45)
      const control1X = horizontal ? startX + (direction === 'right' ? curve : -curve) : startX
      const control1Y = horizontal ? startY : startY + (direction === 'bottom' ? curve : -curve)
      const control2X = horizontal ? endX + (direction === 'right' ? -curve : curve) : endX
      const control2Y = horizontal ? endY : endY + (direction === 'bottom' ? -curve : curve)
      const path = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`

      return { id: `${edge.from}-${edge.to}`, path }
    })
    .filter(Boolean),
)

const onBoardPointerDown = (event) => {
  if (event.button !== 0) return
  if (event.target.closest('[data-node-shell]')) return

  panning.value = true
  panPointerId.value = event.pointerId
  event.currentTarget.setPointerCapture(event.pointerId)
}

const onBoardPointerMove = (event) => {
  if (!panning.value || panPointerId.value !== event.pointerId) return
  translateX.value += event.movementX
  translateY.value += event.movementY
}

const stopPanning = (event) => {
  if (panPointerId.value !== event.pointerId) return
  panning.value = false
  panPointerId.value = null
}

const onWheel = (event) => {
  event.preventDefault()
  if (!boardRef.value) return

  const delta = event.deltaY < 0 ? 0.08 : -0.08
  const nextScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale.value + delta))
  if (nextScale === scale.value) return

  const rect = boardRef.value.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top
  const worldX = (cursorX - translateX.value) / scale.value
  const worldY = (cursorY - translateY.value) / scale.value

  scale.value = nextScale
  translateX.value = cursorX - worldX * nextScale
  translateY.value = cursorY - worldY * nextScale
}

const onNodeDrag = ({ id, movementX, movementY }) => {
  emit('move-node', {
    id,
    deltaX: movementX / scale.value,
    deltaY: movementY / scale.value,
  })
}

const zoomIn = () => {
  scale.value = Math.min(ZOOM_MAX, +(scale.value + 0.1).toFixed(2))
}

const zoomOut = () => {
  scale.value = Math.max(ZOOM_MIN, +(scale.value - 0.1).toFixed(2))
}

const centerView = () => {
  if (!boardRef.value) return
  const rect = boardRef.value.getBoundingClientRect()
  const rootNode = renderedNodeMap.value.get(props.rootId)
  if (!rootNode) return

  scale.value = 1
  translateX.value = rect.width / 2 - (rootNode.renderX + getNodeWidth(rootNode.id) / 2)
  translateY.value = rect.height / 2 - (rootNode.renderY + getNodeHeight(rootNode.id) / 2)
}

onMounted(() => {
  centerView()
})

defineExpose({
  zoomIn,
  zoomOut,
  centerView,
  getZoom: () => scale.value,
  getCanvasElement: () => boardRef.value,
})
</script>

<template>
  <section
    ref="boardRef"
    class="relative h-full w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white shadow-sm transition-colors duration-300 touch-none dark:border-slate-700/70 dark:from-slate-950 dark:to-slate-900"
    @pointerdown="onBoardPointerDown"
    @pointermove="onBoardPointerMove"
    @pointerup="stopPanning"
    @pointercancel="stopPanning"
    @wheel="onWheel"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle,#e2e8f033_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(circle,#33415530_1px,transparent_1px)]"
    />

    <div
      class="absolute left-0 top-0 origin-top-left transition-transform duration-200 ease-in-out"
      :style="{
        width: `${worldBounds.width}px`,
        height: `${worldBounds.height}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      }"
    >
      <svg class="absolute left-0 top-0 h-full w-full pointer-events-none">
        <path
          v-for="edge in edgePaths"
          :key="edge.id"
          :d="edge.path"
          fill="none"
          stroke="currentColor"
          class="text-slate-300 dark:text-slate-600"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>

      <div
        v-for="node in renderedNodes"
        :key="node.id"
        data-node-shell
        class="absolute left-0 top-0"
      >
        <MindMapNode
          :node="{ ...node, x: node.renderX, y: node.renderY }"
          :selected="selectedNodeId === node.id"
          :is-root="node.id === rootId"
          @select="emit('select-node', $event)"
          @update-text="emit('update-node-text', $event)"
          @add-child="emit('add-child', $event)"
          @add-sibling="emit('add-sibling', $event)"
          @delete-node="emit('delete-node', $event)"
          @drag="onNodeDrag"
          @resize="onNodeResize"
        />
      </div>
    </div>
  </section>
</template>
