<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'View & Edit Task' : 'New Task' }}</h2>
        <div class="modal-actions">
          <button v-if="isEditing" class="delete-button" @click="handleDelete">
            <i class="fas fa-trash"></i>
          </button>
          <button class="close-button" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            required
            placeholder="Enter task title"
          >
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            rows="6"
            placeholder="Enter task description"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" v-model="form.status" required>
              <option value="todo">New</option>
              <option value="pending-VB">Pending VB</option>
              <option value="pending-DLC">Pending DLC</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div class="form-group">
            <label for="dueDate">Due Date</label>
            <input
              id="dueDate"
              v-model="form.dueDate"
              type="date"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="images">Images</label>
          <div class="image-upload-container">
            <div class="image-preview-grid">
              <div v-for="(image, index) in form.images" :key="index" class="image-preview" @click="openImageModal(image)">
                <img :src="image.url" :alt="'Task image ' + (index + 1)">
                <span class="image-number">{{ index + 1 }}</span>
                <button type="button" class="delete-image" @click.stop="handleImageDelete(index)">×</button>
              </div>
            </div>
            <div class="image-upload-input">
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                @change="handleImageUpload"
              >
              <label for="images" class="upload-label">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Upload Images</span>
              </label>
            </div>
          </div>
        </div>

        <div class="comments-section">
          <h3>Comments</h3>
          <div class="comments-list">
            <div v-for="(comment, index) in form.comments" :key="index" class="comment">
              <div class="comment-header">
                <span class="comment-author">{{ comment.author }}</span>
                <span class="comment-date">{{ formatDate(comment.date) }}</span>
              </div>
              <div v-if="editingCommentIndex === index" class="comment-edit-form">
                <textarea
                  v-model="editingCommentText"
                  rows="6"
                  class="comment-edit-input"
                  @keyup.enter.ctrl="saveCommentEdit(index)"
                ></textarea>
                <div class="comment-edit-actions">
                  <button type="button" class="save-edit-btn" @click="saveCommentEdit(index)">Save</button>
                  <button type="button" class="cancel-edit-btn" @click="cancelCommentEdit">Cancel</button>
                </div>
              </div>
              <p v-else class="comment-text" @click="startCommentEdit(index)">{{ comment.text }}</p>
              <div class="comment-actions">
                <button type="button" class="edit-comment" @click="startCommentEdit(index)" title="Edit comment">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="delete-comment" @click="deleteComment(index)">×</button>
              </div>
            </div>
          </div>
          <div class="add-comment">
            <div class="comment-input-group">
              <input
                v-model="newCommentAuthor"
                type="text"
                placeholder="Your name"
                class="comment-author-input"
              >
              <textarea
                v-model="newComment"
                rows="2"
                placeholder="Add a comment..."
                @keyup.enter="addComment"
              ></textarea>
            </div>
            <button 
              type="button" 
              @click="addComment" 
              class="add-comment-button"
              :disabled="!newComment.trim() || !newCommentAuthor.trim()"
            >Add</button>
          </div>
        </div>

        <div class="form-group resolution-group">
          <label for="resolution">Resolution</label>
          <textarea
            id="resolution"
            v-model="form.resolution"
            rows="3"
            placeholder="Enter resolution details"
          ></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="cancel-button" @click="closeModal">Cancel</button>
          <button type="submit" class="save-button">Save Task</button>
          <div v-if="isEditing" class="last-update">
            Last update: {{ formatLastUpdate }}
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Image Enlargement Modal -->
  <div v-if="showImageModal" class="modal-overlay" @click="closeImageModal">
    <div class="image-modal-content" @click.stop>
      <div class="image-modal-header">
        <button class="close-button" @click="closeImageModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="image-modal-body">
        <OptimizedImage
          :src="selectedImage?.url"
          :alt="'Enlarged image'"
          :width="800"
          :height="600"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import imageCompression from 'browser-image-compression'
import { uploadImage, deleteImage } from '../services/firebaseService'

