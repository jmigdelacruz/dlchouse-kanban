<template>
  <div class="kanban-board">
    <div class="kanban-header">
      <div class="header-content">
        <img src="../assets/house-thumb.jpg" alt="DLC House" class="logo">
        <div class="title-group">
          <h1>DLC House</h1>
          <div class="subtitle-group">
            <small>VB = Villanueva Builders</small>
            <span class="divider">•</span>
            <small>DLC = de la Cruz</small>
          </div>
        </div>
      </div>
      <button class="add-task-btn" @click="openModal">
        <i class="fas fa-plus"></i> Add Task
      </button>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading tasks...</p>
    </div>

    <div v-else class="kanban-columns">
      <TaskList
        v-for="status in statuses"
        :key="status"
        :title="formatStatus(status)"
        :tasks="getTasksByStatus(status)"
        @task-moved="handleTaskMoved"
        @update:tasks="(updatedTasks) => handleTasksUpdate(updatedTasks, status)"
        @open-task="openModal"
      />
    </div>

    <footer class="page-footer">
      <div class="build-info">
        <span>Build: {{ buildNumber }}</span>
      </div>
    </footer>

    <TaskModal
      :is-open="showModal"
      :task="selectedTask"
      @close="closeModal"
      @save="handleTaskSave"
      @delete="handleTaskDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import TaskList from './TaskList.vue'
import { subscribeToTasks, addTask, updateTask, deleteTask } from '../services/firebaseService'

// Lazy load TaskModal
const TaskModal = defineAsyncComponent(() => 
  import('./TaskModal.vue')
)

const tasks = ref([])
const showModal = ref(false)
const selectedTask = ref(null)
const isLoading = ref(true)
const unsubscribe = ref(null)

const statuses = ['new', 'pending-VB', 'pending-DLC', 'resolved']

// Generate build number from timestamp
const buildNumber = new Date().getTime()

onMounted(() => {
  console.log('Setting up Firebase subscription...')
  unsubscribe.value = subscribeToTasks((newTasks) => {
    console.log('Received tasks from Firebase:', newTasks)
    tasks.value = newTasks
    isLoading.value = false
  })
})

onUnmounted(() => {
  console.log('Cleaning up Firebase subscription...')
  if (unsubscribe.value) {
    unsubscribe.value()
  }
})

const handleTaskMoved = async (taskId, newStatus) => {
  try {
    console.log('Moving task:', taskId, 'to status:', newStatus)
    
    // Find the task in the local state
    const taskIndex = tasks.value.findIndex(task => task.id === taskId)
    if (taskIndex === -1) {
      console.error('Task not found in local state:', taskId)
      return
    }

    // Convert 'new' to 'todo' for Firestore storage
    const statusToStore = newStatus === 'new' ? 'todo' : newStatus

    // Update the task status in Firestore
    await updateTask(taskId, { 
      status: statusToStore,
      updatedAt: new Date().toISOString()
    })

    // Update the local state
    tasks.value[taskIndex] = {
      ...tasks.value[taskIndex],
      status: statusToStore,
      updatedAt: new Date().toISOString()
    }

    console.log('Task moved successfully')
  } catch (error) {
    console.error('Error moving task:', error)
    alert('Failed to move task. Please check the console for details.')
  }
}

const handleTaskSave = async (taskData) => {
  try {
    console.log('Starting task save operation...')
    if (selectedTask.value?.id) {
      console.log('Updating existing task:', selectedTask.value.id)
      await updateTask(selectedTask.value.id, taskData)
      console.log('Task updated successfully')
    } else {
      console.log('Creating new task:', taskData)
      // Create a clean copy of the task data without any undefined properties
      const cleanTaskData = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        dueDate: taskData.dueDate || null,
        images: taskData.images || [],
        comments: taskData.comments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      const taskId = await addTask(cleanTaskData)
      console.log('New task created with ID:', taskId)
    }
    showModal.value = false
    selectedTask.value = null
  } catch (error) {
    console.error('Error saving task:', error)
    alert('Failed to save task. Please check the console for details.')
  }
}

const openModal = (task = null) => {
  selectedTask.value = task
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedTask.value = null
}

