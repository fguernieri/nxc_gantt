<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import GanttChart from './components/GanttChart.vue'
import { Settings, Calendar, X } from 'lucide-vue-next'
import { fetchBoards, fetchBoardStacks, updateCard } from './services/deckApi.js'
import { format, subDays, parse, parseISO } from 'date-fns'

const selectedBoardId = ref(null)
const isModalOpen = ref(false)
const editingTask = ref({})
const selectedDepToAdd = ref("")
const loading = ref(true)
const error = ref(null)

const boards = ref([])
const tasks = ref([])

// Helper to convert any date input to ISO string "YYYY-MM-DDTHH:mm" for datetime-local input
// Uses Browser Local Time
const formatToLocalForInput = (date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm")
}

// Helper to parse from datetime-local input back to Date object
// Uses Browser Local Time
const parseFromLocalInput = (dateString) => {
    return new Date(dateString)
}

// Computed for Modal
const availableDependencies = computed(() => {
    if (!editingTask.value.id) return []
    return tasks.value.filter(t => 
        t.id !== editingTask.value.id && // not self
        !editingTask.value.dependencies?.includes(t.id) // not already added
    )
})

// Get selected board name for breadcrumb
const selectedBoardName = computed(() => {
    const board = boards.value.find(b => b.id === selectedBoardId.value)
    return board ? board.title : 'Select a Board'
})

// Parse GANTT_META block from card description
function parseGanttMeta(description) {
    if (!description) return {}
    
    const match = description.match(/\[GANTT_META\]([\s\S]*?)\[\/GANTT_META\]/)
    if (!match) return {}
    
    const meta = {}
    match[1].split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return
        const [key, ...valueParts] = trimmed.split(':')
        if (key && valueParts.length > 0) {
            meta[key.trim()] = valueParts.join(':').trim()
        }
    })
    
    // Parse dependencies JSON array
    if (meta.dependencies) {
        try {
            meta.dependencies = JSON.parse(meta.dependencies)
        } catch (e) {
            console.warn('Failed to parse dependencies:', e)
            meta.dependencies = []
        }
    }
    
    return meta
}

// Build description with GANTT_META block
function buildDescription(task) {
    const meta = `[GANTT_META]
start: ${task.start}
progress: ${task.progress}
status: ${task.status}
dependencies: ${JSON.stringify(task.dependencies || [])}
[/GANTT_META]`
    
    // Extract original content (remove old meta block if exists)
    const original = (task._deckMeta?.originalDescription || '').replace(/\[GANTT_META\][\s\S]*?\[\/GANTT_META\]\n*/g, '').trim()
    
    return original ? `${meta}\n\n${original}` : meta
}

// Map Deck card to Gantt task format
function mapCardToTask(card, stackId) {
    // Parse metadata from description
    const meta = parseGanttMeta(card.description || '')
    
    // Parse duedate or use defaults
    let endDate = new Date()
    let startDate = subDays(endDate, 7) // Default: 7 days before end
    
    if (card.duedate) {
        try {
            const parsedDue = parseISO(card.duedate)
            if (parsedDue.toString() !== 'Invalid Date') {
                 endDate = parsedDue
            }
            startDate = meta.start ? parseISO(meta.start) : subDays(endDate, 7)
        } catch (e) {
            console.warn('Failed to parse duedate:', card.duedate, e)
        }
    } else if (meta.start) {
        // If no duedate but has start in meta, calculate end
        startDate = parseISO(meta.start)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7) // Default 7-day duration
    }
    
    // Get color from first label or use default
    const color = card.labels?.[0]?.color || '#4a90e2'
    
    // Use metadata if available, otherwise fallback to card properties
    const status = meta.status || (card.archived ? 'Done' : (card.done ? 'Done' : 'To Do'))
    const progress = meta.progress !== undefined ? parseInt(meta.progress) : (card.done || card.archived ? 100 : 0)
    
    return {
        id: card.id,
        name: card.title,
        // formatted for datetime-local (Browser Local Time)
        start: formatToLocalForInput(startDate),
        end: formatToLocalForInput(endDate),
        color: color,
        progress: progress,
        status: status,
        dependencies: meta.dependencies || [],
        _deckMeta: {
            boardId: selectedBoardId.value,
            stackId: stackId,
            type: card.type || 'plain',
            owner: card.owner || 'unknown',
            originalDescription: card.description || ''
        }
    }
}

