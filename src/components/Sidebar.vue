<script setup>
import { computed } from 'vue'
import { Folder, Layout, Star } from 'lucide-vue-next'

const props = defineProps({
  boards: Array,
  selectedId: Number
})

const emit = defineEmits(['select'])

const favorites = computed(() => props.boards.filter(b => b.favorite))
const others = computed(() => props.boards.filter(b => !b.favorite))

</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="add-board-btn">+ Add Board</button>
    </div>

    <div class="section-title">FAVORITES</div>
    <ul>
      <li 
        v-for="board in favorites" 
        :key="board.id"
        :class="{ active: board.id === selectedId }"
        @click="emit('select', board.id)"
      >
        <span class="color-dot" :style="{ backgroundColor: board.color }"></span>
        <span class="board-name">{{ board.name }}</span>
        <span class="badge" v-if="board.count">{{ board.count }}</span>
      </li>
    </ul>

    <div class="section-title">ALL BOARDS</div>
    <ul>
      <li 
        v-for="board in others" 
        :key="board.id"
        :class="{ active: board.id === selectedId }"
        @click="emit('select', board.id)"
      >
        <span class="color-dot" :style="{ backgroundColor: board.color }"></span>
        <span class="board-name">{{ board.name }}</span>
      </li>
    </ul>
    
    <div class="menu-item"><Folder size="16"/> Archived</div>
    
  </aside>
</template>

<style scoped>
.sidebar {
  width: 250px;
  background-color: #fff;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.add-board-btn {
  width: 100%;
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: var(--border-radius-large);
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 0.75rem;
  color: #888;
  font-weight: bold;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 2px;
}

li:hover {
  background-color: var(--color-background-hover);
}

li.active {
  background-color: #e6f2ff; /* Light blue tint */
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  margin-right: 8px;
}

.board-name {
  flex: 1;
  font-size: 0.9rem;
}

.badge {
  background-color: #dddddd;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  color: #555;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.5rem;
  color: #888;
  cursor: pointer;
}
</style>
