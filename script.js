document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tasksContainer = document.getElementById('tasksContainer');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskModal = document.getElementById('taskModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    const updateTaskBtn = document.getElementById('updateTaskBtn');
    const themeToggle = document.getElementById('themeToggle');
    
    // Form elements
    const taskTitleInput = document.getElementById('taskTitle');
    const taskPriorityInput = document.getElementById('taskPriority');
    const taskCategorySelect = document.getElementById('taskCategory');
    const taskDueDateInput = document.getElementById('taskDueDate');
    const taskDueTimeInput = document.getElementById('taskDueTime');
    const timePeriodSelect = document.getElementById('timePeriod');
    const taskNotesInput = document.getElementById('taskNotes');
    const categoryFilter = document.getElementById('categoryFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    
    // Priority selector buttons
    const priorityOptions = document.querySelectorAll('.priority-option');
    
    // Task data and state
    let tasks = [];
    let currentTaskId = null;
    let isEditing = false;
    let notificationTimeouts = {};
    
    // Initialize the app
    async function init() {
        await registerServiceWorker();
        loadTasks();
        setupEventListeners();
        applySavedTheme();
        renderTasks();
        setDefaultDueDate();
        setupNotificationChecks();
    }
    
    // Register Service Worker for background sync
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            // Clear any old notification timeouts
            clearAllNotificationTimeouts();
            // Setup notifications for existing tasks
            setupNotificationsForTasks();
        }
    }
    
    // Clear all notification timeouts
    function clearAllNotificationTimeouts() {
        Object.values(notificationTimeouts).forEach(timeout => {
            clearTimeout(timeout);
        });
        notificationTimeouts = {};
    }
    
    // Set up notifications for all tasks
    function setupNotificationsForTasks() {
        tasks.forEach(task => {
            if (!task.completed && task.dueDate) {
                scheduleNotification(task);
            }
        });
    }
    
    // Set up periodic checks for missed notifications
    function setupNotificationChecks() {
        setInterval(() => {
            checkMissedNotifications();
        }, 60000); // Check every minute
    }
    
    // Check for any missed notifications
    function checkMissedNotifications() {
        const now = new Date();
        tasks.forEach(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                // If task is past due but not notified in the last hour
                if (dueDate < now && (!task.lastNotified || new Date(task.lastNotified) < new Date(now.getTime() - 3600000))) {
                    showNotification(task);
                    // Update lastNotified
                    task.lastNotified = new Date().toISOString();
                    saveTasksToLocalStorage();
                }
            }
        });
    }
    
    // Schedule notification for a task
    function scheduleNotification(task) {
        if (task.completed || !task.dueDate) return;
        
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const timeUntilDue = dueDate.getTime() - now.getTime();
        
        // Only schedule if due date is in the future
        if (timeUntilDue > 0) {
            // Clear any existing timeout for this task
            if (notificationTimeouts[task.id]) {
                clearTimeout(notificationTimeouts[task.id]);
            }
            
            notificationTimeouts[task.id] = setTimeout(() => {
                showNotification(task);
                // Update lastNotified
                task.lastNotified = new Date().toISOString();
                saveTasksToLocalStorage();
            }, timeUntilDue);
        }
    }
    
    // Show browser notification
    function showNotification(task) {
        // Request permission if not already granted
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    createNotification(task);
                }
            });
        } else {
            createNotification(task);
        }
    }
    
    // Create the actual notification
    function createNotification(task) {
        const notificationTitle = `Task Due: ${task.title}`;
        let notificationBody = `Category: ${task.category}\nPriority: ${task.priority}`;
        
        if (task.notes) {
            notificationBody += `\nNotes: ${task.notes}`;
        }
        
        // Show browser notification
        if ('Notification' in window) {
            new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/icon-192x192.png',
                tag: `task-${task.id}`
            });
        }
        
        // Also show in-app notification if tab is active
        if (!document.hidden) {
            showInAppNotification(notificationTitle, notificationBody);
        }
    }
    
    // Show in-app notification toast
    function showInAppNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        addTaskBtn.addEventListener('click', openAddTaskModal);
        closeModalBtn.addEventListener('click', closeTaskModal);
        cancelTaskBtn.addEventListener('click', closeTaskModal);
        saveTaskBtn.addEventListener('click', saveTask);
        updateTaskBtn.addEventListener('click', updateTask);
        themeToggle.addEventListener('click', toggleTheme);
        
        // Priority selector
        priorityOptions.forEach(option => {
            option.addEventListener('click', function() {
                selectPriority(this);
            });
        });
        
        // Filter controls
        categoryFilter.addEventListener('change', renderTasks);
        priorityFilter.addEventListener('change', renderTasks);
        
        // Close modal when clicking outside
        taskModal.addEventListener('click', function(e) {
            if (e.target === taskModal) {
                closeTaskModal();
            }
        });
        
        // Request notification permission on first interaction
        document.addEventListener('click', requestNotificationPermission, { once: true });
    }
    
    // Request notification permission
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }
    
    // Set default due date to today
    function setDefaultDueDate() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        taskDueDateInput.min = formattedDate;
    }
    
    // Theme management
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Priority selection
    function selectPriority(selectedOption) {
        const value = selectedOption.dataset.value;
        
        priorityOptions.forEach(option => {
            option.classList.remove('active');
        });
        
        selectedOption.classList.add('active');
        taskPriorityInput.value = value;
    }
    
    // Open modal for adding a new task
    function openAddTaskModal() {
        resetForm();
        isEditing = false;
        document.getElementById('modalTitle').textContent = 'Add New Task';
        saveTaskBtn.style.display = 'block';
        updateTaskBtn.style.display = 'none';
        showModal();
    }
    
    // Open modal for editing an existing task
    function openEditTaskModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        currentTaskId = taskId;
        isEditing = true;
        
        // Fill the form with task data
        taskTitleInput.value = task.title;
        taskNotesInput.value = task.notes || '';
        taskCategorySelect.value = task.category;
        
        // Set priority
        priorityOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.value === task.priority) {
                option.classList.add('active');
            }
        });
        taskPriorityInput.value = task.priority;
        
        // Set due date and time
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const formattedDate = dueDate.toISOString().split('T')[0];
            taskDueDateInput.value = formattedDate;
            
            if (task.dueTime) {
                const [hours, minutes] = task.dueTime.split(':');
                const hourNum = parseInt(hours, 10);
                const displayHours = hourNum % 12 || 12;
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                
                taskDueTimeInput.value = `${displayHours.toString().padStart(2, '0')}:${minutes}`;
                timePeriodSelect.value = ampm;
            }
        }
        
        document.getElementById('modalTitle').textContent = 'Edit Task';
        saveTaskBtn.style.display = 'none';
        updateTaskBtn.style.display = 'block';
        showModal();
    }
    
    // Show modal with animation
    function showModal() {
        taskModal.style.display = 'flex';
        setTimeout(() => {
            taskModal.classList.add('show');
        }, 10);
    }
    
    // Close the modal
    function closeTaskModal() {
        taskModal.classList.remove('show');
        setTimeout(() => {
            taskModal.style.display = 'none';
        }, 300);
    }
    
    // Reset the form
    function resetForm() {
        taskTitleInput.value = '';
        taskNotesInput.value = '';
        taskCategorySelect.value = 'work';
        taskDueDateInput.value = '';
        taskDueTimeInput.value = '';
        timePeriodSelect.value = 'AM';
        
        // Reset priority to medium
        priorityOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.value === 'medium') {
                option.classList.add('active');
            }
        });
        taskPriorityInput.value = 'medium';
        
        currentTaskId = null;
    }
    
    // Save a new task
    function saveTask() {
        const title = taskTitleInput.value.trim();
        if (!title) {
            showError(taskTitleInput, 'Task title is required');
            return;
        }
        
        const priority = taskPriorityInput.value;
        const category = taskCategorySelect.value;
        const notes = taskNotesInput.value.trim();
        let dueDate = null;
        let dueTime = null;
        
        if (taskDueDateInput.value) {
            dueDate = new Date(taskDueDateInput.value);
            
            if (taskDueTimeInput.value) {
                let hours = parseInt(taskDueTimeInput.value.split(':')[0], 10);
                const minutes = parseInt(taskDueTimeInput.value.split(':')[1], 10);
                
                // Convert to 24-hour format
                if (timePeriodSelect.value === 'PM' && hours < 12) {
                    hours += 12;
                } else if (timePeriodSelect.value === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                dueDate.setHours(hours);
                dueDate.setMinutes(minutes);
                dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        }
        
        const newTask = {
            id: Date.now().toString(),
            title,
            priority,
            category,
            dueDate: dueDate ? dueDate.toISOString() : null,
            dueTime,
            notes,
            completed: false,
            createdAt: new Date().toISOString(),
            lastNotified: null
        };
        
        tasks.push(newTask);
        saveTasksToLocalStorage();
        renderTasks();
        scheduleNotification(newTask);
        closeTaskModal();
        
        // Add glow effect to the new task
        const newTaskElement = document.querySelector(`[data-task-id="${newTask.id}"]`);
        if (newTaskElement) {
            newTaskElement.classList.add('glow');
            setTimeout(() => {
                newTaskElement.classList.remove('glow');
            }, 2000);
        }
    }
    
    // Update an existing task
    function updateTask() {
        const title = taskTitleInput.value.trim();
        if (!title) {
            showError(taskTitleInput, 'Task title is required');
            return;
        }
        
        const taskIndex = tasks.findIndex(t => t.id === currentTaskId);
        if (taskIndex === -1) return;
        
        const priority = taskPriorityInput.value;
        const category = taskCategorySelect.value;
        const notes = taskNotesInput.value.trim();
        let dueDate = null;
        let dueTime = null;
        
        if (taskDueDateInput.value) {
            dueDate = new Date(taskDueDateInput.value);
            
            if (taskDueTimeInput.value) {
                let hours = parseInt(taskDueTimeInput.value.split(':')[0], 10);
                const minutes = parseInt(taskDueTimeInput.value.split(':')[1], 10);
                
                // Convert to 24-hour format
                if (timePeriodSelect.value === 'PM' && hours < 12) {
                    hours += 12;
                } else if (timePeriodSelect.value === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                dueDate.setHours(hours);
                dueDate.setMinutes(minutes);
                dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        }
        
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            title,
            priority,
            category,
            dueDate: dueDate ? dueDate.toISOString() : null,
            dueTime,
            notes,
            lastNotified: null
        };
        
        saveTasksToLocalStorage();
        renderTasks();
        scheduleNotification(tasks[taskIndex]);
        closeTaskModal();
    }
    
    // Delete a task
    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            // Clear any scheduled notification
            if (notificationTimeouts[taskId]) {
                clearTimeout(notificationTimeouts[taskId]);
                delete notificationTimeouts[taskId];
            }
            
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasksToLocalStorage();
            renderTasks();
        }
    }
    
    // Toggle task completion status
    function toggleTaskCompletion(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            
            // Clear or set notification based on completion status
            if (task.completed && notificationTimeouts[taskId]) {
                clearTimeout(notificationTimeouts[taskId]);
                delete notificationTimeouts[taskId];
            } else if (!task.completed && task.dueDate) {
                scheduleNotification(task);
            }
            
            saveTasksToLocalStorage();
            renderTasks();
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('task-complete-animation');
                setTimeout(() => {
                    taskElement.classList.remove('task-complete-animation');
                }, 300);
            }
        }
    }
    
    // Save tasks to localStorage
    function saveTasksToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Render all tasks with filtering
    function renderTasks() {
        const selectedCategory = categoryFilter.value;
        const selectedPriority = priorityFilter.value;
        
        let filteredTasks = [...tasks];
        
        if (selectedCategory !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.category === selectedCategory);
        }
        
        if (selectedPriority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === selectedPriority);
        }
        
        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="no-tasks">
                    <div class="no-tasks-icon">
                        <i class="fas fa-cloud"></i>
                    </div>
                    <h3>No tasks found</h3>
                    <p>Try changing your filters or add a new task</p>
                </div>
            `;
            return;
        }
        
        // Sort tasks: incomplete first, then by due date
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        tasksContainer.innerHTML = filteredTasks.map(task => createTaskElement(task)).join('');
        
        // Add event listeners to all task action buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditTaskModal(btn.dataset.taskId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(btn.dataset.taskId);
            });
        });
        
        document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                toggleTaskCompletion(checkbox.dataset.taskId);
            });
        });
    }
    
    // Create HTML for a single task
    function createTaskElement(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const formattedDate = dueDate ? dueDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) : 'No due date';
        
        let formattedTime = '';
        if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':');
            const hourNum = parseInt(hours, 10);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const displayHours = hourNum % 12 || 12;
            formattedTime = `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }
        
        const priorityClass = `priority-${task.priority}`;
        const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        const categoryText = task.category.charAt(0).toUpperCase() + task.category.slice(1);
        
        return `
            <div class="task ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-checkbox">
                        <input 
                            type="checkbox" 
                            id="task-${task.id}" 
                            data-task-id="${task.id}" 
                            ${task.completed ? 'checked' : ''}
                        >
                        <label for="task-${task.id}" class="task-title">${task.title}</label>
                    </div>
                    <div class="task-actions">
                        <button class="edit-btn" data-task-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-task-id="${task.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="task-details">
                    <div class="task-detail ${priorityClass}">
                        <span class="priority-dot"></span>
                        <span>${priorityText}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-tag"></i>
                        <span class="category-tag">${categoryText}</span>
                    </div>
                </div>
                <div class="task-due">
                    <div class="due-date">
                        <i class="far fa-calendar-alt"></i>
                        <span>${formattedDate}</span>
                    </div>
                    ${formattedTime ? `
                        <div class="due-time">
                            <i class="far fa-clock"></i>
                            <span>${formattedTime}</span>
                        </div>
                    ` : ''}
                </div>
                ${task.notes ? `
                    <div class="task-notes">
                        <p>${task.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Show error message
    function showError(input, message) {
        const formGroup = input.closest('.form-group');
        let errorElement = formGroup.querySelector('.error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('small');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.color = 'var(--danger-color)';
        
        input.style.borderColor = 'var(--danger-color)';
        setTimeout(() => {
            input.style.borderColor = 'var(--light-gray)';
        }, 2000);
    }
    
    // Initialize the application
    init();
});