const OptimizedImage = defineAsyncComponent(() => 
  import('./OptimizedImage.vue')
)

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  task: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['close', 'save', 'delete'])

const form = ref({
  title: '',
  description: '',
  status: 'fresh',
  dueDate: '',
  resolution: '',
  comments: [],
  images: []
})

const newComment = ref('')
const newCommentAuthor = ref('')

const isEditing = computed(() => !!props.task)

const showImageModal = ref(false)
const selectedImage = ref(null)

const editingCommentIndex = ref(-1)
const editingCommentText = ref('')

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    status: 'fresh',
    dueDate: '',
    resolution: '',
    comments: [],
    images: []
  }
  newComment.value = ''
  newCommentAuthor.value = ''
}

watch(() => props.task, (newTask) => {
  if (newTask) {
    form.value = {
      title: newTask.title || '',
      description: newTask.description || '',
      status: newTask.status || 'fresh',
      dueDate: newTask.dueDate || '',
      resolution: newTask.resolution || '',
      comments: newTask.comments || [],
      images: newTask.images || []
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const closeModal = () => {
  emit('close')
  resetForm()
}

const handleSubmit = async () => {
  try {
    // Create a copy of the form data
    const taskData = { 
      ...form.value,
      updatedAt: new Date().toISOString()
    }
    
    // If it's a new task, we don't need to include the id
    if (!isEditing.value) {
      delete taskData.id
    }
    
    // Emit the save event with the task data
    await emit('save', taskData)
    closeModal()
  } catch (error) {
    console.error('Error saving task:', error)
    alert('Failed to save task. Please try again.')
  }
}

const addComment = () => {
  if (newComment.value.trim() && newCommentAuthor.value.trim()) {
    form.value.comments.push({
      text: newComment.value.trim(),
      author: newCommentAuthor.value.trim(),
      date: new Date().toISOString()
    })
    newComment.value = ''
    newCommentAuthor.value = ''
  }
}

const deleteComment = (index) => {
  form.value.comments.splice(index, 1)
}

const handleImageDelete = async (index) => {
  const image = form.value.images[index]
  try {
    // Delete from Firebase Storage using the full URL
    await deleteImage(image.url)
    // Remove from form
    form.value.images.splice(index, 1)
    // Only save the task if we're editing an existing task
    if (isEditing.value && props.task?.id) {
      try {
        await emit('save', { 
          ...form.value,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error saving task after image delete:', error)
        // Don't show alert here as the image was deleted successfully
      }
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    alert('Failed to delete image. Please try again.')
  }
}

const handleImageUpload = async (event) => {
  const files = event.target.files
  if (!files) return

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      try {
        // Compress the image
        const compressedFile = await imageCompression(file, options)
        
        // Upload to Firebase Storage
        const imageData = await uploadImage(compressedFile)
        
        // Add to form state
        form.value.images.push(imageData)
        
        // Only save the task if we're editing an existing task
        if (isEditing.value && props.task?.id) {
          try {
            await emit('save', { 
              ...form.value,
              updatedAt: new Date().toISOString()
            })
          } catch (error) {
            console.error('Error saving task after image upload:', error)
            // Don't show alert here as the image was uploaded successfully
          }
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image. Please try again.')
      }
    }
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

const handleDelete = () => {
  const confirmation = prompt('Type "delete" to confirm task deletion:')
  if (confirmation?.toLowerCase() === 'delete') {
    emit('delete', props.task.id)
    closeModal()
  }
}

const openImageModal = (image) => {
  selectedImage.value = image
  showImageModal.value = true
}

const closeImageModal = () => {
  showImageModal.value = false
  selectedImage.value = null
}

const startCommentEdit = (index) => {
  editingCommentIndex.value = index
  editingCommentText.value = form.value.comments[index].text
}

const saveCommentEdit = (index) => {
  if (editingCommentText.value.trim()) {
    form.value.comments[index] = {
      ...form.value.comments[index],
      text: editingCommentText.value.trim(),
      date: new Date().toISOString()
    }
    editingCommentIndex.value = -1
    editingCommentText.value = ''
  }
}

const cancelCommentEdit = () => {
  editingCommentIndex.value = -1
  editingCommentText.value = ''
}

const formatLastUpdate = computed(() => {
  // Get the latest comment timestamp if there are any comments
  const latestComment = props.task?.comments?.length > 0 
    ? props.task.comments.reduce((latest, comment) => {
        return new Date(comment.date) > new Date(latest.date) ? comment : latest
      })
    : null

  // Get the latest timestamp between task update and latest comment
  const taskUpdateTime = props.task?.updatedAt ? new Date(props.task.updatedAt) : null
  const commentTime = latestComment ? new Date(latestComment.date) : null
  const latestTimestamp = taskUpdateTime && commentTime
    ? (taskUpdateTime > commentTime ? taskUpdateTime : commentTime)
    : (taskUpdateTime || commentTime || (props.task?.createdAt ? new Date(props.task.createdAt) : null))

  if (!latestTimestamp) {
    console.warn('No timestamp found for task:', props.task)
    return 'Never'
  }
  
  return latestTimestamp.toLocaleString()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.modal-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.delete-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #dc3545;
  padding: 4px;
}

.delete-button:hover {
  color: #c82333;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  margin-right: 4px;
}

.modal-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 13px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.comments-section {
  margin-top: 24px;
}

.comments-section h3 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.comments-list {
  margin-bottom: 16px;
}

.comment {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  position: relative;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding-right: 100px;
}

.comment-author {
  font-weight: 500;
  color: #2c3e50;
}

.comment-date {
  font-size: 12px;
  color: #666;
}

.comment-text {
  margin: 0;
  font-size: 14px;
  color: #444;
  padding-right: 24px;
  white-space: pre-line;
  cursor: pointer;
}

.comment-edit-form {
  margin-top: 8px;
}

.comment-edit-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 60px;
  margin-bottom: 8px;
}

.comment-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.save-edit-btn,
.cancel-edit-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: none;
}

.save-edit-btn {
  background-color: #4CAF50;
  color: white;
}

.save-edit-btn:hover {
  background-color: #45a049;
}

.cancel-edit-btn {
  background-color: #f8f9fa;
  color: #666;
  border: 1px solid #ddd;
}

.cancel-edit-btn:hover {
  background-color: #e9ecef;
}

.comment-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.edit-comment {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.edit-comment:hover {
  background-color: rgba(76, 175, 80, 0.1);
}

.delete-comment {
  position: static;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.delete-comment:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

.add-comment {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.comment-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-author-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-comment textarea {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 60px;
}

.add-comment-button {
  padding: 8px 16px;
  background: #4CAF50;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  align-self: flex-start;
}

.add-comment-button:hover {
  background: #45a049;
}

.add-comment-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cancel-button,
.save-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  background: #f8f9fa;
  border: 1px solid #ddd;
  color: #666;
}

.save-button {
  background: #4CAF50;
  border: none;
  color: white;
}

.save-button:hover {
  background: #45a049;
}

.image-upload-container {
  margin-top: 8px;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-preview:hover {
  transform: scale(1.05);
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
  z-index: 1;
}

.delete-image {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  z-index: 2;
  transition: background-color 0.2s ease;
}

.delete-image:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.image-upload-input {
  position: relative;
}

.image-upload-input input[type="file"] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-label:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.upload-label i {
  font-size: 18px;
  color: #6c757d;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row .form-group {
  flex: 1;
  margin-bottom: 0;
}

.image-modal-content {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  width: 90%;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}

.image-modal-header {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
}

.image-modal-body {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  max-height: calc(90vh - 60px);
  overflow: auto;
}

.enlarged-image {
  max-width: 100%;
  max-height: calc(90vh - 100px);
  object-fit: contain;
}

.resolution-group {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.last-update {
  font-size: 12px;
  color: #666;
  margin-left: auto;
  font-style: italic;
}

@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .last-update {
    text-align: center;
    margin-left: 0;
  }
}
</style> 