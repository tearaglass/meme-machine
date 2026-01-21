const MAX_LAYERS = 50;
const MAX_HISTORY = 30;

const state = {
  canvas: { width: 1080, height: 1080 },
  layers: [],
  activeTool: 'select',
  selectedLayerId: null,
  aspectRatio: '1:1',
  dirty: false,
  assets: { baseImages: [], stickers: [], fonts: [] },
  csrfToken: null
};

const history = {
  past: [],
  future: []
};

const canvas = document.getElementById('meme-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const toolButtons = document.querySelectorAll('[data-tool]');
const aspectButtons = document.querySelectorAll('[data-aspect]');
const baseImageSelect = document.getElementById('base-image-select');
const stickerSelect = document.getElementById('sticker-select');
const layerListEl = document.getElementById('layer-list');

const textInput = document.getElementById('text-input');
const fontSelect = document.getElementById('font-select');
const textSize = document.getElementById('text-size');
const textColor = document.getElementById('text-color');
const textStroke = document.getElementById('text-stroke');
const textAlign = document.getElementById('text-align');
const addTextButton = document.getElementById('add-text');

const drawColor = document.getElementById('draw-color');
const drawSize = document.getElementById('draw-size');

const imageUpload = document.getElementById('image-upload');
const exportButton = document.getElementById('export');

const layerX = document.getElementById('layer-x');
const layerY = document.getElementById('layer-y');
const layerScale = document.getElementById('layer-scale');
const layerRotation = document.getElementById('layer-rotation');
const layerOpacity = document.getElementById('layer-opacity');
const layerUp = document.getElementById('layer-up');
const layerDown = document.getElementById('layer-down');
const layerToggle = document.getElementById('layer-toggle');
const layerDelete = document.getElementById('layer-delete');

let pointerState = {
  dragging: false,
  drawing: false,
  offsetX: 0,
  offsetY: 0
};

// Performance optimization: cache for hit test measurements
const hitTestCache = new Map();

// Performance optimization: throttle rendering with requestAnimationFrame
let renderScheduled = false;

const scheduleRender = () => {
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      render();
      renderScheduled = false;
    });
  }
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const setDirty = (dirty = true) => {
  state.dirty = dirty;
};

const saveState = () => {
  // Deep clone the layers array and canvas size
  const snapshot = {
    layers: JSON.parse(JSON.stringify(state.layers.map(layer => ({
      ...layer,
      image: undefined, // Can't serialize images, we'll need to reload them
      data: { ...layer.data }
    })))),
    canvas: { ...state.canvas },
    selectedLayerId: state.selectedLayerId,
    aspectRatio: state.aspectRatio
  };

  history.past.push(snapshot);
  if (history.past.length > MAX_HISTORY) {
    history.past.shift();
  }
  history.future = []; // Clear redo stack when new action is performed
};

const undo = async () => {
  if (history.past.length === 0) {
    setStatus('Nothing to undo.');
    return;
  }

  // Save current state to future
  const currentSnapshot = {
    layers: JSON.parse(JSON.stringify(state.layers.map(layer => ({
      ...layer,
      image: undefined,
      data: { ...layer.data }
    })))),
    canvas: { ...state.canvas },
    selectedLayerId: state.selectedLayerId,
    aspectRatio: state.aspectRatio
  };
  history.future.push(currentSnapshot);

  // Restore previous state
  const snapshot = history.past.pop();
  await restoreSnapshot(snapshot);
  setStatus('Undo.');
};

const redo = async () => {
  if (history.future.length === 0) {
    setStatus('Nothing to redo.');
    return;
  }

  // Save current state to past
  const currentSnapshot = {
    layers: JSON.parse(JSON.stringify(state.layers.map(layer => ({
      ...layer,
      image: undefined,
      data: { ...layer.data }
    })))),
    canvas: { ...state.canvas },
    selectedLayerId: state.selectedLayerId,
    aspectRatio: state.aspectRatio
  };
  history.past.push(currentSnapshot);

  // Restore future state
  const snapshot = history.future.pop();
  await restoreSnapshot(snapshot);
  setStatus('Redo.');
};