// Load boards from API
async function loadBoards() {
    try {
        loading.value = true
        error.value = null
        const data = await fetchBoards()
        
        // Map boards to sidebar format
        boards.value = data.map(board => ({
            id: board.id,
            name: board.title,
            count: 0, // Not provided by API, could calculate later
            color: board.color || '#0082c9',
            favorite: false // Not provided by basic endpoint
        }))
        
        // Auto-select first board
        if (boards.value.length > 0 && !selectedBoardId.value) {
            selectedBoardId.value = boards.value[0].id
        }
    } catch (err) {
        error.value = 'Failed to load boards: ' + err.message
        console.error(err)
    } finally {
        loading.value = false
    }
}

// Load tasks (cards) for selected board
async function loadTasks() {
    if (!selectedBoardId.value) {
        tasks.value = []
        return
    }
    
    try {
        loading.value = true
        error.value = null
        const stacks = await fetchBoardStacks(selectedBoardId.value)
        
        // Flatten all cards from all stacks
        const allCards = []
        stacks.forEach(stack => {
            if (stack.cards && Array.isArray(stack.cards)) {
                stack.cards.forEach(card => {
                    allCards.push(mapCardToTask(card, stack.id))
                })
            }
        })
        
        tasks.value = allCards
    } catch (err) {
        error.value = 'Failed to load tasks: ' + err.message
        console.error(err)
    } finally {
        loading.value = false
    }
}

// Watch for board selection changes
watch(selectedBoardId, (newId) => {
    if (newId) {
        loadTasks()
    }
})

// Load on mount
onMounted(() => {
    loadBoards()
})

const getTaskName = (id) => {
    const t = tasks.value.find(x => x.id === id)
    return t ? t.name : 'Unknown'
}

const addDependency = () => {
    if (!selectedDepToAdd.value) return
    if (!editingTask.value.dependencies) editingTask.value.dependencies = []
    
    editingTask.value.dependencies.push(selectedDepToAdd.value)
    selectedDepToAdd.value = ""
}

const removeDependency = (id) => {
    if (!editingTask.value.dependencies) return
    editingTask.value.dependencies = editingTask.value.dependencies.filter(d => d !== id)
}

const handleSelectBoard = (id) => {
  selectedBoardId.value = id
}

const openTaskModal = (task) => {
    // Clone to avoid direct mutation during edit
    editingTask.value = { ...task }
    
    // Ensure format is correct for datetime-local input (needs YYYY-MM-DDThh:mm)
    const normalizeForInput = (val) => {
        if (!val) return ''
        // If it's already YYYY-MM-DD, append time
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val + 'T00:00'
        // If it sends with seconds, strip them
        if (val.length > 16) return val.substring(0, 16)
        return val
    }
    
    editingTask.value.start = normalizeForInput(editingTask.value.start)
    editingTask.value.end = normalizeForInput(editingTask.value.end)
    
    isModalOpen.value = true
}

const saveTask = async () => {
    const { _deckMeta } = editingTask.value
    
    if (!_deckMeta) {
        alert('Error: Missing deck metadata')
        return
    }
    
    try {
        // Prepare API updates
        // Parse Local Time String from input -> Date Object -> UTC ISO for API
        const apiDueDate = parseFromLocalInput(editingTask.value.end).toISOString()
        
        const updates = {
            title: editingTask.value.name,
            type: _deckMeta.type,
            owner: _deckMeta.owner,
            duedate: apiDueDate,
            description: buildDescription(editingTask.value)
        }
        
        // Call Deck API
        await updateCard(_deckMeta.boardId, _deckMeta.stackId, editingTask.value.id, updates)
        
        // Update local state only after API success
        const index = tasks.value.findIndex(t => t.id === editingTask.value.id)
        if (index !== -1) {
            tasks.value[index] = { ...editingTask.value }
        }
        
        isModalOpen.value = false
    } catch (err) {
        console.error('Failed to save task:', err)
        alert('Failed to save changes: ' + err.message)
        // Keep modal open on error
    }
}

// Handle task dates changed (horizontal drag)
async function handleTaskDatesChanged(event) {
    const task = tasks.value.find(t => t.id === event.taskId)
    if (!task) return
    
    // Update local state (Optimistic)
    // event.start/end from Gantt might be YYYY-MM-DD or full ISO
    // Gantt emits YYYY-MM-DD currently, we need to fix Gantt or handle it here
    // Assuming Gantt emits simple dates, we might lose time precision if we blindly assign
    // But let's assume Gantt is fixed to emit ISO or we append time
    
    // Actually, update Gantt later. For now:
    task.start = event.start
    task.end = event.end
    
    // Save to API
    try {
        const updates = {
            title: task.name,
            type: task._deckMeta.type,
            owner: task._deckMeta.owner,
            // Convert Local Time String -> UTC ISO for API
            duedate: parseFromLocalInput(event.end).toISOString(),
            description: buildDescription(task)
        }
        
        await updateCard(task._deckMeta.boardId, task._deckMeta.stackId, task.id, updates)
    } catch (err) {
        console.error('Failed to update task dates:', err)
        // Optionally revert
    }
}

