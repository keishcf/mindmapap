import { toPng } from 'html-to-image'

export const exportMindMapAsPng = async (element) => {
  if (!element) {
    throw new Error('Mind map canvas is not ready for export.')
  }

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: Math.max(2, window.devicePixelRatio || 1),
    backgroundColor: '#f8fafc',
  })

  const link = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  link.download = `mind-map-${stamp}.png`
  link.href = dataUrl
  link.click()
}
