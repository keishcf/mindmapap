<script setup>
import {
  Crosshair,
  Download,
  FolderOpen,
  Grid3x3,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
} from 'lucide-vue-next'

defineProps({
  zoom: {
    type: Number,
    required: true,
  },
  isDark: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'add-node',
  'reset-map',
  'save-file',
  'load-file',
  'zoom-in',
  'zoom-out',
  'reset-view',
  'auto-layout-smart',
  'auto-layout-full',
  'export',
  'toggle-theme',
])
</script>

<template>
  <header
    class="absolute left-1/2 top-4 z-30 w-[min(94vw,960px)] -translate-x-1/2 rounded-[28px] border border-white/55 bg-white/60 px-4 py-3 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.42)] backdrop-blur-2xl dark:border-slate-300/20 dark:bg-slate-900/55"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="px-1.5">
        <h1 class="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Mind Map Studio</h1>
        <p class="text-[11px] font-medium text-slate-500/90 dark:text-slate-400/90">Control Dock</p>
      </div>

      <div class="toolbar-segment">
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('add-node')" title="Add Node">
          <Plus class="toolbar-icon" /><span class="toolbar-btn-label">Node</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('auto-layout-smart')" title="Smart Layout">
          <Sparkles class="toolbar-icon" /><span class="toolbar-btn-label">Smart</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('auto-layout-full')" title="Full Layout">
          <Grid3x3 class="toolbar-icon" /><span class="toolbar-btn-label">Full</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('zoom-out')" title="Zoom Out">
          <Minus class="toolbar-icon" /><span class="toolbar-btn-label">Out</span>
        </button>
        <span class="rounded-2xl border border-white/60 bg-white/70 px-2.5 py-1 text-xs font-semibold tracking-tight text-slate-700 shadow-sm dark:border-slate-500/30 dark:bg-slate-800/75 dark:text-slate-200">
          {{ Math.round(zoom * 100) }}%
        </span>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('zoom-in')" title="Zoom In">
          <Plus class="toolbar-icon" /><span class="toolbar-btn-label">In</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('reset-view')" title="Center View">
          <Crosshair class="toolbar-icon" /><span class="toolbar-btn-label">Center</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('reset-map')" title="Reset Map">
          <RotateCcw class="toolbar-icon" /><span class="toolbar-btn-label">Reset</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('save-file')" title="Save To File">
          <Save class="toolbar-icon" /><span class="toolbar-btn-label">Save</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('load-file')" title="Load From File">
          <FolderOpen class="toolbar-icon" /><span class="toolbar-btn-label">Load</span>
        </button>
        <button class="toolbar-btn-primary toolbar-btn-icon" @click="emit('export')" title="Export PNG">
          <Download class="toolbar-icon" /><span class="toolbar-btn-label">Export</span>
        </button>
        <button class="toolbar-btn toolbar-btn-icon" @click="emit('toggle-theme')" :title="isDark ? 'Light Mode' : 'Dark Mode'">
          <Sun v-if="isDark" class="toolbar-icon" />
          <Moon v-else class="toolbar-icon" />
          <span class="toolbar-btn-label">{{ isDark ? 'Light' : 'Dark' }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