// Handle task reordered (vertical drag)
function handleTaskReordered(event) {
    const { taskId, oldIndex, newIndex } = event
    
    // Reorder tasks array
    const taskToMove = tasks.value[oldIndex]
    tasks.value.splice(oldIndex, 1)
    tasks.value.splice(newIndex, 0, taskToMove)
}

// Handle task duration changed (resize)
async function handleTaskDurationChanged(event) {
    const task = tasks.value.find(t => t.id === event.taskId)
    if (!task) return
    
    // Update local state
    if (event.start) task.start = event.start
    if (event.end) task.end = event.end
    
    // Save to API
    try {
        // Use current task values which are now updated
        // Convert Local Time String -> UTC ISO
        const duedateISO = parseFromLocalInput(task.end).toISOString()
        
        const updates = {
            title: task.name,
            type: task._deckMeta.type,
            owner: task._deckMeta.owner,
            duedate: duedateISO,
            description: buildDescription(task)
        }
        
        await updateCard(task._deckMeta.boardId, task._deckMeta.stackId, task.id, updates)
    } catch (err) {
        console.error('Failed to update task duration:', err)
    }
}
</script>

<template>
  <div id="content" class="app-nxc_gantt">
    <div id="app-navigation">
      <Sidebar 
        :boards="boards" 
        :selectedId="selectedBoardId" 
        @select="handleSelectBoard"
      />
    </div>
    
    <div id="app-content">
      <div class="content-header">
         <div class="breadcrumb">
             <span class="board-title">{{ selectedBoardName }}</span>
             <span class="sep">›</span>
             <span class="view-title">Gantt Timeline</span>
           </div>
           
           <div class="view-controls">
             <div class="btn-group">
               <button class="active">Day</button>
               <button>Week</button>
               <button>Month</button>
             </div>
             <button class="icon-only"><span class="circle-icon"></span></button>
             <button class="icon-only active"><Calendar size="16"/></button>
           </div>
      </div>

      <GanttChart 
        :tasks="tasks" 
        @task-clicked="openTaskModal"
        @task-dates-changed="handleTaskDatesChanged"
        @task-reordered="handleTaskReordered"
        @task-duration-changed="handleTaskDurationChanged"
      />

       <div class="footer-bar">
          <div class="deck-settings"><Settings size="14"/> Deck Settings</div>
          <div class="lists-legend">
            <span>Lists: </span>
            <span class="legend-item"><span class="dot done"></span> Done</span>
            <span class="legend-item"><span class="dot progress"></span> In Progress</span>
            <span class="legend-item"><span class="dot review"></span> Review</span>
            <span class="legend-item"><span class="dot todo"></span> To Do</span>
          </div>
       </div>
    </div>
    
    <!-- Edit Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Task</h3>
                <button class="close-btn" @click="isModalOpen = false"><X size="20"/></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Task Name</label>
                    <input v-model="editingTask.name" type="text" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input v-model="editingTask.start" type="datetime-local" />
                    </div>
                    <div class="form-group">
                         <label>End Date</label>
                         <input v-model="editingTask.end" type="datetime-local" />
                    </div>
                </div>
                 <div class="form-row">
                    <div class="form-group">
                        <label>Status</label>
                        <select v-model="editingTask.status">
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review">Review</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label>Progress (%)</label>
                        <input v-model.number="editingTask.progress" type="number" min="0" max="100" />
                    </div>
                </div>

                <div class="form-group">
                  <label>Predecessors (Dependencies)</label>
                  <div class="deps-list">
                    <div v-for="depId in editingTask.dependencies" :key="depId" class="dep-chip">
                      {{ getTaskName(depId) }}
                      <span class="remove-dep" @click="removeDependency(depId)">×</span>
                    </div>
                    <div v-if="!editingTask.dependencies || editingTask.dependencies.length === 0" class="no-deps">
                      No dependencies
                    </div>
                  </div>
                  
                  <div class="add-dep-row">
                    <select v-model="selectedDepToAdd">
                      <option value="" disabled>Select task...</option>
                      <option 
                        v-for="t in availableDependencies" 
                        :key="t.id" 
                        :value="t.id"
                      >
                        {{ t.name }}
                      </option>
                    </select>
                    <button class="btn-add-dep" :disabled="!selectedDepToAdd" @click="addDependency">Add</button>
                  </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" @click="isModalOpen = false">Cancel</button>
                <button class="btn-save" @click="saveTask">Save Changes</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Standard Nextcloud Content Layout */
