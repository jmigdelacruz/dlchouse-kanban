<template>
  <div class="task-card" @click.stop="openTask">
    <div class="task-header">
      <h3 class="task-title">{{ task.title }}</h3>
      <div class="task-badges">
        <span class="task-status" :class="task.status">{{ formatStatus(task.status) }}</span>
        <!-- <span v-if="isRecentlyUpdated" class="update-badge" title="Recently updated">
          <i class="fas fa-clock"></i>
        </span> -->
      </div>
    </div>
    <div class="task-content">
      <p class="description" v-html="truncatedDescription"></p>
      <div v-if="task.resolution" class="resolution-badge">
        <i class="fas fa-check-circle"></i>
        <span>{{ task.resolution }}</span>
      </div>
      <div v-if="task.images && task.images.length > 0" class="task-images">
        <div class="image-grid">
          <div v-for="(image, index) in displayedImages" :key="index" class="image-preview">
            <OptimizedImage
              :src="image.url"
              :alt="'Task image ' + (index + 1)"
              :width="60"
              :height="60"
            />
            <span class="image-number">{{ index + 1 }}</span>
          </div>
          <div v-if="task.images.length > 3" class="image-preview more-images">
            <div class="more-images-overlay">
              <span>+{{ task.images.length - 3 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="task-footer">
      <div class="task-comments">
        <i class="fas fa-comments"></i>
        <span>{{ task.comments?.length || 0 }}</span>
      </div>
      <div class="task-images-count">
        <i class="fas fa-images"></i>
        <span>{{ task.images?.length || 0 }}</span>
      </div>
      <div class="task-date">
        <i class="fas fa-clock"></i>
        <span>{{ formatLastUpdate }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, defineAsyncComponent } from 'vue'

const OptimizedImage = defineAsyncComponent(() => 
  import('./OptimizedImage.vue')
)

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-task'])

const displayedImages = computed(() => {
  return props.task.images?.slice(0, 3) || []
})

const truncatedDescription = computed(() => {
  if (!props.task.description) return ''
  if (props.task.description.length <= 125) return props.task.description
  return props.task.description.substring(0, 125) + '<small><i> ... Read More</i></small>'
})

const openTask = () => {
  emit('open-task', props.task)
}

const formatDate = (date) => {
  if (!date) return 'No due date'
  return new Date(date).toLocaleDateString()
}

const formatStatus = (status) => {
  // Special case for 'todo' status
  if (status.toLowerCase() === 'todo') {
    return 'New'
  }
  
  return status.split('-').map(word => {
    // Special case for DLC
    if (word.toLowerCase() === 'dlc') {
      return 'DLC'
    }
    if (word.toLowerCase() === 'vb') {
      return 'VB'
    }
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

const isRecentlyUpdated = computed(() => {
  if (!props.task.updatedAt) return false
  const updateDate = new Date(props.task.updatedAt)
  const now = new Date()
  const hoursDiff = (now - updateDate) / (1000 * 60 * 60)
  return hoursDiff < 24 // Show badge if updated in last 24 hours
})

const formatLastUpdate = computed(() => {
  // Get the latest comment timestamp if there are any comments
  const latestComment = props.task.comments?.length > 0 
    ? props.task.comments.reduce((latest, comment) => {
        return new Date(comment.date) > new Date(latest.date) ? comment : latest
      })
    : null

  // Get the latest timestamp between task update and latest comment
  const taskUpdateTime = props.task.updatedAt ? new Date(props.task.updatedAt) : null
  const commentTime = latestComment ? new Date(latestComment.date) : null
  const latestTimestamp = taskUpdateTime && commentTime
    ? (taskUpdateTime > commentTime ? taskUpdateTime : commentTime)
    : (taskUpdateTime || commentTime || new Date(props.task.createdAt))

  if (!latestTimestamp) {
    console.warn('No timestamp found for task:', props.task)
    return 'Never'
  }
  
  const now = new Date()
  const hoursDiff = (now - latestTimestamp) / (1000 * 60 * 60)
  
  if (hoursDiff < 1) return 'Just now'
  if (hoursDiff < 24) return `${Math.round(hoursDiff)}h ago`
  return latestTimestamp.toLocaleDateString()
})
</script>

<style scoped>
.task-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: grab;
  transition: transform 0.2s;
  user-select: none;
}

.task-card:hover {
  transform: translateY(-2px);
}

.task-card:active {
  cursor: grabbing;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.task-header h3 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
}

.task-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: capitalize;
}

.task-badge.resolution {
  background: #e8f5e9;
  color: #388e3c;
}

.task-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  text-transform: capitalize;
}

.task-status.new,.task-status.todo {
  background: #e3f2fd;
  color: #1976d2;
}

.task-status.pending-vb,.pending-VB {
  background: #fff3e0;
  color: #f57c00;
}

.task-status.pending-dlc,.pending-DLC {
  background: #fff3e0;
  color: #f57c00;
}

.task-status.resolved {
  background: #e8f5e9;
  color: #388e3c;
}

.task-content {
  margin: 8px 0;
}

.description {
  margin: 8px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.3;
}

.task-images {
  margin: 8px 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-number {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.task-comments, .task-images-count, .task-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-images-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
}

.more-images {
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.more-images-overlay {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.resolution-badge {
  background: #e8f5e9;
  color: #388e3c;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  word-wrap: break-word;
}

.resolution-badge i {
  font-size: 14px;
  flex-shrink: 0;
}

.resolution-badge span {
  flex: 1;
  min-width: 0;
  word-wrap: break-word;
}

.update-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #e3f2fd;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 4px;
}

.update-badge i {
  font-size: 10px;
}

@media (max-width: 768px) {
  .task-card {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    width: 270px;
    flex: 0 0 270px;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .task-badges {
    width: 100%;
    flex-wrap: wrap;
  }

  .task-badge, .task-status {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }

  .task-title {
    font-size: 0.95rem;
    margin-right: 0.5rem;
  }

  .task-status {
    padding: 0.2rem 0.4rem;
    font-size: 0.7rem;
  }

  .description {
    font-size: 0.85rem;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  }

  .task-footer {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .task-comments, .task-images-count, .task-date {
    font-size: 0.8rem;
  }

  .more-images-overlay {
    font-size: 12px;
  }

  .resolution-badge {
    font-size: 0.8rem;
    padding: 6px 10px;
  }

  .resolution-badge i {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .task-card {
    padding: 0.5rem;
  }

  .task-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
  }

  .task-title {
    margin-right: 0.5rem;
  }

  .task-status {
    align-self: center;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  }

  .task-footer {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
  }

  .task-comments, .task-images-count, .task-date {
    font-size: 0.75rem;
  }

  .resolution-badge {
    font-size: 0.75rem;
    padding: 4px 8px;
  }

  .resolution-badge i {
    font-size: 11px;
  }
}
</style>