const restoreSnapshot = async (snapshot) => {
  state.canvas = { ...snapshot.canvas };
  state.selectedLayerId = snapshot.selectedLayerId;
  state.aspectRatio = snapshot.aspectRatio;

  canvas.width = state.canvas.width;
  canvas.height = state.canvas.height;
  resizeCanvasDisplay();

  // Restore layers and reload images
  state.layers = [];
  for (const layerData of snapshot.layers) {
    const layer = { ...layerData };

    // Reload images for image-based layers
    if ((layer.type === 'image' || layer.type === 'sticker' || layer.type === 'base') && layer.data.src) {
      try {
        layer.image = await loadImage(layer.data.src);
      } catch (error) {
        console.error('Failed to restore image layer:', error);
      }
    }

    state.layers.push(layer);
  }

  renderLayerList();
  updateLayerControls();
  render();
  setDirty();
};

const getSelectedLayer = () => {
  return state.layers.find((layer) => layer.id === state.selectedLayerId) || null;
};

const updateCanvasSize = (width, height) => {
  state.canvas.width = width;
  state.canvas.height = height;
  canvas.width = width;
  canvas.height = height;
  resizeCanvasDisplay();
  render();
};

const resizeCanvasDisplay = () => {
  const wrapper = canvas.parentElement;
  if (!wrapper) return;
  const availableWidth = wrapper.clientWidth - 32;
  const scale = Math.min(1, availableWidth / state.canvas.width);
  canvas.style.width = `${state.canvas.width * scale}px`;
  canvas.style.height = `${state.canvas.height * scale}px`;
};

const normalizePointer = (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
};

const applyTransforms = (layer, drawFn) => {
  ctx.save();
  ctx.translate(layer.position.x, layer.position.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scale, layer.scale);
  ctx.globalAlpha = layer.opacity;
  drawFn();
  ctx.restore();
};

const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  state.layers.forEach((layer) => {
    if (!layer.visible) return;
    applyTransforms(layer, () => {
      if (layer.type === 'text') {
        ctx.font = `${layer.data.size}px ${layer.data.font}`;
        ctx.textAlign = layer.data.align;
        ctx.textBaseline = 'top';
        ctx.fillStyle = layer.data.color;
        ctx.strokeStyle = layer.data.stroke;
        ctx.lineWidth = Math.max(2, layer.data.size / 10);
        ctx.strokeText(layer.data.text, 0, 0);
        ctx.fillText(layer.data.text, 0, 0);
      }

      if (layer.type === 'image' || layer.type === 'sticker' || layer.type === 'base') {
        const img = layer.image;
        if (!img) return;
        ctx.drawImage(img, 0, 0, layer.data.width, layer.data.height);
      }

      if (layer.type === 'draw') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = layer.data.color;
        ctx.lineWidth = layer.data.size;
        ctx.beginPath();
        layer.data.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });
  });
};

const updateLayerControls = () => {
  const layer = getSelectedLayer();
  const disabled = !layer;
  layerX.value = layer ? Math.round(layer.position.x) : '';
  layerY.value = layer ? Math.round(layer.position.y) : '';
  layerScale.value = layer ? layer.scale : 1;
  layerRotation.value = layer ? layer.rotation : 0;
  layerOpacity.value = layer ? layer.opacity : 1;

  [layerX, layerY, layerScale, layerRotation, layerOpacity, layerUp, layerDown, layerToggle, layerDelete]
    .forEach((input) => {
      input.disabled = disabled;
    });

  if (layer?.locked) {
    layerDelete.disabled = true;
    layerUp.disabled = true;
    layerDown.disabled = true;
  }
};

const syncTextControls = () => {
  const layer = getSelectedLayer();
  if (!layer || layer.type !== 'text') {
    return;
  }
  textInput.value = layer.data.text;
  fontSelect.value = layer.data.font;
  textSize.value = layer.data.size;
  textColor.value = layer.data.color;
  textStroke.value = layer.data.stroke;
  textAlign.value = layer.data.align;
};

