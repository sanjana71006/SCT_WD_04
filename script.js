// TaskFlow - Vanilla JavaScript To-Do Application
class TaskFlowApp {
    constructor() {
        this.tasks = [];
        this.categories = [
            {
                id: 'personal',
                name: 'Personal',
                color: '#3B82F6',
                createdAt: new Date()
            },
            {
                id: 'work',
                name: 'Work',
                color: '#8B5CF6',
                createdAt: new Date()
            },
            {
                id: 'shopping',
                name: 'Shopping',
                color: '#10B981',
                createdAt: new Date()
            }
        ];
        this.currentTheme = 'light';
        this.searchQuery = '';
        this.filterStatus = 'all';
        this.sortBy = 'created';
        this.selectedCategoryId = '';
        this.editingTask = null;
        this.editingCategory = null;
        this.selectedTags = [];
        this.selectedPriority = 'medium';
        this.selectedColor = '#3B82F6';
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.applyTheme();
        this.render();
    }
    
    loadFromStorage() {
        const savedData = localStorage.getItem('taskflow-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.tasks = data.tasks?.map(task => ({
                    ...task,
                    createdAt: new Date(task.createdAt),
                    updatedAt: new Date(task.updatedAt),
                    deadline: task.deadline ? new Date(task.deadline) : null
                })) || [];
                this.categories = data.categories?.map(cat => ({
                    ...cat,
                    createdAt: new Date(cat.createdAt)
                })) || this.categories;
                this.currentTheme = data.theme || 'light';
                this.searchQuery = data.searchQuery || '';
                this.filterStatus = data.filterStatus || 'all';
                this.sortBy = data.sortBy || 'created';
            } catch (error) {
                console.error('Error loading data from storage:', error);
            }
        }
    }
    
    saveToStorage() {
        const data = {
            tasks: this.tasks,
            categories: this.categories,
            theme: this.currentTheme,
            searchQuery: this.searchQuery,
            filterStatus: this.filterStatus,
            sortBy: this.sortBy
        };
        localStorage.setItem('taskflow-data', JSON.stringify(data));
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeToggle = document.getElementById('themeToggle');
        const toggleIcon = themeToggle.querySelector('.toggle-icon');
        
        if (this.currentTheme === 'dark') {
            themeToggle.classList.add('dark');
            toggleIcon.textContent = '🌙';
        } else {
            themeToggle.classList.remove('dark');
            toggleIcon.textContent = '☀️';
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveToStorage();
    }
    
    setupEventListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        document.getElementById('categoryBtn').addEventListener('click', () => {
            this.toggleCategoryManager();
        });
        
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showTaskModal();
        });
        
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.showCategoryForm();
        });
        
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategorySubmit(e);
        });
        
        document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
            this.hideCategoryForm();
        });
        
        document.getElementById('colorPicker').addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                this.selectColor(e.target.dataset.color);
            }
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.updateSearch(e.target.value);
        });
        
        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.updateFilter(e.target.value);
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.updateSort(e.target.value);
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideTaskModal();
        });
        
        document.getElementById('cancelTaskBtn').addEventListener('click', () => {
            this.hideTaskModal();
        });
        
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') {
                this.hideTaskModal();
            }
        });
        
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit(e);
        });
        
        document.querySelector('.priority-buttons').addEventListener('click', (e) => {
            if (e.target.classList.contains('priority-btn')) {
                this.selectPriority(e.target.dataset.priority);
            }
        });
        
        document.getElementById('taskTags').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(e.target.value.trim());
                e.target.value = '';
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showTaskModal();
                        break;
                    case 'k':
                        e.preventDefault();
                        document.getElementById('searchInput').focus();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.hideTaskModal();
                this.hideCategoryForm();
            }
        });
    }
    
    toggleCategoryManager() {
        const manager = document.getElementById('categoryManager');
        const isVisible = manager.style.display !== 'none';
        manager.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            manager.classList.add('fade-in');
            this.renderCategories();
        }
    }
    
    showCategoryForm() {
        document.getElementById('categoryForm').style.display = 'block';
        document.getElementById('categoryName').focus();
        this.selectColor(this.selectedColor);
    }
    
    hideCategoryForm() {
        document.getElementById('categoryForm').style.display = 'none';
        document.getElementById('categoryName').value = '';
        this.editingCategory = null;
    }
    
    selectColor(color) {
        this.selectedColor = color;
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.color === color);
        });
    }
    
    handleCategorySubmit(e) {
        e.preventDefault();
        const name = document.getElementById('categoryName').value.trim();
        
        if (!name) return;
        
        if (this.editingCategory) {
            this.updateCategory(this.editingCategory.id, { name, color: this.selectedColor });
        } else {
            this.addCategory({ name, color: this.selectedColor });
        }
        
        this.hideCategoryForm();
    }
    
    addCategory(categoryData) {
        const newCategory = {
            id: this.generateId(),
            name: categoryData.name,
            color: categoryData.color,
            createdAt: new Date()
        };
        
        this.categories.push(newCategory);
        this.saveToStorage();
        this.renderCategories();
        this.renderTaskCategories();
    }
    
    updateCategory(categoryId, updates) {
        const index = this.categories.findIndex(cat => cat.id === categoryId);
        if (index !== -1) {
            this.categories[index] = { ...this.categories[index], ...updates };
            this.saveToStorage();
            this.renderCategories();
            this.render();
        }
    }
    
    deleteCategory(categoryId) {
        if (this.categories.length <= 1) {
            alert('You must have at least one category.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this category? Tasks will be moved to the first available category.')) {
            const remainingCategory = this.categories.find(cat => cat.id !== categoryId);
            
            this.tasks.forEach(task => {
                if (task.categoryId === categoryId) {
                    task.categoryId = remainingCategory.id;
                }
            });
            
            this.categories = this.categories.filter(cat => cat.id !== categoryId);
            this.saveToStorage();
            this.renderCategories();
            this.render();
        }
    }
    
    selectCategory(categoryId) {
        this.selectedCategoryId = this.selectedCategoryId === categoryId ? '' : categoryId;
        this.renderCategories();
        this.render();
    }
    
    showTaskModal(task = null) {
        this.editingTask = task;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitTaskBtn');
        
        title.textContent = task ? 'Edit Task' : 'Create New Task';
        submitBtn.innerHTML = `<span class="btn-icon">${task ? '✓' : '+'}</span>${task ? 'Update Task' : 'Create Task'}`;
        
        if (task) {
            this.populateTaskForm(task);
        } else {
            this.resetTaskForm();
        }
        
        modal.style.display = 'flex';
        modal.classList.add('fade-in');
        document.getElementById('taskTitle').focus();
        
        this.renderTaskCategories();
    }
    
    hideTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.editingTask = null;
        this.selectedTags = [];
        this.selectedPriority = 'medium';
    }
    
    populateTaskForm(task) {
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDeadline').value = task.deadline ? this.formatDateForInput(task.deadline) : '';
        document.getElementById('taskCategory').value = task.categoryId;
        
        this.selectedPriority = task.priority;
        this.selectedTags = [...task.tags];
        
        this.updatePriorityButtons();
        this.renderTags();
    }
    
    resetTaskForm() {
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskDeadline').value = '';
        document.getElementById('taskCategory').value = this.categories[0]?.id || '';
        
        this.selectedPriority = 'medium';
        this.selectedTags = [];
        
        this.updatePriorityButtons();
        this.renderTags();
    }
    
    selectPriority(priority) {
        this.selectedPriority = priority;
        this.updatePriorityButtons();
    }
    
    updatePriorityButtons() {
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.priority === this.selectedPriority);
        });
    }
    
    addTag(tag) {
        if (tag && !this.selectedTags.includes(tag)) {
            this.selectedTags.push(tag);
            this.renderTags();
        }
    }
    
    removeTag(tag) {
        this.selectedTags = this.selectedTags.filter(t => t !== tag);
        this.renderTags();
    }
    
    renderTags() {
        const container = document.getElementById('tagsContainer');
        container.innerHTML = this.selectedTags.map(tag => `
            <span class="tag-item">
                ${this.escapeHtml(tag)}
                <button type="button" class="tag-remove" onclick="app.removeTag('${this.escapeHtml(tag)}')">&times;</button>
            </span>
        `).join('');
    }
    
    handleTaskSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const deadline = document.getElementById('taskDeadline').value;
        const categoryId = document.getElementById('taskCategory').value;
        
        if (!title) return;
        
        const taskData = {
            title,
            description: description || null,
            deadline: deadline ? new Date(deadline) : null,
            categoryId,
            priority: this.selectedPriority,
            tags: [...this.selectedTags],
            completed: this.editingTask?.completed || false
        };
        
        if (this.editingTask) {
            this.updateTask(this.editingTask.id, taskData);
        } else {
            this.addTask(taskData);
        }
        
        this.hideTaskModal();
    }
    
    addTask(taskData) {
        const newTask = {
            id: this.generateId(),
            ...taskData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.tasks.push(newTask);
        this.saveToStorage();
        this.render();
    }
    
    updateTask(taskId, taskData) {
        const index = this.tasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
            this.tasks[index] = {
                ...this.tasks[index],
                ...taskData,
                updatedAt: new Date()
            };
            this.saveToStorage();
            this.render();
        }
    }
    
    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date();
            this.saveToStorage();
            this.render();
        }
    }
    
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveToStorage();
            this.render();
        }
    }
    
    updateSearch(query) {
        this.searchQuery = query;
        this.saveToStorage();
        this.render();
    }
    
    updateFilter(status) {
        this.filterStatus = status;
        document.getElementById('filterStatus').value = status;
        this.saveToStorage();
        this.render();
    }
    
    updateSort(sortBy) {
        this.sortBy = sortBy;
        document.getElementById('sortBy').value = sortBy;
        this.saveToStorage();
        this.render();
    }
    
    getFilteredAndSortedTasks() {
        return this.tasks
            .filter(task => {
                const matchesSearch = !this.searchQuery || 
                    task.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    (task.description && task.description.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                    task.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase()));
                
                const matchesFilter = this.filterStatus === 'all' ||
                    (this.filterStatus === 'active' && !task.completed) ||
                    (this.filterStatus === 'completed' && task.completed);
                
                const matchesCategory = !this.selectedCategoryId || task.categoryId === this.selectedCategoryId;
                
                return matchesSearch && matchesFilter && matchesCategory;
            })
            .sort((a, b) => {
                switch (this.sortBy) {
                    case 'deadline':
                        if (!a.deadline && !b.deadline) return 0;
                        if (!a.deadline) return 1;
                        if (!b.deadline) return -1;
                        return a.deadline.getTime() - b.deadline.getTime();
                    case 'priority':
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                    default:
                        return b.createdAt.getTime() - a.createdAt.getTime();
                }
            });
    }
    
    render() {
        this.updateTaskStats();
        this.renderTaskLists();
        this.updateSearchInputs();
    }
    
    updateTaskStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const statsElement = document.getElementById('taskStats');
        
        if (totalTasks === 0) {
            statsElement.textContent = 'Start organizing your tasks';
        } else {
            statsElement.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
        }
    }
    
    updateSearchInputs() {
        document.getElementById('searchInput').value = this.searchQuery;
        document.getElementById('filterStatus').value = this.filterStatus;
        document.getElementById('sortBy').value = this.sortBy;
    }
    
    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        grid.innerHTML = this.categories.map(category => `
            <div class="category-item ${this.selectedCategoryId === category.id ? 'selected' : ''}" 
                 onclick="app.selectCategory('${category.id}')" tabindex="0">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <div class="category-actions">
                    <button class="category-action edit" onclick="event.stopPropagation(); app.editCategory('${category.id}')" title="Edit">✏️</button>
                    <button class="category-action delete" onclick="event.stopPropagation(); app.deleteCategory('${category.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    renderTaskCategories() {
        const select = document.getElementById('taskCategory');
        select.innerHTML = this.categories.map(category => `
            <option value="${category.id}">${this.escapeHtml(category.name)}</option>
        `).join('');
    }
    
    renderTaskLists() {
        const container = document.getElementById('taskLists');
        const filteredTasks = this.getFilteredAndSortedTasks();
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No tasks found</h3>
                    <p>Create your first task to get started with organizing your work.</p>
                </div>
            `;
            return;
        }
        
        const categoriesToShow = this.selectedCategoryId 
            ? this.categories.filter(cat => cat.id === this.selectedCategoryId)
            : this.categories;
        
        container.innerHTML = categoriesToShow.map(category => {
            const categoryTasks = filteredTasks.filter(task => task.categoryId === category.id);
            
            if (categoryTasks.length === 0 && this.selectedCategoryId) return '';
            
            const completedCount = categoryTasks.filter(task => task.completed).length;
            const progress = categoryTasks.length > 0 ? Math.round((completedCount / categoryTasks.length) * 100) : 0;
            
            return `
                <div class="task-category slide-up">
                    <div class="category-header">
                        <div class="category-title">
                            <div class="category-color" style="background-color: ${category.color}"></div>
                            <h2>${this.escapeHtml(category.name)}</h2>
                            <span class="task-count">${completedCount} of ${categoryTasks.length} completed</span>
                        </div>
                        ${categoryTasks.length > 0 ? `
                            <div class="progress-section">
                                <span class="progress-text">📊</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%; background-color: ${category.color}"></div>
                                </div>
                                <span class="progress-text">${progress}%</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${categoryTasks.length > 0 ? `
                        <div class="task-list">
                            ${categoryTasks.map(task => this.renderTask(task, category)).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">✅</div>
                            <p>No tasks in this category yet</p>
                        </div>
                    `}
                </div>
            `;
        }).filter(html => html).join('');
        
        this.setupTaskEventListeners();
    }
    
    renderTask(task, category) {
        const deadlineInfo = task.deadline ? this.getTimeUntilDeadline(task.deadline) : null;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" 
                 draggable="true" 
                 data-task-id="${task.id}"
                 tabindex="0">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
                     onclick="app.toggleTaskComplete('${task.id}')">
                    ${task.completed ? '✓' : ''}
                </div>
                
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    
                    <div class="task-meta">
                        <span class="task-badge badge-priority ${task.priority}">
                            ${this.getPriorityIcon(task.priority)} ${task.priority}
                        </span>
                        
                        ${deadlineInfo ? `
                            <span class="task-badge badge-deadline ${deadlineInfo.isOverdue ? 'overdue' : deadlineInfo.isUrgent ? 'urgent' : ''}">
                                ${deadlineInfo.isOverdue ? '⚠️' : '⏰'} ${deadlineInfo.text}
                            </span>
                        ` : ''}
                        
                        ${task.tags.slice(0, 2).map(tag => `
                            <span class="task-badge badge-tag">🏷️ ${this.escapeHtml(tag)}</span>
                        `).join('')}
                        
                        ${task.tags.length > 2 ? `<span class="task-badge">+${task.tags.length - 2}</span>` : ''}
                    </div>
                    
                    ${task.deadline ? `
                        <div class="task-meta" style="margin-top: 0.5rem;">
                            <small style="color: var(--text-tertiary);">📅 Due: ${this.formatDate(task.deadline)}</small>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-actions">
                    <button class="task-action edit" onclick="app.showTaskModal(app.getTask('${task.id}'))" title="Edit">✏️</button>
                    <button class="task-action delete" onclick="app.deleteTask('${task.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }
    
    setupTaskEventListeners() {
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
                e.target.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = e.target.closest('.task-item')?.dataset.taskId;
                
                if (draggedId && targetId && draggedId !== targetId) {
                    this.reorderTasks(draggedId, targetId);
                }
            });
        });
    }
    
    reorderTasks(draggedId, targetId) {
        const draggedIndex = this.tasks.findIndex(task => task.id === draggedId);
        const targetIndex = this.tasks.findIndex(task => task.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedTask] = this.tasks.splice(draggedIndex, 1);
            this.tasks.splice(targetIndex, 0, draggedTask);
            this.saveToStorage();
            this.render();
        }
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    getTask(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }
    
    editCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
            this.editingCategory = category;
            document.getElementById('categoryName').value = category.name;
            this.selectColor(category.color);
            this.showCategoryForm();
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    getTimeUntilDeadline(deadline) {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        
        if (diff < 0) {
            const hoursOverdue = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
            return {
                text: hoursOverdue < 24 ? `${hoursOverdue}h overdue` : `${Math.floor(hoursOverdue / 24)}d overdue`,
                isOverdue: true,
                isUrgent: false
            };
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (hours < 24) {
            return {
                text: `${hours}h left`,
                isOverdue: false,
                isUrgent: hours < 6
            };
        }
        
        return {
            text: `${days}d left`,
            isOverdue: false,
            isUrgent: days < 2
        };
    }
    
    getPriorityIcon(priority) {
        const icons = {
            low: '🟢',
            medium: '🟡',
            high: '🔴'
        };
        return icons[priority] || '🟡';
    }
}

// Initialize the application
const app = new TaskFlowApp();

// Make app globally available for onclick handlers
window.app = app;