<script setup>
import { computed, ref } from 'vue'
import { differenceInDays, addDays, format, startOfDay, parseISO, min, max, isValid } from 'date-fns'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  viewMode: {
    type: String,
    default: 'Day' // Day, Week, Month
  }
})

const elementRef = ref(null) // Scroll container

const CELL_WIDTH = computed(() => {
    switch (props.viewMode) {
        case 'Month': return 15;
        case 'Week': return 30;
        case 'Day': default: return 60;
    }
})

const ROW_HEIGHT = 50

// ... (existing helper functions) ...

const parseDateLocal = (dateStr) => {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return dateStr
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
     return new Date(dateStr + 'T00:00:00')
  }
  return new Date(dateStr)
}

// ... (darkenColor) ...
function darkenColor(hex, percent) {
  const cleanHex = hex.replace('#', '')
  const num = parseInt(cleanHex, 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}


// Interactive state
const hoveredTask = ref(null)

// Calculate timeline range
const startDate = computed(() => {
  if (!props.tasks.length) return new Date()
  const dates = props.tasks.map(t => parseDateLocal(t.start))
  const minDate = min(dates)
  return addDays(minDate, -15) // More buffer for zooming
})

const endDate = computed(() => {
  if (!props.tasks.length) return addDays(new Date(), 30)
  const dates = props.tasks.map(t => parseDateLocal(t.end))
  const maxDate = max(dates)
  return addDays(maxDate, 30) // More buffer
})

const totalDays = computed(() => {
  return differenceInDays(endDate.value, startDate.value) + 1
})

const timelineDates = computed(() => {
  const dates = []
  let curr = startDate.value
  for (let i = 0; i < totalDays.value; i++) {
    dates.push(curr)
    curr = addDays(curr, 1)
  }
  return dates
})

const getX = (date) => {
  const d = parseDateLocal(date)
  const start = startDate.value
  const diff = differenceInDays(d, start)
  return diff * CELL_WIDTH.value
}

const getWidth = (start, end) => {
  const s = parseDateLocal(start)
  const e = parseDateLocal(end)
  return (differenceInDays(e, s) + 1) * CELL_WIDTH.value
}

// ... (connections logic) ...
const getRowY = (taskId) => {
    const index = props.tasks.findIndex(t => t.id === taskId)
    return index * ROW_HEIGHT
}

const connections = computed(() => {
  const lines = []
  props.tasks.forEach(task => {
    if (task.dependencies) {
      task.dependencies.forEach(depId => {
        const parent = props.tasks.find(t => t.id === depId)
        if (parent) {
          const startX = getX(parent.end) + CELL_WIDTH.value
          const startY = getRowY(parent.id) + ROW_HEIGHT/2
          const endX = getX(task.start)
          const endY = getRowY(task.id) + ROW_HEIGHT/2
          
          lines.push({
            path: `M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`,
            id: `${parent.id}-${task.id}`
          })
        }
      })
    }
  })
  return lines
})

// Month rendering logic
const timelineMonths = computed(() => {
    if (!props.tasks.length) return []
    
    const months = []
    let currentDate = startDate.value
    const end = endDate.value
    
    while (currentDate < end) {
        const monthStart = startOfDay(currentDate)
        // Find end of month or end of timeline
        let nextMonth = addDays(monthStart, 1)
        while (nextMonth < end && nextMonth.getDate() !== 1) {
             nextMonth = addDays(nextMonth, 1)
        }
        
        // Calculate days in this segment
        const days = differenceInDays(nextMonth < end ? nextMonth : end, monthStart)
        
        months.push({
            key: format(monthStart, 'yyyy-MM'),
            label: format(monthStart, 'MMMM yyyy'),
            width: days * CELL_WIDTH.value,
            days: days
        })
        
        currentDate = nextMonth
    }
    return months
})

// ... (existing code) ...

// Restore Drag Logic
const emit = defineEmits(['task-updated', 'task-dates-changed', 'task-reordered', 'task-duration-changed', 'task-clicked'])

// Enhanced Dragging & Resizing Logic
const isDragging = ref(false)
const isResizing = ref(false)
const dragState = ref({
  mode: null,
  edge: null,
  taskId: null,
  startX: 0,
  startY: 0,
  initialStart: null,
  initialEnd: null,
  initialIndex: 0,
  hasMoved: false
})

const startDrag = (event, task) => {
  if (event.button !== 0) return
  event.preventDefault()
  
  const taskIndex = props.tasks.findIndex(t => t.id === task.id)
  
  isDragging.value = true
  dragState.value = {
    mode: 'move',
    edge: null,
    taskId: task.id,
    startX: event.clientX,
    startY: event.clientY,
    initialStart: parseDateLocal(task.start),
    initialEnd: parseDateLocal(task.end),
    initialIndex: taskIndex,
    hasMoved: false
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const startResize = (event, task, edge) => {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  
  isResizing.value = true
  dragState.value = {
    mode: 'resize',
    edge: edge,
    taskId: task.id,
    startX: event.clientX,
    startY: event.clientY,
    initialStart: parseDateLocal(task.start),
    initialEnd: parseDateLocal(task.end),
    initialIndex: 0,
    hasMoved: false
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (!isDragging.value && !isResizing.value) return
  
  const dx = event.clientX - dragState.value.startX
  const dy = event.clientY - dragState.value.startY
  
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    dragState.value.hasMoved = true
  }
  
  if (!dragState.value.hasMoved) return
  
  const task = props.tasks.find(t => t.id === dragState.value.taskId)
  if (!task) return
  
  if (dragState.value.mode === 'move') {
    // USE CELL_WIDTH.value HERE because we are in script
    const daysMoved = Math.round(dx / CELL_WIDTH.value)
    if (daysMoved !== 0) {
      const newStart = addDays(dragState.value.initialStart, daysMoved)
      const newEnd = addDays(dragState.value.initialEnd, daysMoved)
      
      emit('task-dates-changed', {
        taskId: task.id,
        start: format(newStart, "yyyy-MM-dd'T'HH:mm"),
        end: format(newEnd, "yyyy-MM-dd'T'HH:mm")
      })
    }
    
    // Vertical Logic remains same
    const rowsMoved = Math.round(dy / ROW_HEIGHT)
    if (rowsMoved !== 0) {
      const newIndex = Math.max(0, Math.min(props.tasks.length - 1, dragState.value.initialIndex + rowsMoved))
      if (newIndex !== dragState.value.initialIndex) {
        emit('task-reordered', {
          taskId: task.id,
          oldIndex: dragState.value.initialIndex,
          newIndex: newIndex
        })
      }
    }
  } else if (dragState.value.mode === 'resize') {
     // USE CELL_WIDTH.value HERE
    const daysDelta = Math.round(dx / CELL_WIDTH.value)
    
    if (dragState.value.edge === 'left') {
      const newStart = addDays(dragState.value.initialStart, daysDelta)
      if (newStart < dragState.value.initialEnd) {
        emit('task-duration-changed', {
          taskId: task.id,
          start: format(newStart, "yyyy-MM-dd'T'HH:mm"),
          end: task.end
        })
      }
    } else if (dragState.value.edge === 'right') {
      const newEnd = addDays(dragState.value.initialEnd, daysDelta)
      // Don't allow end before start
      if (newEnd > dragState.value.initialStart) {
        emit('task-duration-changed', {
          taskId: task.id,
          start: task.start,
          end: format(newEnd, "yyyy-MM-dd'T'HH:mm")
        })
      }
    }
  }
}

const stopDrag = () => {
  if (isDragging.value || isResizing.value) {
    const task = props.tasks.find(t => t.id === dragState.value.taskId)
    
    if (task && !dragState.value.hasMoved) {
      emit('task-clicked', task)
    }
  }
  
  isDragging.value = false
  isResizing.value = false
  dragState.value = { mode: null, edge: null, taskId: null, startX: 0, startY: 0, initialStart: null, initialEnd: null, initialIndex: 0, hasMoved: false }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Public Methods
const centerOnDate = (date) => {
    if (!elementRef.value) return
    const x = getX(date)
    // Center it: x - half width
    const containerWidth = elementRef.value.clientWidth
    elementRef.value.scrollLeft = x - (containerWidth / 2) + (CELL_WIDTH.value / 2)
}

defineExpose({
    centerOnDate
})
</script>

<template>
  <div class="gantt-container">
    <div class="gantt-header-wrapper" ref="headerRef">
      <div class="gantt-header" :style="{ width: `${totalDays * CELL_WIDTH}px` }">
         <div class="month-row">
            <div 
                v-for="month in timelineMonths" 
                :key="month.key"
                class="month-cell"
                :style="{ width: `${month.width}px` }"
            >
                {{ month.label }}
            </div>
         </div>
         <div class="days-row">
           <div 
             v-for="date in timelineDates" 
             :key="date" 
             class="day-cell"
             :style="{ width: `${CELL_WIDTH}px` }"
             :class="{ 'weekend': date.getDay() === 0 || date.getDay() === 6 }"
           >
             <span class="day-name" v-if="CELL_WIDTH > 20">{{ format(date, 'EE') }}</span>
             <span class="day-num" v-if="CELL_WIDTH > 10">{{ format(date, 'dd') }}</span>
           </div>
         </div>
      </div>
    </div>

    <div class="gantt-body-scroll" ref="elementRef" @scroll="$refs.headerRef.scrollLeft = $event.target.scrollLeft">
      <div class="gantt-body" :style="{ width: `${totalDays * CELL_WIDTH}px`, height: `${tasks.length * ROW_HEIGHT}px` }">
        
        <!-- Grid Background -->
        <div 
          v-for="date in timelineDates" 
          :key="'grid-'+date" 
          class="grid-column"
          :style="{ left: `${getX(date)}px`, width: `${CELL_WIDTH.value}px` }"
           :class="{ 'weekend': date.getDay() === 0 || date.getDay() === 6 }"
        ></div>

        <!-- Dependency Arrows (SVG Layer) -->
        <svg class="connections-layer">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
            </marker>
          </defs>
          <path 
            v-for="conn in connections" 
            :key="conn.id" 
            :d="conn.path" 
            stroke="#666" 
            stroke-width="2" 
            fill="none" 
            marker-end="url(#arrowhead)"
          />
        </svg>

        <!-- Tasks -->
        <div 
          v-for="(task, index) in tasks" 
          :key="task.id"
          class="task-row"
          :style="{ top: `${index * ROW_HEIGHT}px` }"
        >
          <div 
            class="task-bar"
            :class="[task.status, { 'is-dragging': dragState.taskId === task.id }]"
            :style="{ 
              left: `${getX(task.start)}px`, 
              width: `${getWidth(task.start, task.end)}px`,
              backgroundColor: task.color 
            }"
            @mouseenter="hoveredTask = task"
            @mouseleave="hoveredTask = null"
            @mousedown="startDrag($event, task)"
          >
            <div class="progress-fill" :style="{ 
              width: task.progress + '%',
              background: darkenColor(task.color, 25)
            }"></div>
            <span class="task-label">{{ task.name }}</span>
            
            <!-- Resize Handles -->
            <div 
              class="resize-handle resize-left" 
              @mousedown="startResize($event, task, 'left')"
              title="Resize start date"
            ></div>
            <div 
              class="resize-handle resize-right" 
              @mousedown="startResize($event, task, 'right')"
              title="Resize end date"
            ></div>
            
            <!-- Tooltip -->
             <div v-if="hoveredTask && hoveredTask.id === task.id" class="tooltip">
                <div class="tooltip-header">{{ task.name }}</div>
                <div class="tooltip-dates">{{ format(new Date(task.start), 'yyyy-MM-dd') }} - {{ format(new Date(task.end), 'yyyy-MM-dd') }}</div>
                <div class="tooltip-status">
                  <span class="status-badge">{{ task.status || 'In Progress' }}</span>
                  <span class="progress-text">{{ task.progress }}%</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background-color: #f9f9f9;
}

.gantt-header-wrapper {
  overflow: hidden; /* Sync with body scroll in real app */
  border-bottom: 1px solid #ddd;
  background: white;
}

.gantt-header {
  height: 60px;
  display: flex;
  flex-direction: column;
}

.month-row {
    height: 30px;
    display: flex;
    border-bottom: 1px solid #eee;
    background: #fcfcfc;
}

.month-cell {
    display: flex;
    align-items: center;
    padding-left: 8px;
    font-weight: bold;
    color: #555;
    font-size: 0.9rem;
    border-right: 1px solid #eee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
}

.days-row {
  display: flex;
  height: 30px;
}

.day-cell {
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #666;
}

.day-num {
  font-weight: bold;
  color: #333;
}

.gantt-body-scroll {
  flex: 1;
  overflow: auto;
  position: relative;
}

.gantt-body {
  position: relative;
  background-image: linear-gradient(to right, transparent 49px, #f0f0f0 50px);
  background-size: 50px 100%; /* Matches CELL_WIDTH */
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.task-row {
  position: absolute;
  left: 0;
  width: 100%;
  height: 50px; /* ROW_HEIGHT */
}

.task-bar {
  position: absolute;
  height: 36px;
  top: 7px; /* (ROW_HEIGHT - 36) / 2 */
  border-radius: 6px;
  background: #4a90e2; /* Default */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: white;
  font-size: 0.85rem;
  overflow: visible; /* For tooltip */
  cursor: grab;
  z-index: 20;
  transition: transform 0.1s, box-shadow 0.1s;
}

.task-bar:active {
  cursor: grabbing;
}

.task-bar:hover {
  transform: scaleY(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  z-index: 30;
}

.task-bar.is-dragging {
  cursor: grabbing;
  z-index: 50;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  transition: none; /* remove transition during drag for responsiveness */
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 25;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-left {
  left: 0;
  border-left: 3px solid rgba(255, 255, 255, 0.8);
}

.resize-right {
  right: 0;
  border-right: 3px solid rgba(255, 255, 255, 0.8);
}

.task-bar:hover .resize-handle {
  opacity: 1;
}

.task-label {
  z-index: 2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  opacity: 0.8;
  border-radius: 6px 0 0 6px;
  z-index: 1;
}

.tooltip {
  position: absolute;
  top: 100%; /* Below */
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #333;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  width: 200px;
  z-index: 100;
  margin-top: 8px;
  text-align: left;
}

.tooltip-header {
  font-weight: bold;
  margin-bottom: 4px;
}

.tooltip-dates {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 8px;
}

.tooltip-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  background: #eee;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
}
</style>
