<script setup>
import { computed, ref } from 'vue'
import MindMapCanvas from './components/MindMapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import { useMindMap } from './composables/useMindMap'
import { exportMindMapAsPng } from './utils/exportImage'

const canvasRef = ref(null)
const fileInputRef = ref(null)
const exportError = ref('')
const isDark = ref(localStorage.getItem('apple-mind-map-theme') === 'dark')

const {
  NODE_WIDTH,
  NODE_HEIGHT,
  nodes,
  edges,
  rootId,
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
} = useMindMap()

const currentZoom = computed(() => canvasRef.value?.getZoom?.() ?? 1)

if (isDark.value) {
  document.documentElement.classList.add('dark')
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('apple-mind-map-theme', isDark.value ? 'dark' : 'light')
}

const addNode = () => {
  addChildNode(selectedNodeId.value || rootId.value)
}

const onDeleteNode = (id) => {
  deleteNode(id)
}

const onUpdateText = ({ id, text }) => {
  updateNodeText(id, text)
}

const onMoveNode = ({ id, deltaX, deltaY }) => {
  moveNode(id, deltaX, deltaY)
}

const onExport = async () => {
  exportError.value = ''
  try {
    const canvasElement = canvasRef.value?.getCanvasElement?.()
    await exportMindMapAsPng(canvasElement)
  } catch (error) {
    exportError.value = error?.message || 'Export failed. Please try again.'
  }
}

const onSaveToFile = () => {
  try {
    exportError.value = ''
    const state = exportState()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    anchor.href = url
    anchor.download = `mindmap-${timestamp}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    exportError.value = error?.message || 'Failed to save mind map file.'
  }
}

const onRequestLoadFromFile = () => {
  exportError.value = ''
  fileInputRef.value?.click()
}

const onLoadFromFile = async (event) => {
  const [file] = event.target.files || []
  event.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    importState(parsed)
    canvasRef.value?.centerView()
  } catch (error) {
    exportError.value = error?.message || 'Failed to load mind map file.'
  }
}

const onResetMap = () => {
  resetMap()
  canvasRef.value?.centerView()
}

const onAutoLayout = (mode = 'smart') => {
  autoLayout(mode)
}
</script>

<template>
  <main class="relative h-screen overflow-hidden bg-slate-100 p-4 text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
    <Toolbar
      :zoom="currentZoom"
      :is-dark="isDark"
      @add-node="addNode"
      @reset-map="onResetMap"
      @save-file="onSaveToFile"
      @load-file="onRequestLoadFromFile"
      @zoom-in="canvasRef?.zoomIn()"
      @zoom-out="canvasRef?.zoomOut()"
      @reset-view="canvasRef?.centerView()"
      @auto-layout-smart="onAutoLayout('smart')"
      @auto-layout-full="onAutoLayout('full')"
      @export="onExport"
      @toggle-theme="toggleTheme"
    />

    <div class="h-full rounded-3xl pt-24">
      <input
        ref="fileInputRef"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="onLoadFromFile"
      >
      <MindMapCanvas
        ref="canvasRef"
        :nodes="nodes"
        :edges="edges"
        :selected-node-id="selectedNodeId"
        :root-id="rootId"
        :node-width="NODE_WIDTH"
        :node-height="NODE_HEIGHT"
        @select-node="setSelectedNode"
        @update-node-text="onUpdateText"
        @add-child="addChildNode"
        @add-sibling="addSiblingNode"
        @delete-node="onDeleteNode"
        @move-node="onMoveNode"
      />
    </div>

    <p
      v-if="exportError"
      class="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 shadow-sm dark:bg-rose-500/20 dark:text-rose-200"
    >
      {{ exportError }}
    </p>
  </main>
</template>
