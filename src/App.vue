<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import GanttChart from './components/GanttChart.vue'
import { Search, Bell, Settings, Calendar, User, X } from 'lucide-vue-next'
import { fetchBoards, fetchBoardStacks } from './services/deckApi.js'
import { format, subDays, parse } from 'date-fns'

const selectedBoardId = ref(null)
const isModalOpen = ref(false)
const editingTask = ref({})
const selectedDepToAdd = ref("")
const loading = ref(true)
const error = ref(null)

const boards = ref([])
const tasks = ref([])

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

// Map Deck card to Gantt task format
function mapCardToTask(card) {
    // Parse duedate or use defaults
    let endDate = new Date()
    let startDate = subDays(endDate, 7) // Default: 7 days before end
    
    if (card.duedate) {
        try {
            endDate = parse(card.duedate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
            startDate = subDays(endDate, 7) // Start is 7 days before due
        } catch (e) {
            console.warn('Failed to parse duedate:', card.duedate, e)
        }
    }
    
    // Get color from first label or use default
    const color = card.labels?.[0]?.color || '#4a90e2'
    
    // Map archived/done status
    const status = card.archived ? 'Done' : (card.done ? 'Done' : 'To Do')
    const progress = card.done || card.archived ? 100 : 0
    
    return {
        id: card.id,
        name: card.title,
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        color: color,
        progress: progress,
        status: status,
        dependencies: [] // Will implement later
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
                allCards.push(...stack.cards)
            }
        })
        
        // Map to Gantt format
        tasks.value = allCards.map(mapCardToTask)
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
    isModalOpen.value = true
}

const saveTask = () => {
    const index = tasks.value.findIndex(t => t.id === editingTask.value.id)
    if (index !== -1) {
        tasks.value[index] = { ...editingTask.value }
    }
    isModalOpen.value = false
}
</script>

<template>
  <div class="app-layout">
    <!-- Top Bar Mock -->
    <header class="top-bar">
      <div class="logo-area">
        <div class="deck-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><line x1="12" y1="4" x2="12" y2="20"></line></svg>
        </div>
        <span class="app-name">Deck</span>
        <span class="nav-item">Projects <span class="chevron">▼</span></span>
      </div>
      <div class="top-actions">
        <div class="search-box">
          <Search size="16" />
          <input type="text" placeholder="Search..." />
        </div>
        <Bell size="20" class="icon-btn" />
        <User size="20" class="icon-btn" />
      </div>
    </header>

    <div class="main-body">
      <Sidebar 
        :boards="boards" 
        :selectedId="selectedBoardId" 
        @select="handleSelectBoard"
      />
      
      <main class="content-area">
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

        <GanttChart :tasks="tasks" @task-clicked="openTaskModal" />
      </main>
    </div>
    
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
                        <input v-model="editingTask.start" type="date" />
                    </div>
                    <div class="form-group">
                        <label>End Date</label>
                        <input v-model="editingTask.end" type="date" />
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
/* Previous Styles */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #fff;
}
/* ... keep existing styles but appending modal styles ... */

.deps-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  min-height: 40px;
}

.dep-chip {
  background: #eef2f5;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.remove-dep {
  cursor: pointer;
  color: #999;
  font-weight: bold;
}

.remove-dep:hover {
  color: #d00;
}

.no-deps {
  color: #ccc;
  font-style: italic;
  font-size: 0.8rem;
}

.add-dep-row {
  display: flex;
  gap: 8px;
}

.btn-add-dep {
    background: #eee;
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
    background: white;
    border-radius: 8px;
    width: 400px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    overflow: hidden;
}

.modal-header {
    padding: 16px;
    border-bottom: 1px solid #eee;
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
    color: #666;
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
    color: #555;
    margin-bottom: 6px;
}

.form-group input, .form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
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
    background: #f9f9f9;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #eee;
}

.btn-cancel {
    padding: 8px 16px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
}

.btn-save {
    padding: 8px 16px;
    border: none;
    background: var(--color-primary);
    color: white;
    border-radius: 4px;
    cursor: pointer;
}

/* Original styles below */

.top-bar {
  height: 50px;
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  color: white;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-name {
  font-weight: bold;
  font-size: 1.2rem;
}

.nav-item {
  opacity: 0.8;
  cursor: pointer;
  display: flex;
  gap: 4px;
}

.top-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  background: transparent;
  border: none;
  color: white;
  outline: none;
}

.search-box input::placeholder {
  color: rgba(255,255,255,0.7);
}

.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fcfcfc;
}

.content-header {
  height: 60px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: white;
}

.board-title {
  font-weight: bold;
  font-size: 1.1rem;
}

.sep {
  margin: 0 8px;
  color: #999;
}

.view-title {
  color: #666;
}

.view-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-group {
  display: flex;
  background: #eee;
  border-radius: 6px;
  padding: 2px;
}

.btn-group button {
  border: none;
  background: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #555;
}

.btn-group button.active {
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  color: var(--color-primary);
  font-weight: 500;
}

.icon-only {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
}

.icon-only.active {
  background: #e6f2ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.footer-bar {
  height: 40px;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  font-size: 0.8rem;
  color: #666;
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

.dot.done { background: #16a085; }
.dot.progress { background: #f1c40f; } /* Swapped in mock */
.dot.review { background: #0082c9; }
.dot.todo { background: #c0392b; }

</style>