#content {
    /* Nextcloud handles the main container */
    height: 100vh;
    display: flex;
    background-color: var(--color-main-background, #fff);
    overflow: hidden;
}

#app-navigation {
    width: 300px; /* Standard Width */
    height: 100%;
    overflow-y: auto;
    background-color: var(--color-main-background, #fff);
    border-right: 1px solid var(--color-border, #eee);
    flex-shrink: 0;
}

#app-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    min-width: 0; 
    overflow: hidden;
    background-color: var(--color-main-background, #fff);
}

/* Original styles adapted */

.content-header {
  height: 50px;
  border-bottom: 1px solid var(--color-border, #eee);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--color-main-background, #fff);
  position: sticky;
  top: 0;
  z-index: 50;
}


.board-title {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--color-main-text, #222);
}


.sep {
  margin: 0 8px;
  color: var(--color-text-maxcontrast, #555);
}


.view-title {
  color: var(--color-text-light, #888);
}


.view-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}


.btn-group {
  display: flex;
  background: var(--color-background-dark, #eee);
  border-radius: var(--border-radius, 4px);
  padding: 2px;
}


.btn-group button {
  border: none;
  background: none;
  padding: 4px 12px;
  border-radius: var(--border-radius, 4px);
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-light, #888);
}


.btn-group button.active {
  background: var(--color-main-background, #fff);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  color: var(--color-main-text, #222);
}


.icon-only {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border, #eee);
  background: var(--color-main-background, #fff);
  border-radius: var(--border-radius, 4px);
  cursor: pointer;
  color: var(--color-text-light, #888);
}


.icon-only.active {
  background: var(--color-primary-light, #e6f2ff);
  border-color: var(--color-primary, #0082c9);
  color: var(--color-primary, #0082c9);
}


.footer-bar {
  height: 40px;
  border-top: 1px solid var(--color-border, #eee);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  font-size: 0.85rem;
  background: var(--color-main-background, #fff);
  color: var(--color-text-light, #888);
}

.deck-settings {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.lists-legend {
  display: flex;
  gap: 16px;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.dot.done { background: var(--color-success, #16a085); }
.dot.progress { background: var(--color-primary, #0082c9); }
.dot.review { background: var(--color-warning, #f1c40f); }
.dot.todo { background: var(--color-text-maxcontrast, #555); }

/* Modal and Dep Styles remain */
.deps-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid var(--color-border, #eee);
  border-radius: var(--border-radius, 4px);
  min-height: 40px;
}

.dep-chip {
  background: var(--color-background-dark, #eee);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-dep {
  cursor: pointer;
  color: var(--color-text-maxcontrast, #555);
  font-weight: bold;
}

.remove-dep:hover {
  color: var(--color-error, #d00);
}

.no-deps {
  color: var(--color-text-light, #888);
  font-style: italic;
  font-size: 0.8rem;
}

.add-dep-row {
  display: flex;
  gap: 8px;
}

.btn-add-dep {
  background: var(--color-background-dark, #eee);
  border: none;
  padding: 0 12px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-add-dep:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    background: var(--color-main-background, #fff);
    border-radius: var(--border-radius-large, 8px);
    width: 400px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    overflow: hidden;
    color: var(--color-main-text, #000);
}

.modal-header {
    padding: 16px;
    border-bottom: 1px solid var(--color-border, #eee);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
}

.close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-maxcontrast, #555);
}

.modal-body {
    padding: 16px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 0.85rem;
    color: var(--color-text-maxcontrast, #555);
    margin-bottom: 6px;
}

.form-group input, .form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--color-border, #ddd);
    border-radius: var(--border-radius, 4px);
    font-size: 0.9rem;
    background-color: var(--color-main-background, #fff);
    color: var(--color-main-text, #000);
}

.form-row {
    display: flex;
    gap: 16px;
}

.form-row .form-group {
    flex: 1;
}

.modal-footer {
    padding: 16px;
    background: var(--color-background-dark, #f9f9f9);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid var(--color-border, #eee);
}

.btn-cancel {
    padding: 8px 16px;
    border: 1px solid var(--color-border, #ddd);
    background: var(--color-main-background, #fff);
    border-radius: var(--border-radius, 4px);
    cursor: pointer;
    color: var(--color-main-text, #000);
}

.btn-save {
    padding: 8px 16px;
    border: none;
    background: var(--color-primary, #0082c9);
    color: white;
    border-radius: var(--border-radius, 4px);
    cursor: pointer;
}
</style>
