<template>
  <div class="task-list">
    <div class="task-list-header">
      <h2>{{ title }}</h2>
      <span class="task-count">{{ tasks.length }}</span>
    </div>
    <div class="task-list-container">
      <button 
        v-if="isMobile" 
        class="scroll-button scroll-left" 
        @click="scrollLeft"
        :disabled="!canScrollLeft"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      <draggable
        ref="draggableRef"
        :list="tasks"
        group="tasks"
        item-key="id"
        class="task-list-content"
        :animation="150"
        ghost-class="ghost-card"
        :direction="isMobile ? 'vertical' : 'horizontal'"
        @change="handleDragChange"
      >
        <template #item="{ element }">
          <TaskCard
            :task="element"
            @open-task="$emit('open-task', element)"
          />
        </template>
      </draggable>
      <button 
        v-if="isMobile" 
        class="scroll-button scroll-right" 
        @click="scrollRight"
        :disabled="!canScrollRight"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'

// Lazy load both TaskCard and draggable
const TaskCard = defineAsyncComponent(() => 
  import('./TaskCard.vue')
)

const draggable = defineAsyncComponent(() => 
  import('vuedraggable')
)

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  tasks: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:tasks', 'task-moved', 'open-task'])
const isMobile = ref(false)
const draggableRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const checkMobile = () => {
  // Check if the device is mobile using multiple methods
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.innerWidth <= 768 ||
                        window.matchMedia('(max-width: 768px)').matches;
  
  isMobile.value = isMobileDevice;
  if (isMobileDevice) {
    // Add a small delay to ensure the DOM is ready
    setTimeout(() => {
      checkScrollButtons();
    }, 100);
  }
}

const checkScrollButtons = () => {
  const container = draggableRef.value?.$el
  if (!container) return
  
  // Add a small delay to ensure the scroll position is updated
  setTimeout(() => {
    canScrollLeft.value = container.scrollLeft > 0
    canScrollRight.value = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1) // Add small buffer
  }, 50)
}

const scrollLeft = () => {
  const container = draggableRef.value?.$el
  if (!container) return
  
  container.scrollBy({
    left: -300,
    behavior: 'smooth'
  })
  
  // Check scroll buttons after scrolling
  setTimeout(checkScrollButtons, 300)
}

const scrollRight = () => {
  const container = draggableRef.value?.$el
  if (!container) return
  
  container.scrollBy({
    left: 300,
    behavior: 'smooth'
  })
  
  // Check scroll buttons after scrolling
  setTimeout(checkScrollButtons, 300)
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  // Add media query listener
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  mediaQuery.addEventListener('change', checkMobile);
  
  const container = draggableRef.value?.$el;
  if (container) {
    container.addEventListener('scroll', checkScrollButtons);
    // Initial check after a short delay to ensure DOM is ready
    setTimeout(checkScrollButtons, 100);
  }
  
  // Clean up media query listener on unmount
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', checkMobile);
  });
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  const container = draggableRef.value?.$el;
  if (container) {
    container.removeEventListener('scroll', checkScrollButtons);
  }
});

const handleDragChange = (evt) => {
  if (evt.added) {
    const { element } = evt.added
    if (!element) {
      console.error('Drag event received but element is null:', evt)
      return
    }

    // Convert title to status format without replacing spaces with hyphens
    const newStatus = props.title.toLowerCase().split(' ').join('-')
    console.log('Task dragged to:', newStatus, 'Task:', element)
    
    // Get the task ID directly from the element
    const taskId = element.id
    console.log('Using task ID:', taskId)
    
    if (!taskId) {
      console.error('Could not find task ID in element:', element)
      return
    }
    
    // Emit the task-moved event for Firestore update
    emit('task-moved', taskId, newStatus)
  }
}
</script>

<style scoped>
.task-list {
  background: #f5f6fa;
  border-radius: 8px;
  padding: 16px;
  min-height: 500px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.task-list-header h2 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.task-count {
  background: #e9ecef;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
}

.task-list-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0; /* Allows container to shrink */
}

.scroll-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 1;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  -webkit-tap-highlight-color: transparent;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  padding: 0;
}

.scroll-button i {
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.9);
  color: #4CAF50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.scroll-button:active:not(:disabled) {
  transform: translateY(-50%) scale(0.95);
}

.scroll-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.scroll-left {
  left: 5px;
}

.scroll-right {
  right: 5px;
}

.task-list-content {
  min-height: 100px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ghost-card {
  opacity: 0.5;
  background: #c8ebfb;
}

@media (max-width: 768px) {
  .task-list {
    width: 100%;
    min-height: auto;
  }

  .task-list-content {
    display: flex;
    flex-direction: row;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 16px;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    padding-left: 8px;
    padding-right: 8px;
  }

  .task-list-content > * {
    flex: 0 0 270px;
  }
}
</style> 