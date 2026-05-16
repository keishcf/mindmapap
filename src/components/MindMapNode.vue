<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  isRoot: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'select',
  'update-text',
  'add-child',
  'add-sibling',
  'delete-node',
  'drag-start',
  'drag',
  'drag-end',
  'resize',
])

const localText = ref(props.node.text)
const dragging = ref(false)
const textAreaRef = ref(null)
const articleRef = ref(null)

const autoSizeTextArea = () => {
  const el = textAreaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(
  () => props.node.text,
  (value) => {
    localText.value = value
    nextTick(autoSizeTextArea)
  },
)

watch(localText, () => {
  nextTick(autoSizeTextArea)
})

let resizeObserver = null

onMounted(() => {
  autoSizeTextArea()
  if (typeof ResizeObserver === 'undefined' || !articleRef.value) return
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect
      emit('resize', {
        id: props.node.id,
        width: width + 2,
        height: height + 2,
      })
    }
  })
  resizeObserver.observe(articleRef.value)
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

const nodeClasses = computed(() => [
  'absolute w-56 align-middle rounded-2xl border p-4 text-center shadow-sm backdrop-blur transition-all duration-200 ease-in-out',
  'hover:shadow-md hover:-translate-y-0.5',
  props.selected
    ? 'ring-2 ring-blue-400/60 shadow-md'
    : 'focus-within:ring-2 focus-within:ring-blue-300/50',
  dragging.value ? 'cursor-grabbing shadow-md' : 'cursor-grab',
])

const nodeStyle = computed(() => {
  if (!props.node.color) {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(226, 232, 240, 0.8)',
    }
  }

  return {
    backgroundColor: props.node.color.bg,
    borderColor: props.node.color.border,
    boxShadow: `0 10px 20px -14px ${props.node.color.shadow}`,
  }
})

const onPointerDown = (event) => {
  if (event.button !== 0) return
  if (event.target.closest('[data-node-action], textarea')) return

  dragging.value = true
  emit('select', props.node.id)
  emit('drag-start', { id: props.node.id, pointerId: event.pointerId })
  event.currentTarget.setPointerCapture(event.pointerId)
}

const onPointerMove = (event) => {
  if (!dragging.value) return
  emit('drag', { id: props.node.id, movementX: event.movementX, movementY: event.movementY })
}

const onPointerUp = (event) => {
  if (!dragging.value) return
  dragging.value = false
  emit('drag-end', { id: props.node.id, pointerId: event.pointerId })
}

const commitText = () => {
  emit('update-text', { id: props.node.id, text: localText.value })
}

const onKeyDown = (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    addFromSide(props.node.incomingDirection || 'right')
    return
  }

  if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    if (props.isRoot) {
      addFromSide('right')
    } else {
      emit('add-sibling', { id: props.node.id, direction: props.node.incomingDirection || 'right' })
    }
    return
  }

  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    addFromSide(props.node.incomingDirection || 'right')
    return
  }

  if (
    (event.key === 'Delete' || event.key === 'Backspace') &&
    !props.isRoot &&
    localText.value.trim() === ''
  ) {
    event.preventDefault()
    emit('delete-node', props.node.id)
  }
}

const addFromSide = (direction) => {
  emit('add-child', { id: props.node.id, direction })
}

watch(
  () => props.selected,
  async (selected) => {
    if (!selected) return
    await nextTick()
    textAreaRef.value?.focus()
    textAreaRef.value?.select()
  },
)
</script>

<template>
  <article
    ref="articleRef"
    :class="[...nodeClasses, 'group']"
    :style="[nodeStyle, { transform: `translate(${node.x}px, ${node.y}px)` }]"
    tabindex="0"
    @click.stop="emit('select', node.id)"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <textarea
      ref="textAreaRef"
      v-model="localText"
      rows="1"
      class="block w-full resize-none overflow-hidden border-none bg-transparent p-0 text-center text-sm font-medium leading-snug text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      placeholder="Untitled idea"
      @input="autoSizeTextArea"
      @focus="emit('select', node.id)"
      @blur="commitText"
      @keydown="onKeyDown"
    />

    <button
      v-if="!isRoot"
      type="button"
      data-node-action
      class="absolute -left-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500 opacity-0 pointer-events-none shadow-sm transition-all duration-200 ease-in-out hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 group-hover:pointer-events-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
      aria-label="Delete node"
      @click.stop="emit('delete-node', node.id)"
    >
      ×
    </button>

    <button
      type="button"
      data-node-action
      class="absolute -top-3 left-1/2 inline-flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 opacity-0 pointer-events-none shadow-sm transition-all duration-200 ease-in-out hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 group-hover:pointer-events-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
      aria-label="Add node above"
      @click.stop="addFromSide('top')"
    >
      +
    </button>

    <button
      type="button"
      data-node-action
      class="absolute -right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 opacity-0 pointer-events-none shadow-sm transition-all duration-200 ease-in-out hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 group-hover:pointer-events-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
      aria-label="Add node right"
      @click.stop="addFromSide('right')"
    >
      +
    </button>

    <button
      type="button"
      data-node-action
      class="absolute -bottom-3 left-1/2 inline-flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 opacity-0 pointer-events-none shadow-sm transition-all duration-200 ease-in-out hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 group-hover:pointer-events-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
      aria-label="Add node below"
      @click.stop="addFromSide('bottom')"
    >
      +
    </button>

    <button
      type="button"
      data-node-action
      class="absolute -left-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 opacity-0 pointer-events-none shadow-sm transition-all duration-200 ease-in-out hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 group-hover:pointer-events-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
      aria-label="Add node left"
      @click.stop="addFromSide('left')"
    >
      +
    </button>

  </article>
</template>
