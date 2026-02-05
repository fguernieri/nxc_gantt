<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import GanttChart from './components/GanttChart.vue'
import { Search, Bell, Settings, Calendar, User, X } from 'lucide-vue-next'

const selectedBoardId = ref(1)
const isModalOpen = ref(false)
const editingTask = ref({})
const selectedDepToAdd = ref("")

const boards = ref([
  { id: 1, name: 'Website Relaunch', count: 12, color: '#0082c9', favorite: true },
  { id: 2, name: 'Q1 Marketing', count: 5, color: '#46c45e', favorite: true },
  { id: 3, name: 'HR Recruitment', count: 0, color: '#a054d6', favorite: false },
  { id: 4, name: 'Office Events', count: 0, color: '#ff7e38', favorite: false }
])

const tasks = ref([
  { id: 1, name: 'Kickoff Meeting', start: '2026-02-01', end: '2026-02-02', color: '#16a085', progress: 100, status: 'Done', dependencies: [] },
  { id: 2, name: 'Wireframe Design', start: '2026-02-02', end: '2026-02-06', color: '#7e8ce0', progress: 80, status: 'In Progress', dependencies: [1] },
  { id: 3, name: 'Database Schema', start: '2026-02-04', end: '2026-02-08', color: '#f1c40f', progress: 40, status: 'Review', dependencies: [1] },
  { id: 4, name: 'Content Strategy', start: '2026-02-07', end: '2026-02-10', color: '#e67e22', progress: 0, status: 'To Do', dependencies: [2, 3] },
  { id: 5, name: 'Frontend Dev', start: '2026-02-11', end: '2026-02-20', color: '#34495e', progress: 0, status: 'To Do', dependencies: [2] }
])

// Computed for Modal
import { computed } from 'vue'
const availableDependencies = computed(() => {
    if (!editingTask.value.id) return []
    return tasks.value.filter(t => 
        t.id !== editingTask.value.id && // not self
        !editingTask.value.dependencies?.includes(t.id) // not already added
    )
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
             <span class="board-title">Website Relaunch</span>
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