const selectLayer = (layerId) => {
  state.selectedLayerId = layerId;
  renderLayerList();
  updateLayerControls();
  syncTextControls();
};

const addLayer = (layer) => {
  if (state.layers.length >= MAX_LAYERS) {
    setStatus(`Layer limit reached (${MAX_LAYERS} max). Delete layers to add more.`);
    return false;
  }
  saveState();
  state.layers.push(layer);
  selectLayer(layer.id);
  setDirty();
  render();
  return true;
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

const generateId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for older iOS webviews that lack crypto.randomUUID.
  return `layer-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

const createLayer = (type, data, options = {}) => {
  return {
    id: generateId(),
    type,
    position: { x: options.x ?? 60, y: options.y ?? 60 },
    scale: options.scale ?? 1,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    visible: true,
    locked: options.locked ?? false,
    data
  };
};

const renderLayerList = () => {
  layerListEl.innerHTML = '';
  const layers = [...state.layers].reverse();
  layers.forEach((layer) => {
    const item = document.createElement('div');
    item.className = `layer-item${layer.id === state.selectedLayerId ? ' active' : ''}`;
    item.dataset.layerId = layer.id;
    const label = document.createElement('span');
    label.textContent = `${layer.type}`;
    const meta = document.createElement('span');
    meta.className = 'layer-meta';
    meta.textContent = `${layer.visible ? 'visible' : 'hidden'}${layer.locked ? ' • locked' : ''}`;
    item.append(label, meta);
    item.addEventListener('click', () => selectLayer(layer.id));
    layerListEl.appendChild(item);
  });
};

const hitTestLayer = (layer, point) => {
  // Convert the pointer into the layer's local space for consistent hit testing.
  const dx = point.x - layer.position.x;
  const dy = point.y - layer.position.y;
  const angle = (-layer.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localX = (dx * cos - dy * sin) / layer.scale;
  const localY = (dx * sin + dy * cos) / layer.scale;

  if (layer.type === 'text') {
    // Cache text measurements for performance
    const cacheKey = `${layer.id}-${layer.data.text}-${layer.data.size}-${layer.data.font}`;
    let measurements = hitTestCache.get(cacheKey);

    if (!measurements) {
      ctx.font = `${layer.data.size}px ${layer.data.font}`;
      measurements = {
        width: ctx.measureText(layer.data.text).width,
        height: layer.data.size
      };
      hitTestCache.set(cacheKey, measurements);

      // Limit cache size
      if (hitTestCache.size > 100) {
        const firstKey = hitTestCache.keys().next().value;
        hitTestCache.delete(firstKey);
      }
    }

    return localX >= 0 && localX <= measurements.width && localY >= 0 && localY <= measurements.height;
  }

  if (layer.type === 'draw') {
    const points = layer.data.points;
    if (!points.length) return false;
    // Points are now stored relative to layer position, so they're already in local space
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // Add some padding to make selection easier
    const padding = layer.data.size || 8;
    return localX >= minX - padding && localX <= maxX + padding &&
           localY >= minY - padding && localY <= maxY + padding;
  }

  if (layer.type === 'image' || layer.type === 'sticker' || layer.type === 'base') {
    return localX >= 0 && localX <= layer.data.width && localY >= 0 && localY <= layer.data.height;
  }

  return false;
};

const selectLayerAtPoint = (point) => {
  for (let i = state.layers.length - 1; i >= 0; i -= 1) {
    const layer = state.layers[i];
    if (!layer.visible) continue;
    if (hitTestLayer(layer, point)) {
      selectLayer(layer.id);
      return layer;
    }
  }
  selectLayer(null);
  return null;
};

const createBaseLayer = async (asset) => {
  try {
    const img = await loadImage(asset.src);
    updateCanvasSize(img.width, img.height);
    const baseLayer = createLayer('base', {
      width: img.width,
      height: img.height,
      src: asset.src
    }, { x: 0, y: 0, locked: true });
    baseLayer.image = img;

    state.layers = state.layers.filter((layer) => layer.type !== 'base');
    state.layers.unshift(baseLayer);
    selectLayer(baseLayer.id);
    renderLayerList();
    render();
    setDirty();
  } catch (error) {
    setStatus('Failed to load base image.');
  }
};

const createStickerLayer = async (asset) => {
  try {
    const img = await loadImage(asset.src);
    const layer = createLayer('sticker', {
      width: img.width,
      height: img.height,
      src: asset.src
    });
    layer.image = img;
    addLayer(layer);
  } catch (error) {
    setStatus('Failed to load sticker.');
  }
};

const createImageLayer = async (src) => {
  try {
    const img = await loadImage(src);
    updateCanvasSize(img.width, img.height);
    const layer = createLayer('image', {
      width: img.width,
      height: img.height,
      src
    });
    layer.image = img;
    addLayer(layer);
  } catch (error) {
    setStatus('Failed to load image upload.');
  }
};

const createTextLayer = () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus('Text cannot be empty.');
    return;
  }
  const layer = createLayer('text', {
    text,
    font: fontSelect.value,
    size: Number(textSize.value) || 64,
    color: textColor.value,
    stroke: textStroke.value,
    align: textAlign.value
  }, { x: 80, y: 80 });
  addLayer(layer);
};

const createDrawLayer = (point) => {
  // Store the first point as the layer position, and subsequent points relative to it
  const layer = createLayer('draw', {
    color: drawColor.value,
    size: Number(drawSize.value) || 8,
    points: [{ x: 0, y: 0 }] // First point is at origin relative to layer position
  }, { x: point.x, y: point.y });
  addLayer(layer);
  return layer;
};

const ensureFontsLoaded = async () => {
  const fontPromises = state.assets.fonts.map((font) => {
    return document.fonts.load(`16px ${font.family}`);
  });
  await Promise.all(fontPromises);
};

const buildAssetButtons = () => {
  baseImageSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = 'placeholder';
  placeholder.textContent = 'Select base image';
  placeholder.disabled = true;
  placeholder.selected = true;
  baseImageSelect.appendChild(placeholder);

  state.assets.baseImages.forEach((asset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = asset.name;
    baseImageSelect.appendChild(option);
  });

  stickerSelect.innerHTML = '';
  const stickerPlaceholder = document.createElement('option');
  stickerPlaceholder.value = 'placeholder';
  stickerPlaceholder.textContent = 'Select sticker';
  stickerPlaceholder.disabled = true;
  stickerPlaceholder.selected = true;
  stickerSelect.appendChild(stickerPlaceholder);

  state.assets.stickers.forEach((asset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = asset.name;
    stickerSelect.appendChild(option);
  });

  fontSelect.innerHTML = '';
  state.assets.fonts.forEach((font) => {
    const option = document.createElement('option');
    option.value = font.family;
    option.textContent = font.name;
    fontSelect.appendChild(option);
  });
};

const loadAssets = async () => {
  try {
    const response = await fetch('/assets/manifest.json?v=2025-02-18');
    state.assets = await response.json();
    buildAssetButtons();
    await ensureFontsLoaded();
  } catch (error) {
    setStatus('Failed to load assets.');
  }
};

const setActiveTool = (tool) => {
  state.activeTool = tool;
  toolButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
  document.querySelectorAll('[data-tool-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.toolPanel === tool);
  });
};

const setAspect = (aspect) => {
  saveState();
  state.aspectRatio = aspect;
  if (aspect === '1:1') updateCanvasSize(1080, 1080);
  if (aspect === '9:16') updateCanvasSize(1080, 1920);
  if (aspect === '16:9') updateCanvasSize(1920, 1080);
  setDirty();
};

const updateLayerFromInputs = () => {
  const layer = getSelectedLayer();
  if (!layer) return;
  layer.position.x = Number(layerX.value) || 0;
  layer.position.y = Number(layerY.value) || 0;
  layer.scale = Number(layerScale.value) || 1;
  layer.rotation = Number(layerRotation.value) || 0;
  // Validate and clamp opacity between 0 and 1
  const opacity = Number(layerOpacity.value);
  layer.opacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  setDirty();
  render();
};

const moveLayer = (direction) => {
  const layer = getSelectedLayer();
  if (!layer || layer.locked) return;
  const index = state.layers.findIndex((item) => item.id === layer.id);
  if (index < 0) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.layers.length) return;
  saveState();
  const [removed] = state.layers.splice(index, 1);
  state.layers.splice(nextIndex, 0, removed);
  renderLayerList();
  render();
  setDirty();
};

const toggleVisibility = () => {
  const layer = getSelectedLayer();
  if (!layer) return;
  saveState();
  layer.visible = !layer.visible;
  renderLayerList();
  render();
  setDirty();
};

const deleteLayer = () => {
  const layer = getSelectedLayer();
  if (!layer || layer.locked) return;
  saveState();
  state.layers = state.layers.filter((item) => item.id !== layer.id);
  selectLayer(null);
  renderLayerList();
  render();
  setDirty();
};

const canvasHasContent = () => {
  return state.layers.some((layer) => layer.visible);
};

const exportMeme = async () => {
  if (!canvasHasContent()) {
    setStatus('Canvas is empty. Add a layer before download.');
    return;
  }
  setStatus('Preparing download...');

  canvas.toBlob(async (blob) => {
    if (!blob) {
      setStatus('Failed to export PNG.');
      return;
    }

    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      setStatus('Use a screenshot to save on mobile.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meme.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Download started.');
    setDirty(false);
  }, 'image/png');
};

window.addEventListener('resize', resizeCanvasDisplay);
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', async (event) => {
  // Ignore keyboard events when typing in inputs
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
    return;
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

  // Undo: Ctrl+Z (Cmd+Z on Mac)
  if (ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    await undo();
    return;
  }

  // Redo: Ctrl+Shift+Z or Ctrl+Y (Cmd+Shift+Z or Cmd+Y on Mac)
  if ((ctrlKey && event.key === 'z' && event.shiftKey) || (ctrlKey && event.key === 'y')) {
    event.preventDefault();
    await redo();
    return;
  }

  // Delete: Delete or Backspace
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteLayer();
    return;
  }

  // Duplicate: Ctrl+D (Cmd+D on Mac)
  if (ctrlKey && event.key === 'd') {
    event.preventDefault();
    const layer = getSelectedLayer();
    if (layer && !layer.locked) {
      const duplicate = createLayer(layer.type, { ...layer.data }, {
        x: layer.position.x + 20,
        y: layer.position.y + 20,
        scale: layer.scale,
        rotation: layer.rotation,
        opacity: layer.opacity
      });
      if (layer.image) {
        duplicate.image = layer.image;
      }
      addLayer(duplicate);
    }
    return;
  }

  // Arrow keys: Move selected layer
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const layer = getSelectedLayer();
    if (!layer || layer.locked) return;
    const step = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case 'ArrowUp':
        layer.position.y -= step;
        break;
      case 'ArrowDown':
        layer.position.y += step;
        break;
      case 'ArrowLeft':
        layer.position.x -= step;
        break;
      case 'ArrowRight':
        layer.position.x += step;
        break;
    }
    updateLayerControls();
    render();
    setDirty();
    return;
  }
});

canvas.addEventListener('pointerdown', (event) => {
  const point = normalizePointer(event);
  if (state.activeTool === 'draw') {
    pointerState.drawing = true;
    const layer = createDrawLayer(point);
    pointerState.activeLayerId = layer.id;
    return;
  }
  const layer = selectLayerAtPoint(point);
  if (layer && state.activeTool === 'select') {
    pointerState.dragging = true;
    pointerState.offsetX = point.x - layer.position.x;
    pointerState.offsetY = point.y - layer.position.y;
  }
});

canvas.addEventListener('pointermove', (event) => {
  const point = normalizePointer(event);
  if (pointerState.drawing) {
    const layer = state.layers.find((item) => item.id === pointerState.activeLayerId);
    if (!layer) return;

    // Store points relative to the layer position
    const newPoint = {
      x: point.x - layer.position.x,
      y: point.y - layer.position.y
    };

    // Performance optimization: Skip points that are too close to the last point
    const lastPoint = layer.data.points[layer.data.points.length - 1];
    const minDistance = 2; // pixels
    const dx = newPoint.x - lastPoint.x;
    const dy = newPoint.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= minDistance) {
      layer.data.points.push(newPoint);
      scheduleRender();
      setDirty();
    }
  }

  if (pointerState.dragging) {
    const layer = getSelectedLayer();
    if (!layer) return;
    layer.position.x = point.x - pointerState.offsetX;
    layer.position.y = point.y - pointerState.offsetY;
    updateLayerControls();
    scheduleRender();
    setDirty();
  }
});

const stopPointer = () => {
  pointerState.dragging = false;
  pointerState.drawing = false;
  pointerState.activeLayerId = null;
};

canvas.addEventListener('pointerup', stopPointer);
canvas.addEventListener('pointerleave', stopPointer);

imageUpload.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => createImageLayer(reader.result);
  reader.readAsDataURL(file);
  imageUpload.value = '';
});

addTextButton.addEventListener('click', createTextLayer);
exportButton.addEventListener('click', exportMeme);

baseImageSelect.addEventListener('change', (event) => {
  const index = Number(event.target.value);
  if (!Number.isFinite(index)) return;
  const asset = state.assets.baseImages[index];
  if (!asset) return;
  createBaseLayer(asset);
  event.target.value = 'placeholder';
});

stickerSelect.addEventListener('change', (event) => {
  const index = Number(event.target.value);
  if (!Number.isFinite(index)) return;
  const asset = state.assets.stickers[index];
  if (!asset) return;
  createStickerLayer(asset);
  event.target.value = 'placeholder';
});

layerX.addEventListener('input', updateLayerFromInputs);
layerY.addEventListener('input', updateLayerFromInputs);
layerScale.addEventListener('input', updateLayerFromInputs);
layerRotation.addEventListener('input', updateLayerFromInputs);
layerOpacity.addEventListener('input', updateLayerFromInputs);

layerUp.addEventListener('click', () => moveLayer(1));
layerDown.addEventListener('click', () => moveLayer(-1));
layerToggle.addEventListener('click', toggleVisibility);
layerDelete.addEventListener('click', deleteLayer);

textInput.addEventListener('input', () => {
  const layer = getSelectedLayer();
  if (!layer || layer.type !== 'text') return;
  layer.data.text = textInput.value;
  render();
  setDirty();
});

[textSize, textColor, textStroke, textAlign, fontSelect].forEach((input) => {
  input.addEventListener('input', () => {
    const layer = getSelectedLayer();
    if (!layer || layer.type !== 'text') return;
    layer.data.size = Number(textSize.value) || 64;
    layer.data.color = textColor.value;
    layer.data.stroke = textStroke.value;
    layer.data.align = textAlign.value;
    layer.data.font = fontSelect.value;
    render();
    setDirty();
  });
});

aspectButtons.forEach((button) => {
  button.addEventListener('click', () => setAspect(button.dataset.aspect));
});

toolButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTool(button.dataset.tool));
});

const fetchCSRFToken = async () => {
  try {
    const response = await fetch('/api/csrf-token');
    if (response.ok) {
      const data = await response.json();
      state.csrfToken = data.token;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
};

const init = async () => {
  await fetchCSRFToken();
  await loadAssets();
  setActiveTool('select');
  updateCanvasSize(1080, 1080);
  renderLayerList();
  updateLayerControls();
  setStatus('Ready.');
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
  }
};

init();