const formatStatus = (status) => {
  return status.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

const getTasksByStatus = (status) => {
  // Convert the status to match the format in Firestore (with hyphens)
  const formattedStatus = status.toLowerCase().split(' ').join('-')
  return tasks.value
    .filter(task => {
      // Handle both 'todo' and 'new' status for backward compatibility
      const taskStatus = task.status.toLowerCase()
      if (formattedStatus === 'new' && taskStatus === 'todo') return true
      if (formattedStatus === 'todo' && taskStatus === 'new') return true
      return taskStatus === formattedStatus
    })
    .sort((a, b) => {
      // Get the latest timestamp for each task
      const getLatestTimestamp = (task) => {
        // Get the latest comment timestamp if there are any comments
        const latestComment = task.comments?.length > 0 
          ? task.comments.reduce((latest, comment) => {
              return new Date(comment.date) > new Date(latest.date) ? comment : latest
            })
          : null

        // Get the latest timestamp between task update and latest comment
        const taskUpdateTime = task.updatedAt ? new Date(task.updatedAt) : null
        const commentTime = latestComment ? new Date(latestComment.date) : null
        return taskUpdateTime && commentTime
          ? (taskUpdateTime > commentTime ? taskUpdateTime : commentTime)
          : (taskUpdateTime || commentTime || new Date(task.createdAt))
      }

      const dateA = getLatestTimestamp(a)
      const dateB = getLatestTimestamp(b)
      return dateB - dateA // Sort in descending order (newest first)
    })
}

const handleTasksUpdate = (updatedTasks, status) => {
  // Update the tasks array with the new tasks for this status
  const otherTasks = tasks.value.filter(task => task.status !== status)
  tasks.value = [...otherTasks, ...updatedTasks]
}

const handleTaskDelete = async (taskId) => {
  try {
    console.log('Deleting task:', taskId)
    await deleteTask(taskId)
    console.log('Task deleted successfully')
  } catch (error) {
    console.error('Error deleting task:', error)
    alert('Failed to delete task. Please check the console for details.')
  }
}
</script>

<style scoped>
.kanban-board {
  padding: 20px;
  min-height: 100vh;
  background: #f0f2f5;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.kanban-header h1 {
  margin: 0;
  color: #2c3e50;
}

.kanban-header .header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.kanban-header .logo {
  width: 150px;
  height: 70px;
  border-radius: 8px;
  object-fit: cover;
}

.kanban-header .title-group {
  display: flex;
  flex-direction: column;
}

.kanban-header h1 {
  margin: 0;
  color: #2c3e50;
}

.kanban-header .subtitle-group {
  display: flex;
  align-items: left;
  gap: 8px;
}

.kanban-header .subtitle-group .divider {
  color: #666;
}

.kanban-header small {
  color: #666;
  font-size: 14px;
  margin-top: 2px;
}

.add-task-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: background-color 0.2s;
}

.add-task-btn:hover {
  background-color: #45a049;
}

.kanban-columns {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 20px;
  width: 100%;
}

.kanban-column {
  flex: 1;
  min-width: 0; /* Prevents flex items from overflowing */
  width: 25%; /* Each column takes up 25% of the available width */
}

@media (max-width: 768px) {
  .kanban-header h1 {
    font-size: 2.4rem;
    line-height: 1;
    margin-bottom: 10px;
  }
  .kanban-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .kanban-header .header-content {
    justify-content: center;
  }

  .kanban-header .logo {
    height: 120px;
  }

  .kanban-header .title-group {
    align-items: left;
    text-align: left;
  }

  .kanban-header .subtitle-group {
    flex-direction: column;
    gap: 4px;
    line-height: 1;
  }

  .kanban-header .subtitle-group small {
    display: block;
    margin: 0;
    font-size: 12px;
  }

  .kanban-header .subtitle-group small:not(:last-child)::after {
    display: none;
  }

  .kanban-header .subtitle-group .divider {
    display: none;
  }

  .add-task-btn {
    width: 100%;
    justify-content: center;
  }

  .kanban-columns {
    flex-direction: column;
    gap: 24px;
    overflow-x: visible;
    padding-bottom: 0;
  }

  .kanban-column {
    width: 100%;
    min-width: 100%;
  }

  .task-list {
    overflow-x: auto;
    padding-bottom: 16px;
  }

  .task-list-content {
    min-width: 100%;
    display: flex;
    gap: 16px;
  }

  .task-card {
    min-width: 280px;
    flex-shrink: 0;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.page-footer {
  margin-top: 40px;
  padding: 16px;
  text-align: center;
  border-top: 1px solid #eee;
}

.build-info {
  font-size: 12px;
  color: #666;
  opacity: 0.7;
  font-family: monospace;
}

@media (max-width: 768px) {
  .page-footer {
    margin-top: 24px;
    padding: 12px;
  }

  .build-info {
    font-size: 10px;
  }
}
</style>
