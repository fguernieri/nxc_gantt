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
  <!-- Standard Nextcloud Navigation Structure -->
  <ul id="app-navigation-list">
    <li class="app-navigation-entry-header">
       <div class="app-navigation-entry-header-title">FAVORITES</div>
    </li>
    
    <li 
      v-for="board in favorites" 
      :key="board.id"
      class="app-navigation-entry"
      :class="{ active: board.id === selectedId }"
    >
      <a href="#" @click.prevent="emit('select', board.id)">
        <span class="app-navigation-entry-icon" :style="{ backgroundColor: board.color }"></span>
        <span class="app-navigation-entry-title">{{ board.name }}</span>
        <div class="app-navigation-entry-utils" v-if="board.count">
            <span class="app-navigation-entry-utils-counter">{{ board.count }}</span>
        </div>
      </a>
    </li>

    <li class="app-navigation-entry-header">
       <div class="app-navigation-entry-header-title">ALL BOARDS</div>
    </li>
    
    <li 
      v-for="board in others" 
      :key="board.id"
      class="app-navigation-entry"
      :class="{ active: board.id === selectedId }"
    >
      <a href="#" @click.prevent="emit('select', board.id)">
        <span class="app-navigation-entry-icon" :style="{ backgroundColor: board.color }"></span>
        <span class="app-navigation-entry-title">{{ board.name }}</span>
      </a>
    </li>
    
    <li class="app-navigation-entry">
        <a href="#">
             <Folder size="20" class="app-navigation-entry-icon-svg"/>
             <span class="app-navigation-entry-title">Archived</span>
        </a>
    </li>
    
    <!-- Settings usually go at bottom or separate list, sticking to simple list for now -->
  </ul>
</template>

<style scoped>
/* 
   We try to mimic Nextcloud's native classes locally 
   so it looks right even if strictly isolated style.
   In a real NC app, global styles might apply, but scoped ensures we control it.
*/

#app-navigation-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
}

.app-navigation-entry-header {
    padding: 20px 12px 10px;
    font-size: 12px;
    font-weight: bold;
    color: var(--color-text-maxcontrast);
    text-transform: uppercase;
    opacity: .7;
}

.app-navigation-entry a {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    box-sizing: border-box;
    color: var(--color-main-text);
    text-decoration: none;
    border-radius: var(--border-radius);
    transition: background-color .1s;
}

.app-navigation-entry a:hover,
.app-navigation-entry.active a {
    background-color: var(--color-background-hover);
}

.app-navigation-entry.active a {
    font-weight: bold;
}

.app-navigation-entry-icon {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    margin-right: 12px;
    display: inline-block;
    flex-shrink: 0;
}

.app-navigation-entry-icon-svg {
    margin-right: 12px;
    opacity: .7;
    flex-shrink: 0;
}

.app-navigation-entry-title {
    flex: 1 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-navigation-entry-utils {
    display: flex;
    align-items: center;
}

.app-navigation-entry-utils-counter {
    background-color: var(--color-background-dark);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 11px;
    color: var(--color-text-light);
}
</style>
