// Global variables
let currentRole = null;
let surveyData = {
    title: 'The Answer Trap Risk Profile Survey',
    banner: '',
    introText: '',
    introQuestions: [],
    categories: [],
    scoringRanges: [],
    emailSettings: {}
};

// Security and validation functions
function validateEmailInput(input, isRequired = false) {
    const value = input.value.trim();
    const errorElement = document.getElementById(input.id + '-error');
    
    // Clear previous error
    clearValidationError(input, errorElement);
    
    if (!value) {
        if (isRequired) {
            showValidationError(input, errorElement, 'Email address is required');
            return false;
        }
        return true; // Empty is valid for optional fields
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(value) || value.length > 254) {
        showValidationError(input, errorElement, 'Please enter a valid email address');
        return false;
    }
    
    return true;
}

// XSS protection function
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function sanitizeHostInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    // Allow fqdn and ip address characters
    return input.replace(/[^a-zA-Z0-9\.\-]/g, '');
}

let userResponses = {
    intro: {},
    categorical: {}
};

let currentQuestionIndex = 0;
let allQuestions = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    const emailForm = document.getElementById('admin-email');
    if (emailForm) {
        emailForm.addEventListener('submit', saveEmailSettings);
    }
    console.log('DOM Content Loaded - Script is running');
    await loadSurveyData();
    
    // Initialize email template
    await initializeEmailTemplate();
    
    // Check if this is a shared results link
    const urlParams = new URLSearchParams(window.location.search);
    const sharedResults = urlParams.get('results');
    
    if (sharedResults) {
        try {
            // Decode and parse shared results
            const decodedResults = atob(sharedResults);
            const sharedUserResponses = JSON.parse(decodedResults);
            
            // Set the shared responses and calculate results
            userResponses = sharedUserResponses;
            const results = calculateResults();
            
            // Display the shared results
            displaySharedResults(results);
        } catch (error) {
            console.error('Error loading shared results:', error);
            showScreen('login-screen');
            showMessage('Invalid shared results link', 'error');
        }
    } else {
        showScreen('login-screen');
    }
});

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Role selection
async function setRole(role) {
    console.log('setRole called with role:', role);
    currentRole = role;
    if (role === 'admin') {
        console.log('Showing admin screen');
        showScreen('admin-screen');
        await initializeAdminInterface();
    } else {
        console.log('Showing survey screen');
        showScreen('survey-screen');
        initializeSurvey();
    }
}

function backToLogin() {
    currentRole = null;
    currentQuestionIndex = 0;
    userResponses = { intro: {}, categorical: {} };
    showScreen('login-screen');
}

// Admin functionality
function showAdminSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`admin-${sectionId}`).classList.add('active');
    event.target.classList.add('active');
}

function openAnalyticsDashboard() {
    // Open analytics dashboard in a new window/tab
    const analyticsUrl = '/analytics';
    const analyticsWindow = window.open(analyticsUrl, 'analytics', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    
    if (!analyticsWindow) {
        // Fallback if popup is blocked
        window.location.href = analyticsUrl;
    }
}

async function initializeAdminInterface() {
    // Load existing data into admin forms
    document.getElementById('survey-title-input').value = surveyData.title;
    document.getElementById('intro-text-input').value = surveyData.introText || '';
    
    // Show current banner if available
    if (surveyData.banner) {
        const bannerPreview = document.createElement('div');
        bannerPreview.id = 'current-banner-preview';
        bannerPreview.innerHTML = `
            <div style="margin: 10px 0;">
                <label>Current Banner:</label>
                <div style="border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #f9f9f9;">
                    <img src="${surveyData.banner}" alt="Current Banner" style="max-width: 200px; max-height: 100px; object-fit: contain;">
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Upload a new image to replace this banner</p>
                </div>
            </div>
        `;
        
        // Insert before the banner upload input
        const bannerUpload = document.getElementById('banner-upload');
        const bannerGroup = bannerUpload.closest('.form-group');
        bannerGroup.parentNode.insertBefore(bannerPreview, bannerGroup);
    }
    
    // Initialize admin sections
    renderIntroQuestions();
    renderCategories();
    renderScoringRanges();
    await loadEmailSettings();
}

// Basic settings
async function saveBasicSettings() {
    // Validate inputs before saving
    const titleInput = document.getElementById('survey-title-input');
    const bannerInput = document.getElementById('banner-upload');
    
    // Sanitize title input
    const sanitizedTitle = sanitizeInput(titleInput.value.trim());
    if (!sanitizedTitle) {
        showMessage('Survey title is required', 'error');
        return;
    }
    
    // Validate file upload if present
    if (bannerInput.files[0]) {
        const isValid = await validateFileUpload(bannerInput);
        if (!isValid) {
            return; // Validation failed, error already shown
        }
    }
    
    surveyData.title = sanitizedTitle;
    document.getElementById('survey-title').textContent = surveyData.title;
    
    const bannerFile = bannerInput.files[0];
    const formData = new FormData();
    formData.append('title', sanitizedTitle);

    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    fetch('/api/save-basic-settings', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            surveyData.title = sanitizedTitle;
            document.getElementById('survey-title').textContent = surveyData.title;

            if (data.bannerUrl) {
                surveyData.banner = data.bannerUrl;
                const bannerImg = document.getElementById('banner-image');
                bannerImg.src = surveyData.banner;
                bannerImg.style.display = 'block';
                
                // Update admin banner preview
                const existingPreview = document.getElementById('current-banner-preview');
                if (existingPreview) {
                    existingPreview.remove();
                }
                
                // Create new banner preview
                const bannerPreview = document.createElement('div');
                bannerPreview.id = 'current-banner-preview';
                bannerPreview.innerHTML = `
                    <div style="margin: 10px 0;">
                        <label>Current Banner:</label>
                        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #f9f9f9;">
                            <img src="${surveyData.banner}" alt="Current Banner" style="max-width: 200px; max-height: 100px; object-fit: contain;">
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Upload a new image to replace this banner</p>
                        </div>
                    </div>
                `;
                
                // Insert before the banner upload input
                const bannerUpload = document.getElementById('banner-upload');
                const bannerGroup = bannerUpload.closest('.form-group');
                bannerGroup.parentNode.insertBefore(bannerPreview, bannerGroup);
            }
            showMessage('Basic settings saved successfully!', 'success');
        } else {
            showMessage(data.message || 'Failed to save basic settings.', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving basic settings:', error);
        showMessage('An error occurred while saving basic settings.', 'error');
    });
}

// Introduction questions management
function addIntroQuestion() {
    const question = {
        id: Date.now(),
        text: '',
        options: ['Option 1', 'Option 2', 'Option 3']
    };
    surveyData.introQuestions.push(question);
    renderIntroQuestions();
}

function renderIntroQuestions() {
    const container = document.getElementById('intro-questions-container');
    container.innerHTML = '';
    
    surveyData.introQuestions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'intro-question-item';
        questionDiv.innerHTML = `
            <div class="form-group">
                <label>Question ${index + 1}:</label>
                <input type="text" value="${question.text}" onchange="updateIntroQuestion(${index}, 'text', this.value)" placeholder="Enter question text">
            </div>
            <div class="form-group">
                <label>Answer Options:</label>
                ${question.options.map((option, optIndex) => `
                    <div class="answer-option">
                        <input type="text" value="${option}" onchange="updateIntroQuestionOption(${index}, ${optIndex}, this.value)" placeholder="Option ${optIndex + 1}">
                        ${question.options.length > 1 ? `<button type="button" class="remove-btn" onclick="removeIntroQuestionOption(${index}, ${optIndex})">Remove</button>` : ''}
                    </div>
                `).join('')}
                <button type="button" class="add-btn" onclick="addIntroQuestionOption(${index})">Add Option</button>
            </div>
            <button type="button" class="remove-btn" onclick="removeIntroQuestion(${index})">Remove Question</button>
        `;
        container.appendChild(questionDiv);
    });
}

function updateIntroQuestion(index, field, value) {
    surveyData.introQuestions[index][field] = value;
}

function updateIntroQuestionOption(questionIndex, optionIndex, value) {
    surveyData.introQuestions[questionIndex].options[optionIndex] = value;
}

function addIntroQuestionOption(questionIndex) {
    surveyData.introQuestions[questionIndex].options.push('New Option');
    renderIntroQuestions();
}

function removeIntroQuestionOption(questionIndex, optionIndex) {
    if (surveyData.introQuestions[questionIndex].options.length > 1) {
        surveyData.introQuestions[questionIndex].options.splice(optionIndex, 1);
        renderIntroQuestions();
    }
}

function removeIntroQuestion(index) {
    surveyData.introQuestions.splice(index, 1);
    renderIntroQuestions();
}

async function saveIntroQuestions() {
    // Save the introduction text
    surveyData.introText = document.getElementById('intro-text-input').value;
    await saveSurveyData();
    showMessage('Introduction questions saved successfully!', 'success');
}

// Categories and questions management
function addCategory() {
    const category = {
        id: Date.now(),
        name: '',
        description: '',
        questions: [],
        scoringRanges: [
            {
                id: Date.now() + 1,
                minScore: 0,
                maxScore: 40,
                title: 'Low',
                description: 'Low performance in this category',
                color: '#2ecc71'
            },
            {
                id: Date.now() + 2,
                minScore: 41,
                maxScore: 70,
                title: 'Moderate',
                description: 'Moderate performance in this category',
                color: '#f39c12'
            },
            {
                id: Date.now() + 3,
                minScore: 71,
                maxScore: 100,
                title: 'High',
                description: 'High performance in this category',
                color: '#e74c3c'
            }
        ]
    };
    surveyData.categories.push(category);
    renderCategories();
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    surveyData.categories.forEach((category, catIndex) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item';
        categoryDiv.innerHTML = `
            <div class="form-group">
                <label>Category Name:</label>
                <input type="text" value="${category.name}" onchange="updateCategory(${catIndex}, 'name', this.value)" placeholder="Enter category name">
            </div>
            <div class="form-group">
                <label>Category Description:</label>
                <textarea onchange="updateCategory(${catIndex}, 'description', this.value)" placeholder="Enter category description..." rows="3">${category.description || ''}</textarea>
            </div>
            <div class="questions-container">
                <h4>Questions:</h4>
                <div id="questions-${catIndex}">
                    ${renderCategoryQuestions(category.questions, catIndex)}
                </div>
                <button type="button" class="add-btn" onclick="addCategoryQuestion(${catIndex})">Add Question</button>
            </div>
            <div class="scoring-ranges-container">
                <h4>Scoring Ranges:</h4>
                <div id="category-ranges-${catIndex}">
                    ${renderCategoryScoringRanges(category.scoringRanges || [], catIndex)}
                </div>
                <button type="button" class="add-btn" onclick="addCategoryScoringRange(${catIndex})">Add Range</button>
            </div>
            <button type="button" class="remove-btn" onclick="removeCategory(${catIndex})">Remove Category</button>
        `;
        container.appendChild(categoryDiv);
    });
}

function renderCategoryQuestions(questions, catIndex) {
    return questions.map((question, qIndex) => `
        <div class="question-item">
            <div class="form-group">
                <label>Question ${qIndex + 1}:</label>
                <input type="text" value="${question.text}" onchange="updateCategoryQuestion(${catIndex}, ${qIndex}, 'text', this.value)" placeholder="Enter question text">
            </div>
            <div class="form-group">
                <label>Answer Options (3 required):</label>
                ${question.options.map((option, optIndex) => `
                    <div class="answer-option">
                        <input type="text" value="${option.text}" onchange="updateQuestionOption(${catIndex}, ${qIndex}, ${optIndex}, 'text', this.value)" placeholder="Option ${optIndex + 1}">
                        <input type="number" value="${option.score}" onchange="updateQuestionOption(${catIndex}, ${qIndex}, ${optIndex}, 'score', parseInt(this.value))" placeholder="Score" min="0" max="10">
                    </div>
                `).join('')}
            </div>
            <button type="button" class="remove-btn" onclick="removeCategoryQuestion(${catIndex}, ${qIndex})">Remove Question</button>
        </div>
    `).join('');
}

function addCategoryQuestion(catIndex) {
    const question = {
        id: Date.now(),
        text: '',
        options: [
            { text: 'Option 1', score: 1 },
            { text: 'Option 2', score: 2 },
            { text: 'Option 3', score: 3 }
        ]
    };
    surveyData.categories[catIndex].questions.push(question);
    renderCategories();
}

function updateCategory(index, field, value) {
    surveyData.categories[index][field] = value;
}

function updateCategoryQuestion(catIndex, qIndex, field, value) {
    surveyData.categories[catIndex].questions[qIndex][field] = value;
}

function updateQuestionOption(catIndex, qIndex, optIndex, field, value) {
    surveyData.categories[catIndex].questions[qIndex].options[optIndex][field] = value;
}

function removeCategoryQuestion(catIndex, qIndex) {
    surveyData.categories[catIndex].questions.splice(qIndex, 1);
    renderCategories();
}

function removeCategory(index) {
    surveyData.categories.splice(index, 1);
    renderCategories();
}

async function saveCategoriesQuestions() {
    await saveSurveyData();
    showMessage('Categories and questions saved successfully!', 'success');
}

// Category-specific scoring ranges management
function renderCategoryScoringRanges(ranges, catIndex) {
    return ranges.map((range, rangeIndex) => `
        <div class="scoring-range-item" style="margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <div class="form-group">
                <label>Range Title:</label>
                <input type="text" value="${range.title}" onchange="updateCategoryScoringRange(${catIndex}, ${rangeIndex}, 'title', this.value)" placeholder="e.g., Low Risk">
            </div>
            <div class="form-group">
                <label>Score Range:</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" value="${range.minScore}" onchange="updateCategoryScoringRange(${catIndex}, ${rangeIndex}, 'minScore', parseInt(this.value))" placeholder="Min" min="0" max="100">
                    <span>to</span>
                    <input type="number" value="${range.maxScore}" onchange="updateCategoryScoringRange(${catIndex}, ${rangeIndex}, 'maxScore', parseInt(this.value))" placeholder="Max" min="0" max="100">
                    <span>%</span>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea onchange="updateCategoryScoringRange(${catIndex}, ${rangeIndex}, 'description', this.value)" placeholder="Description for this score range">${range.description}</textarea>
            </div>
            <div class="form-group">
                <label>Color:</label>
                <input type="color" class="color-picker" value="${range.color}" onchange="updateCategoryScoringRange(${catIndex}, ${rangeIndex}, 'color', this.value)">
            </div>
            <button type="button" class="remove-btn" onclick="removeCategoryScoringRange(${catIndex}, ${rangeIndex})">Remove Range</button>
        </div>
    `).join('');
}

function addCategoryScoringRange(catIndex) {
    const range = {
        id: Date.now(),
        minScore: 0,
        maxScore: 100,
        title: '',
        description: '',
        color: '#3498db'
    };
    if (!surveyData.categories[catIndex].scoringRanges) {
        surveyData.categories[catIndex].scoringRanges = [];
    }
    surveyData.categories[catIndex].scoringRanges.push(range);
    renderCategories();
}

function updateCategoryScoringRange(catIndex, rangeIndex, field, value) {
    surveyData.categories[catIndex].scoringRanges[rangeIndex][field] = value;
}

function removeCategoryScoringRange(catIndex, rangeIndex) {
    surveyData.categories[catIndex].scoringRanges.splice(rangeIndex, 1);
    renderCategories();
}

// Scoring ranges management
function addScoringRange() {
    const range = {
        id: Date.now(),
        minScore: 0,
        maxScore: 100,
        title: '',
        description: '',
        color: '#3498db'
    };
    surveyData.scoringRanges.push(range);
    renderScoringRanges();
}

function renderScoringRanges() {
    const container = document.getElementById('scoring-ranges-container');
    container.innerHTML = '';
    
    surveyData.scoringRanges.forEach((range, index) => {
        const rangeDiv = document.createElement('div');
        rangeDiv.className = 'scoring-range-item';
        rangeDiv.innerHTML = `
            <div class="form-group">
                <label>Range Title:</label>
                <input type="text" value="${range.title}" onchange="updateScoringRange(${index}, 'title', this.value)" placeholder="e.g., Low Risk">
            </div>
            <div class="form-group">
                <label>Score Range:</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" value="${range.minScore}" onchange="updateScoringRange(${index}, 'minScore', parseInt(this.value))" placeholder="Min" min="0" max="100">
                    <span>to</span>
                    <input type="number" value="${range.maxScore}" onchange="updateScoringRange(${index}, 'maxScore', parseInt(this.value))" placeholder="Max" min="0" max="100">
                    <span>%</span>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea onchange="updateScoringRange(${index}, 'description', this.value)" placeholder="Description for this score range">${range.description}</textarea>
            </div>
            <div class="form-group">
                <label>Color:</label>
                <input type="color" class="color-picker" value="${range.color}" onchange="updateScoringRange(${index}, 'color', this.value)">
            </div>
            <button type="button" class="remove-btn" onclick="removeScoringRange(${index})">Remove Range</button>
        `;
        container.appendChild(rangeDiv);
    });
}

function updateScoringRange(index, field, value) {
    surveyData.scoringRanges[index][field] = value;
}

function removeScoringRange(index) {
    surveyData.scoringRanges.splice(index, 1);
    renderScoringRanges();
}

async function saveScoringRanges() {
    await saveSurveyData();
    showMessage('Scoring ranges saved successfully!', 'success');
}

// Email settings
async function loadEmailSettings() {
    // Try to load email settings from server first
    try {
        const response = await fetch('/api/email-config');
        const result = await response.json();
        
        if (result.success && result.data && result.data.emailConfig) {
            const config = result.data.emailConfig;
            const smtpServerElement = document.getElementById('smtpServer');
            const smtpPortElement = document.getElementById('smtpPort');
            const usernameElement = document.getElementById('username');
            const passwordElement = document.getElementById('password');
            
            if (smtpServerElement) smtpServerElement.value = config.host || '';
            if (smtpPortElement) smtpPortElement.value = config.port || 587;
            if (usernameElement) usernameElement.value = (config.auth && config.auth.user) || '';
            if (passwordElement) passwordElement.value = (config.auth && config.auth.pass) || '';
            
            console.log('Email settings loaded from server successfully');
            return;
        }
    } catch (error) {
        console.warn('Failed to load email settings from server:', error);
    }
    
    // Fallback to local surveyData (for backward compatibility)
    const settings = surveyData.emailSettings || {};
    const smtpServerElement = document.getElementById('smtpServer');
    const smtpPortElement = document.getElementById('smtpPort');
    const usernameElement = document.getElementById('username');
    const passwordElement = document.getElementById('password');
    
    // Handle both formats: server format (host, port, auth.user, auth.pass) and client format (smtpServer, smtpPort, username, password)
    const smtpServer = settings.smtpServer || settings.host || '';
    const smtpPort = settings.smtpPort || settings.port || 587;
    const username = settings.username || (settings.auth && settings.auth.user) || '';
    const password = settings.password || (settings.auth && settings.auth.pass) || '';
    
    if (smtpServerElement) smtpServerElement.value = smtpServer;
    if (smtpPortElement) smtpPortElement.value = smtpPort;
    if (usernameElement) usernameElement.value = username;
    if (passwordElement) passwordElement.value = password;
}

async function saveEmailSettings(event) {
    event.preventDefault();
    console.log('Attempting to save email settings...');

    // Validate email input before saving
    const emailInput = document.getElementById('username');
    if (emailInput && !validateEmailInput(emailInput, true)) {
        showMessage('Please fix the email validation errors before saving.', 'error');
        return;
    }

    const emailForm = document.getElementById('admin-email');
    const formData = new FormData(emailForm);

    const settings = {
        smtpServer: formData.get('smtpServer') || '',
        smtpPort: formData.get('smtpPort') || '587',
        username: formData.get('username') || '',
        password: formData.get('password') || '',
    };

    // Additional validation
    if (!settings.smtpServer) {
        showMessage('SMTP server is required', 'error');
        return;
    }

    if (!settings.smtpPort || settings.smtpPort < 1 || settings.smtpPort > 65535) {
        showMessage('Please enter a valid SMTP port (1-65535)', 'error');
        return;
    }

    if (!settings.username) {
        showMessage('Email username is required', 'error');
        return;
    }

    if (!settings.password) {
        showMessage('Email password is required', 'error');
        return;
    }

    try {
        // Save to local storage first
        surveyData.emailSettings = settings;
        await saveSurveyData();
        
        // Configure server-side email
        const response = await fetch('/api/configure-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Email settings saved and configured successfully!', 'success');
            
            // Test email configuration
            await testEmailConfiguration();
        } else {
            showMessage('Email settings saved locally but server configuration failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Email configuration error:', error);
        showMessage('Email settings saved locally but server is not available. Start the server for full email functionality.', 'info');
    }
}

async function testEmailConfiguration() {
    try {
        const response = await fetch('/api/test-email', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Email configuration tested successfully!', 'success');
        } else {
            showMessage('Email test failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Email test error:', error);
        showMessage('Could not test email configuration. Server may not be running.', 'info');
    }
}

// Survey functionality
function initializeSurvey() {
    currentQuestionIndex = 0;
    userResponses = { intro: {}, categorical: {} };
    
    // Prepare all questions
    allQuestions = [];
    
    // Add introduction questions
    if (Array.isArray(surveyData.introQuestions)) {
        surveyData.introQuestions.forEach(question => {
            allQuestions.push({ type: 'intro', data: question });
        });
    }
    
    // Add categorical questions
    if (Array.isArray(surveyData.categories)) {
        surveyData.categories.forEach(category => {
            if (Array.isArray(category.questions)) {
                category.questions.forEach(question => {
                    allQuestions.push({ type: 'categorical', data: question, category: category.name });
                });
            }
        });
    }
    
    if (allQuestions.length > 0) {
        displayCurrentQuestion();
    } else {
        showMessage('No questions configured. Please contact the administrator.', 'error');
    }
}

function displayCurrentQuestion() {
    const container = document.getElementById('question-container');
    const question = allQuestions[currentQuestionIndex];
    
    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    if (question.type === 'intro') {
        // Check if this is the first intro question and if there's intro text to display
        const isFirstIntroQuestion = currentQuestionIndex === 0;
        const introTextHtml = (isFirstIntroQuestion && surveyData.introText) ? 
            `<div class="intro-text">
                <p>${surveyData.introText.replace(/\n/g, '<br>')}</p>
            </div>` : '';
        
        container.innerHTML = `
            ${introTextHtml}
            <div class="question">
                <h3>Question ${currentQuestionIndex + 1} of ${allQuestions.length}</h3>
                <p>${question.data.text}</p>
                <div class="dropdown-question">
                    <select id="current-answer">
                        <option value="">Please select an option</option>
                        ${question.data.options.map((option, index) => 
                            `<option value="${option}">${option}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="question">
                <h3>Question ${currentQuestionIndex + 1} of ${allQuestions.length}</h3>
                <p><strong>Category:</strong> ${question.category}</p>
                <p>${question.data.text}</p>
                <div class="question-options">
                    ${question.data.options.map((option, index) => 
                        `<button class="option-btn" onclick="selectOption(${index}, ${option.score})">${option.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    // Update navigation buttons
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    document.getElementById('next-btn').style.display = currentQuestionIndex < allQuestions.length - 1 ? 'block' : 'none';
    document.getElementById('submit-btn').style.display = currentQuestionIndex === allQuestions.length - 1 ? 'block' : 'none';
}

function selectOption(optionIndex, score) {
    const question = allQuestions[currentQuestionIndex];
    
    // Remove previous selection
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Add selection to clicked button
    event.target.classList.add('selected');
    
    // Store response
    if (question.type === 'categorical') {
        if (!userResponses.categorical[question.category]) {
            userResponses.categorical[question.category] = [];
        }
        userResponses.categorical[question.category].push({
            questionId: question.data.id,
            score: score,
            optionIndex: optionIndex
        });
    }
}

function nextQuestion() {
    const question = allQuestions[currentQuestionIndex];
    
    if (question.type === 'intro') {
        const answer = document.getElementById('current-answer').value;
        if (!answer) {
            showMessage('Please select an answer before proceeding.', 'error');
            return;
        }
        userResponses.intro[question.data.id] = answer;
    } else {
        const selectedBtn = document.querySelector('.option-btn.selected');
        if (!selectedBtn) {
            showMessage('Please select an answer before proceeding.', 'error');
            return;
        }
    }
    
    currentQuestionIndex++;
    if (currentQuestionIndex < allQuestions.length) {
        displayCurrentQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();
    }
}

function submitSurvey() {
    const question = allQuestions[currentQuestionIndex];
    
    if (question.type === 'intro') {
        const answer = document.getElementById('current-answer').value;
        if (!answer) {
            showMessage('Please select an answer before submitting.', 'error');
            return;
        }
        userResponses.intro[question.data.id] = answer;
    } else {
        const selectedBtn = document.querySelector('.option-btn.selected');
        if (!selectedBtn) {
            showMessage('Please select an answer before submitting.', 'error');
            return;
        }
    }
    
    calculateAndDisplayResults();
}

// Results calculation and display
function calculateAndDisplayResults() {
    const results = calculateResults();
    displayResults(results);
}

function displayResults(results) {
    showScreen('results-screen');
    
    const container = document.getElementById('results-content');
    
    // Ensure surveyData and scoringRanges exist
    if (!surveyData || !surveyData.scoringRanges || surveyData.scoringRanges.length === 0) {
        console.error('Survey data or scoring ranges not properly loaded');
        loadDefaultSurveyData(); // Reload default data if missing
    }
    
    // Find appropriate overall scoring range
    const overallScoringRange = surveyData.scoringRanges.find(range => 
        results.percentage >= range.minScore && results.percentage <= range.maxScore
    ) || { title: 'No Range Defined', description: 'No description available', color: '#3498db' };
     
    // Generate category results HTML
    const categoryResultsHTML = Object.entries(results.categoryScores)
        .map(([categoryName, categoryData]) => `
            <div class="category-result" style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${categoryData.range.color};">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${categoryName}</h3>
                <div class="category-score" style="font-size: 24px; font-weight: bold; color: ${categoryData.range.color}; margin: 10px 0;">
                    ${categoryData.percentage}%
                </div>
                <div class="category-range-title" style="font-size: 18px; font-weight: bold; color: ${categoryData.range.color}; margin: 5px 0;">
                    ${categoryData.range.title}
                </div>
                <div class="category-description" style="color: #555; line-height: 1.5;">
                    ${categoryData.range.description}
                </div>
            </div>
        `).join('');
    
    container.innerHTML = `
        <div class="results-header" style="text-align: center; margin-bottom: 30px;">
            <h2>Your Survey Results</h2>
        </div>
        
        <div class="overall-score-display" style="text-align: center; margin-bottom: 30px; padding: 30px; background: #f8f9fa; border-radius: 12px; border: 2px solid ${overallScoringRange.color};">
            <div class="total-score" style="font-size: 48px; font-weight: bold; color: ${overallScoringRange.color}; margin-bottom: 10px;">
                ${results.percentage}%
            </div>
            <h3 style="color: ${overallScoringRange.color}; margin: 10px 0; font-size: 24px;">${overallScoringRange.title}</h3>
            <p style="color: #555; font-size: 16px; line-height: 1.5; max-width: 600px; margin: 0 auto;">${overallScoringRange.description}</p>
        </div>
        
        <div class="category-breakdown" style="margin-bottom: 30px;">
            <h4 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">Category Breakdown:</h4>
            <div class="category-results">
                ${categoryResultsHTML}
            </div>
        </div>
        
        <div class="action-buttons">
            <button onclick="emailResults()" class="action-btn email-btn">Email detailed results</button>
        </div>
        
        <div class="navigation-buttons">
            <button onclick="backToLogin()" class="back-btn">Back to Login</button>
        </div>
    `;
}

function displaySharedResults(results) {
    showScreen('results-screen');
    
    const container = document.getElementById('results-content');
    
    // Find appropriate scoring range
    const scoringRange = surveyData.scoringRanges.find(range => 
        results.percentage >= range.minScore && results.percentage <= range.maxScore
    ) || { title: 'No Range Defined', description: 'No description available', color: '#3498db' };
    
    container.innerHTML = `
        <div class="shared-results-header">
            <h2>📊 Shared Survey Results</h2>
            <p>These results were shared with you from someone who completed the ${surveyData.title}</p>
        </div>
        
        <div class="score-display">
            <div class="total-score" style="color: ${scoringRange.color}">
                ${results.percentage}%
            </div>
            <h3 style="color: ${scoringRange.color}">${scoringRange.title}</h3>
            <p>Total Score: ${results.totalScore} out of ${results.maxPossibleScore}</p>
        </div>
        
        <div class="score-description">
            <p>${scoringRange.description}</p>
        </div>
        
        <div class="category-breakdown">
            <h4>Category Breakdown:</h4>
            ${Object.entries(results.categoryScores).map(([category, data]) => `
                <div class="category-score">
                    <span class="category-name">${category}:</span>
                    <span class="category-percentage">${data.percentage}%</span>
                    <span class="category-details">(${data.score}/${data.maxScore})</span>
                </div>
            `).join('')}
        </div>
        
        <div class="chart-container">
            <canvas id="results-chart" width="400" height="200"></canvas>
        </div>
        
        <div class="action-buttons">
            <button onclick="window.print()" class="action-btn print-btn">🖨️ Print Results</button>
        </div>
        
        <div class="navigation-buttons">
            <button onclick="takeSurveyYourself()" class="restart-btn">Take Survey Yourself</button>
            <button onclick="window.location.href = window.location.origin + window.location.pathname" class="back-btn">Go to Survey Home</button>
        </div>
    `;
    
    // Draw simple chart
    drawResultsChart(results);
}

function takeSurveyYourself() {
    // Clear URL parameters and restart
    window.history.replaceState({}, document.title, window.location.pathname);
    currentQuestionIndex = 0;
    userResponses = { intro: {}, categorical: {} };
    showScreen('login-screen');
}

function drawResultsChart(results) {
    const canvas = document.getElementById('results-chart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Chart settings
    const chartWidth = canvas.width - 100;
    const chartHeight = canvas.height - 80;
    const startX = 50;
    const startY = 40;
    
    // Draw title
    ctx.fillStyle = '#2c3e50';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Score Breakdown by Category', canvas.width / 2, 25);
    
    // Draw bars
    const categories = Object.entries(results.categoryScores);
    const barWidth = chartWidth / categories.length - 10;
    
    categories.forEach(([categoryName, categoryData], index) => {
        const barHeight = (categoryData.percentage / 100) * chartHeight;
        const x = startX + (index * (barWidth + 10));
        const y = startY + chartHeight - barHeight;
        
        // Draw bar
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw percentage text
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(categoryData.percentage + '%', x + barWidth / 2, y - 5);
        
        // Draw category name
        ctx.save();
        ctx.translate(x + barWidth / 2, startY + chartHeight + 15);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.fillText(categoryName, 0, 0);
        ctx.restore();
    });
    
    // Draw axes
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + chartHeight);
    ctx.lineTo(startX + chartWidth, startY + chartHeight);
    ctx.stroke();
}

// Results actions
async function emailResults() {
    // Check email configuration from server
    try {
        const configResponse = await fetch('/api/email-config');
        const configResult = await configResponse.json();
        
        if (!configResult.success || !configResult.data || !configResult.data.emailConfig || !configResult.data.emailConfig.auth || !configResult.data.emailConfig.auth.user) {
            showMessage('Email settings not configured. Please contact the administrator.', 'error');
            return;
        }
    } catch (error) {
        console.error('Failed to check email configuration:', error);
        showMessage('Email settings not configured. Please contact the administrator.', 'error');
        return;
    }
    
    const email = prompt('Enter your email address:');
    if (!email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    // Ask user for email format preference
    const sendAsPDF = confirm('Would you like to receive your results as a PDF attachment?\n\nClick "OK" for PDF attachment (recommended)\nClick "Cancel" for regular email format');
    
    try {
        showMessage(sendAsPDF ? 'Generating PDF and sending email...' : 'Sending email...', 'info');
        
        // Calculate current results
        const results = calculateResults();
        
        // Add intro responses to results if they exist
        if (userResponses.intro && Object.keys(userResponses.intro).length > 0) {
            results.introResponses = userResponses.intro;
        }
        
        let response;
        
        if (sendAsPDF) {
            // Use the new PDF email endpoint
            response = await fetch('/api/email-results-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientEmail: email,
                    surveyTitle: surveyData.title,
                    results: results
                })
            });
        } else {
            // Use the original email endpoint with custom template
            const emailHtml = generateEmailHtml(results);
            
            response = await fetch('/api/email-results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientEmail: email,
                    surveyTitle: surveyData.title,
                    results: results,
                    customTemplate: emailHtml,
                    useCustomTemplate: true
                })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            if (sendAsPDF) {
                showMessage(`PDF results sent successfully to ${email}! Check your email for the PDF attachment.`, 'success');
            } else {
                showMessage(result.message, 'success');
            }
        } else {
            showMessage('Failed to send email: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Email sending error:', error);
        showMessage('Email functionality requires the server to be running. Please start the server with "npm start".', 'error');
    }
}

async function getShareableLink() {
    try {
        showMessage('Generating shareable link...', 'info');
        
        // Calculate current results
        const results = calculateResults();
        
        const response = await fetch('/api/generate-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: results,
                surveyTitle: surveyData.title
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Copy to clipboard
            navigator.clipboard.writeText(result.link).then(() => {
                showMessage('Shareable link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this shareable link:', result.link);
            });
        } else {
            showMessage('Failed to generate link: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Link generation error:', error);
        
        // Fallback to client-side link generation
        const link = window.location.href + '?results=' + btoa(JSON.stringify(userResponses));
        
        navigator.clipboard.writeText(link).then(() => {
            showMessage('Basic shareable link copied to clipboard! (Server required for enhanced links)', 'info');
        }).catch(() => {
            prompt('Copy this link:', link);
        });
    }
}

async function downloadPDF() {
    try {
        showMessage('Generating PDF...', 'info');
        
        // Calculate current results
        const results = calculateResults();
        
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: results,
                surveyTitle: surveyData.title
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('PDF generated successfully! Download will start shortly.', 'success');
            
            // Create a temporary link to download the PDF
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `${surveyData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            showMessage('Failed to generate PDF: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('PDF generation error:', error);
        showMessage('Failed to generate PDF. Please try again or contact support.', 'error');
    }
}

// Helper function to calculate results without displaying them
function calculateResults() {
    const results = {
        totalScore: 0,
        maxPossibleScore: 0,
        categoryScores: {},
        percentage: 0
    };
    
    // Calculate scores by category
    surveyData.categories.forEach(category => {
        const categoryResponses = userResponses.categorical[category.name] || [];
        const categoryScore = categoryResponses.reduce((sum, response) => sum + response.score, 0);
        const maxCategoryScore = (category.questions && Array.isArray(category.questions)) ? category.questions.length * 3 : 0; // Assuming max score per question is 3
        const categoryPercentage = maxCategoryScore > 0 ? Math.round((categoryScore / maxCategoryScore) * 100) : 0;
        
        // Find appropriate scoring range for this category
        const categoryRange = (category.scoringRanges && Array.isArray(category.scoringRanges)) ? 
            category.scoringRanges.find(range => 
                categoryPercentage >= range.minScore && categoryPercentage <= range.maxScore
            ) : null;
        
        results.categoryScores[category.name] = {
            score: categoryScore,
            maxScore: maxCategoryScore,
            percentage: categoryPercentage,
            range: categoryRange || { title: 'No Range Defined', description: 'No description available', color: '#3498db' }
        };
        
        results.totalScore += categoryScore;
        results.maxPossibleScore += maxCategoryScore;
    });
    
    results.percentage = results.maxPossibleScore > 0 ? Math.round((results.totalScore / results.maxPossibleScore) * 100) : 0;
    
    return results;
}

function restartSurvey() {
    currentQuestionIndex = 0;
    userResponses = { intro: {}, categorical: {} };
    showScreen('survey-screen');
    initializeSurvey();
}

// Data persistence
async function saveSurveyData() {
    // Save to localStorage first (for immediate access)
    localStorage.setItem('surveyData', JSON.stringify(surveyData));
    
    // Also save to server for persistence
    try {
        const response = await fetch('/api/save-survey-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ surveyData })
        });
        
        if (!response.ok) {
            console.warn('Failed to save survey data to server, but saved locally');
        } else {
            console.log('Survey data saved to both localStorage and server');
        }
    } catch (error) {
        console.warn('Server not available, survey data saved locally only:', error);
    }
}

async function loadSurveyData() {
    try {
        const response = await fetch('/api/survey-data');
        if (!response.ok) {
            throw new Error('Failed to load survey data');
        }
        surveyData = await response.json();
        console.log('Survey data loaded from server:', surveyData);
    } catch (error) {
        console.error('Error loading survey data:', error);
        // Use default data as a fallback
        console.log('Using default survey data');
        await loadDefaultSurveyData();
    }

    // Update UI with loaded data
    document.getElementById('survey-title').textContent = surveyData.title;
    if (surveyData.banner) {
        const bannerImg = document.getElementById('banner-image');
        bannerImg.src = surveyData.banner;
        bannerImg.style.display = 'block';
    }
}

async function loadDefaultSurveyData() {
    surveyData = {
        title: 'The Answer Trap Risk Profile Survey',
        banner: '',
        introText: 'Welcome to The Answer Trap Risk Profile Survey. This assessment will help you understand your decision-making patterns and risk tolerance. Please answer all questions honestly for the most accurate results.',
        introQuestions: [
            {
                id: 1,
                text: 'What is your current role?',
                options: ['Manager', 'Team Lead', 'Individual Contributor', 'Executive', 'Other']
            },
            {
                id: 2,
                text: 'How many years of experience do you have?',
                options: ['0-2 years', '3-5 years', '6-10 years', '11-15 years', '15+ years']
            }
        ],
        categories: [
            {
                id: 1,
                name: 'Decision Making',
                description: 'This category evaluates your approach to making decisions and problem-solving strategies.',
                questions: [
                    {
                        id: 101,
                        text: 'When faced with a complex decision, I tend to:',
                        options: [
                            { text: 'Analyze all available data thoroughly', score: 1 },
                            { text: 'Seek input from multiple stakeholders', score: 2 },
                            { text: 'Trust my gut instinct', score: 3 }
                        ]
                    },
                    {
                        id: 102,
                        text: 'I prefer to make decisions:',
                        options: [
                            { text: 'Quickly to maintain momentum', score: 3 },
                            { text: 'After careful consideration', score: 1 },
                            { text: 'With team consensus', score: 2 }
                        ]
                    }
                ],
                scoringRanges: [
                    {
                        id: 1,
                        minScore: 0,
                        maxScore: 40,
                        title: 'Analytical',
                        description: 'You prefer thorough analysis and careful consideration in decision-making.',
                        color: '#2ecc71'
                    },
                    {
                        id: 2,
                        minScore: 41,
                        maxScore: 70,
                        title: 'Collaborative',
                        description: 'You balance analysis with team input and consensus-building.',
                        color: '#f39c12'
                    },
                    {
                        id: 3,
                        minScore: 71,
                        maxScore: 100,
                        title: 'Intuitive',
                        description: 'You trust your instincts and prefer quick, decisive action.',
                        color: '#e74c3c'
                    }
                ]
            },
            {
                id: 2,
                name: 'Risk Assessment',
                description: 'This category assesses how you evaluate and respond to uncertainty and potential risks.',
                questions: [
                    {
                        id: 201,
                        text: 'When evaluating risks, I focus on:',
                        options: [
                            { text: 'Potential negative outcomes', score: 1 },
                            { text: 'Balancing risks and opportunities', score: 2 },
                            { text: 'Potential rewards and benefits', score: 3 }
                        ]
                    },
                    {
                        id: 202,
                        text: 'My approach to uncertainty is:',
                        options: [
                            { text: 'Cautious and methodical', score: 1 },
                            { text: 'Balanced and adaptive', score: 2 },
                            { text: 'Optimistic and action-oriented', score: 3 }
                        ]
                    }
                ],
                scoringRanges: [
                    {
                        id: 4,
                        minScore: 0,
                        maxScore: 40,
                        title: 'Risk Averse',
                        description: 'You are cautious and focus on potential negative outcomes when assessing risks.',
                        color: '#2ecc71'
                    },
                    {
                        id: 5,
                        minScore: 41,
                        maxScore: 70,
                        title: 'Risk Balanced',
                        description: 'You take a balanced approach, weighing both risks and opportunities.',
                        color: '#f39c12'
                    },
                    {
                        id: 6,
                        minScore: 71,
                        maxScore: 100,
                        title: 'Risk Seeking',
                        description: 'You are optimistic and focus on potential rewards when evaluating uncertainty.',
                        color: '#e74c3c'
                    }
                ]
            }
        ],
        scoringRanges: [
            {
                id: 1,
                minScore: 0,
                maxScore: 40,
                title: 'Low Risk',
                description: 'You tend to be very cautious and methodical in your approach to decision-making.',
                color: '#2ecc71'
            },
            {
                id: 2,
                minScore: 41,
                maxScore: 70,
                title: 'Moderate Risk',
                description: 'You balance caution with opportunity, taking calculated risks when appropriate.',
                color: '#f39c12'
            },
            {
                id: 3,
                minScore: 71,
                maxScore: 100,
                title: 'High Risk',
                description: 'You are comfortable with uncertainty and tend to take bold actions.',
                color: '#e74c3c'
            }
        ],
        emailSettings: {}
    };
    
    // Update UI with default data
    document.getElementById('survey-title').textContent = surveyData.title;
    
    // Save the default data to localStorage
    await saveSurveyData();
}

// Utility functions
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the active screen
    const activeScreen = document.querySelector('.screen.active');
    const container = activeScreen.querySelector('.container, .admin-container, .survey-container, .results-container, .login-container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Email Report Template Management
let emailTemplate = {
    backgroundColor: '#ffffff',
    headerImage: '',
    footerImage: '',
    headerText: 'Survey Results Report',
    includeIntroQuestions: true,
    includeCategoryTitles: true,
    includeCategoryScores: true,
    includeCategoryDescriptions: true,
    includeRangeDescriptions: true,
    includeOverallScore: true,
    customSections: []
};

// Function to get current email template
function getCurrentEmailTemplate() {
    return emailTemplate;
}

async function initializeEmailTemplate() {
    try {
        // First try to load from server (persistent storage)
        const response = await fetch('/api/email-template');
        const result = await response.json();
        
        if (result.success && result.data.emailTemplate) {
            emailTemplate = { ...emailTemplate, ...result.data.emailTemplate };
            console.log('Email template loaded from server successfully');
        } else {
            // Fallback to localStorage
            const savedTemplate = localStorage.getItem('emailTemplate');
            if (savedTemplate) {
                emailTemplate = { ...emailTemplate, ...JSON.parse(savedTemplate) };
                console.log('Email template loaded from localStorage');
                
                // Save to server for future persistence
                await saveEmailTemplate();
            }
        }
    } catch (error) {
        console.error('Error loading email template from server, using localStorage fallback:', error);
        
        // Fallback to localStorage
        const savedTemplate = localStorage.getItem('emailTemplate');
        if (savedTemplate) {
            emailTemplate = { ...emailTemplate, ...JSON.parse(savedTemplate) };
        }
    }
    
    // Populate form fields with current template values
    populateEmailTemplateForm();
}

function populateEmailTemplateForm() {
    // Background color
    const bgColorInput = document.getElementById('template-bg-color');
    const bgColorText = document.getElementById('template-bg-color-text');
    if (bgColorInput && bgColorText) {
        bgColorInput.value = emailTemplate.backgroundColor;
        bgColorText.value = emailTemplate.backgroundColor;
    }
    
    // Header text
    const headerTextInput = document.getElementById('template-header-text');
    if (headerTextInput) {
        headerTextInput.value = emailTemplate.headerText;
    }
    
    // Content options checkboxes
    const checkboxes = {
        'include-intro-questions': emailTemplate.includeIntroQuestions,
        'include-category-titles': emailTemplate.includeCategoryTitles,
        'include-category-scores': emailTemplate.includeCategoryScores,
        'include-category-descriptions': emailTemplate.includeCategoryDescriptions,
        'include-range-descriptions': emailTemplate.includeRangeDescriptions,
        'include-overall-score': emailTemplate.includeOverallScore
    };
    
    Object.entries(checkboxes).forEach(([id, checked]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = checked;
        }
    });
    
    // Update image preview (for email template section)
    updateImagePreview();
    
    // Update stored image previews for Email Report section
    updateStoredImagePreviews();
    
    // Render custom sections
    renderCustomSections();
}

// New function to display stored header and footer images in Email Report section
function updateStoredImagePreviews() {
    // Update header image preview
    if (emailTemplate.headerImage) {
        const headerPreview = document.getElementById('header-logo-preview');
        if (headerPreview) {
            headerPreview.innerHTML = `
                <div class="image-preview-wrapper">
                    <img src="${emailTemplate.headerImage}" alt="Stored Header Image" style="max-width: 100%; max-height: 200px; border-radius: 4px;">
                    <div class="image-info">
                        <span class="file-name">Stored Header Image</span>
                        <span class="file-size">Previously uploaded</span>
                    </div>
                    <button type="button" onclick="clearStoredImage('header')" class="remove-image-btn">×</button>
                </div>
            `;
            headerPreview.classList.add('has-image');
        }
    }
    
    // Update footer image preview
    if (emailTemplate.footerImage) {
        const footerPreview = document.getElementById('footer-logo-preview');
        if (footerPreview) {
            footerPreview.innerHTML = `
                <div class="image-preview-wrapper">
                    <img src="${emailTemplate.footerImage}" alt="Stored Footer Image" style="max-width: 100%; max-height: 200px; border-radius: 4px;">
                    <div class="image-info">
                        <span class="file-name">Stored Footer Image</span>
                        <span class="file-size">Previously uploaded</span>
                    </div>
                    <button type="button" onclick="clearStoredImage('footer')" class="remove-image-btn">×</button>
                </div>
            `;
            footerPreview.classList.add('has-image');
        }
    }
}

// Function to clear stored images
function clearStoredImage(type) {
    if (type === 'header') {
        emailTemplate.headerImage = '';
        const headerPreview = document.getElementById('header-logo-preview');
        const headerInput = document.getElementById('header-logo');
        if (headerPreview) {
            headerPreview.innerHTML = '';
            headerPreview.classList.remove('has-image');
        }
        if (headerInput) {
            headerInput.value = '';
        }
    } else if (type === 'footer') {
        emailTemplate.footerImage = '';
        const footerPreview = document.getElementById('footer-logo-preview');
        const footerInput = document.getElementById('footer-logo');
        if (footerPreview) {
            footerPreview.innerHTML = '';
            footerPreview.classList.remove('has-image');
        }
        if (footerInput) {
            footerInput.value = '';
        }
    }
    
    saveEmailTemplate();
    showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} image cleared successfully`, 'success');
}

function updateTemplateBackgroundColor(input) {
    const colorValue = input.value;
    emailTemplate.backgroundColor = colorValue;
    
    // Update both color picker and text input
    const bgColorInput = document.getElementById('template-bg-color');
    const bgColorText = document.getElementById('template-bg-color-text');
    
    if (input.type === 'color') {
        bgColorText.value = colorValue;
    } else {
        bgColorInput.value = colorValue;
    }
    
    saveEmailTemplate();
}

function updateTemplateHeaderText() {
    const headerTextInput = document.getElementById('template-header-text');
    emailTemplate.headerText = headerTextInput.value;
    saveEmailTemplate();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showMessage('Image file size must be less than 2MB', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            emailTemplate.headerImage = e.target.result;
            updateImagePreview();
            saveEmailTemplate();
        };
        reader.readAsDataURL(file);
    }
}

function updateImagePreview() {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    if (emailTemplate.headerImage) {
        preview.innerHTML = `<img src="${emailTemplate.headerImage}" alt="Header Image">`;
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = '<div class="image-preview-placeholder">No image selected</div>';
        preview.classList.remove('has-image');
    }
}

function removeHeaderImage() {
    emailTemplate.headerImage = '';
    updateImagePreview();
    
    // Clear file input
    const fileInput = document.getElementById('template-header-image');
    if (fileInput) {
        fileInput.value = '';
    }
    
    saveEmailTemplate();
}

// Email Report Template Image Preview Function
// Optimize image for email compatibility
function optimizeImageForEmail(imageDataUrl, fileName, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate optimal dimensions (max 600px width for email compatibility)
        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with compression for smaller file size
        const quality = 0.8; // 80% quality for good balance of size/quality
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        callback(optimizedDataUrl);
    };
    
    img.onerror = function() {
        console.warn('Failed to optimize image, using original');
        callback(imageDataUrl);
    };
    
    img.src = imageDataUrl;
}

function previewReportImage(input, previewId) {
    const file = input.files[0];
    const previewContainer = document.getElementById(previewId);
    
    if (!file) {
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('has-image');
        }
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        input.value = '';
        return;
    }
    
    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image file size must be less than 5MB', 'error');
        input.value = '';
        return;
    }
    
    // Create file reader
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Optimize image for email compatibility
        optimizeImageForEmail(e.target.result, file.name, (optimizedImageData) => {
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="image-preview-wrapper">
                        <img src="${optimizedImageData}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 4px;">
                        <div class="image-info">
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button type="button" onclick="removeReportImage('${input.id}', '${previewId}')" class="remove-image-btn">×</button>
                    </div>
                `;
                previewContainer.classList.add('has-image');
            }
            
            // Store the optimized image data for the email template
            if (input.id === 'header-logo') {
                emailTemplate.headerImage = optimizedImageData;
                showMessage('Header image uploaded and will replace any previously stored image', 'success');
            } else if (input.id === 'footer-logo') {
                emailTemplate.footerImage = optimizedImageData;
                showMessage('Footer image uploaded and will replace any previously stored image', 'success');
            }
            
            saveEmailTemplate();
        });
    };
    
    reader.onerror = function() {
        showMessage('Error reading image file', 'error');
        input.value = '';
    };
    
    reader.readAsDataURL(file);
}

// Remove image function
function removeReportImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    if (input) {
        input.value = '';
    }
    
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('has-image');
    }
    
    // Remove from email template
    if (inputId === 'header-logo') {
        emailTemplate.headerImage = null;
    } else if (inputId === 'footer-logo') {
        emailTemplate.footerImage = null;
    }
    
    saveEmailTemplate();
}

function updateContentOption(checkbox) {
    const optionMap = {
        'include-intro-questions': 'includeIntroQuestions',
        'include-category-titles': 'includeCategoryTitles',
        'include-category-scores': 'includeCategoryScores',
        'include-category-descriptions': 'includeCategoryDescriptions',
        'include-range-descriptions': 'includeRangeDescriptions',
        'include-overall-score': 'includeOverallScore'
    };
    
    const templateKey = optionMap[checkbox.id];
    if (templateKey) {
        emailTemplate[templateKey] = checkbox.checked;
        saveEmailTemplate();
        console.log(`Updated ${templateKey} to ${checkbox.checked}`);
    } else {
        console.warn(`No mapping found for checkbox ID: ${checkbox.id}`);
    }
}

function addCustomSection() {
    const newSection = {
        id: Date.now(),
        type: 'text',
        title: 'Custom Section',
        content: '',
        backgroundColor: '#f8f9fa',
        textColor: '#333333'
    };
    
    emailTemplate.customSections.push(newSection);
    renderCustomSections();
    saveEmailTemplate();
}

function renderCustomSections() {
    const container = document.getElementById('custom-sections-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    emailTemplate.customSections.forEach((section, index) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'custom-section-item';
        sectionDiv.innerHTML = `
            <div class="custom-section-header">
                <div class="custom-section-title">Section ${index + 1}: ${section.title}</div>
                <div class="custom-section-controls">
                    <button type="button" onclick="moveCustomSection(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" onclick="moveCustomSection(${index}, 1)" ${index === emailTemplate.customSections.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" onclick="removeCustomSection(${index})" class="btn-danger">×</button>
                </div>
            </div>
            <div class="custom-section-type">
                <label>Section Type:</label>
                <select onchange="updateCustomSectionType(${index}, this.value)">
                    <option value="text" ${section.type === 'text' ? 'selected' : ''}>Text Content</option>
                    <option value="spacer" ${section.type === 'spacer' ? 'selected' : ''}>Spacer</option>
                    <option value="divider" ${section.type === 'divider' ? 'selected' : ''}>Divider Line</option>
                </select>
            </div>
            <div class="form-group">
                <label>Section Title:</label>
                <input type="text" value="${section.title}" onchange="updateCustomSectionTitle(${index}, this.value)">
            </div>
            ${section.type === 'text' ? `
                <div class="form-group">
                    <label>Content:</label>
                    <textarea rows="4" onchange="updateCustomSectionContent(${index}, this.value)">${section.content}</textarea>
                </div>
            ` : ''}
            <div class="form-group">
                <label>Background Color:</label>
                <div class="color-input-group">
                    <input type="color" value="${section.backgroundColor}" onchange="updateCustomSectionBgColor(${index}, this.value)">
                    <input type="text" value="${section.backgroundColor}" onchange="updateCustomSectionBgColor(${index}, this.value)">
                </div>
            </div>
            ${section.type === 'text' ? `
                <div class="form-group">
                    <label>Text Color:</label>
                    <div class="color-input-group">
                        <input type="color" value="${section.textColor}" onchange="updateCustomSectionTextColor(${index}, this.value)">
                        <input type="text" value="${section.textColor}" onchange="updateCustomSectionTextColor(${index}, this.value)">
                    </div>
                </div>
            ` : ''}
        `;
        container.appendChild(sectionDiv);
    });
}

function updateCustomSectionType(index, type) {
    emailTemplate.customSections[index].type = type;
    renderCustomSections();
    saveEmailTemplate();
}

function updateCustomSectionTitle(index, title) {
    emailTemplate.customSections[index].title = title;
    renderCustomSections();
    saveEmailTemplate();
}

function updateCustomSectionContent(index, content) {
    emailTemplate.customSections[index].content = content;
    saveEmailTemplate();
}

function updateCustomSectionBgColor(index, color) {
    emailTemplate.customSections[index].backgroundColor = color;
    saveEmailTemplate();
}

function updateCustomSectionTextColor(index, color) {
    emailTemplate.customSections[index].textColor = color;
    saveEmailTemplate();
}

function moveCustomSection(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < emailTemplate.customSections.length) {
        const temp = emailTemplate.customSections[index];
        emailTemplate.customSections[index] = emailTemplate.customSections[newIndex];
        emailTemplate.customSections[newIndex] = temp;
        renderCustomSections();
        saveEmailTemplate();
    }
}

function removeCustomSection(index) {
    emailTemplate.customSections.splice(index, 1);
    renderCustomSections();
    saveEmailTemplate();
}

async function saveEmailTemplate() {
    try {
        // Save to localStorage for immediate use
        localStorage.setItem('emailTemplate', JSON.stringify(emailTemplate));
        
        // Save to server for persistence across resets
        const response = await fetch('/api/email-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailTemplate })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Email template saved to server successfully');
        } else {
            console.warn('Failed to save email template to server:', result.message);
            // Still continue since localStorage save succeeded
        }
    } catch (error) {
        console.error('Error saving email template to server:', error);
        // Still continue since localStorage save succeeded
    }
}

async function resetEmailTemplate() {
    if (confirm('Are you sure you want to reset the email template to default settings? This action cannot be undone.')) {
        emailTemplate = {
            backgroundColor: '#ffffff',
            headerImage: '',
            footerImage: '',
            headerText: 'Survey Results Report',
            includeIntroQuestions: true,
            includeCategoryTitles: true,
            includeCategoryScores: true,
            includeCategoryDescriptions: true,
            includeRangeDescriptions: true,
            includeOverallScore: true,
            customSections: []
        };
        
        populateEmailTemplateForm();
        await saveEmailTemplate(); // This will save to both localStorage and server
        showMessage('Email template reset to default settings', 'success');
    }
}

function previewEmailTemplate() {
    console.log('previewEmailTemplate called');
    console.log('emailTemplate:', emailTemplate);
    
    // Generate sample results for preview
    const sampleResults = generateSampleResults();
    console.log('sampleResults:', sampleResults);
    
    // Generate email HTML
    const emailHtml = generateEmailHtml(sampleResults);
    console.log('emailHtml generated, length:', emailHtml.length);
    
    // Show preview modal
    showEmailPreview(emailHtml);
}

function generateSampleResults() {
    return {
        introResponses: {
            'What is your current role?': 'Manager',
            'How many years of experience do you have?': '6-10 years'
        },
        categoryScores: {
            'Decision Making': {
                score: 4,
                maxScore: 6,
                percentage: 67,
                range: {
                    title: 'Collaborative',
                    description: 'You balance analysis with team input and consensus-building.',
                    color: '#f39c12'
                }
            },
            'Risk Assessment': {
                score: 3,
                maxScore: 6,
                percentage: 50,
                range: {
                    title: 'Risk Balanced',
                    description: 'You take a balanced approach, weighing both risks and opportunities.',
                    color: '#f39c12'
                }
            }
        },
        totalScore: 7,
        maxPossibleScore: 12,
        percentage: 58
    };
}

function generateEmailHtml(results) {
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Survey Results</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:AllowPNG/>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: ${emailTemplate.backgroundColor}; font-family: Arial, sans-serif;">
    `;
    
    // Header image with better email client compatibility
    if (emailTemplate.headerImage) {
        html += `
            <div style="text-align: center; padding: 20px;">
                <img src="${emailTemplate.headerImage}" 
                     alt="Header Image" 
                     style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
                     width="560"
                     border="0">
                <!--[if !mso]><!-->
                <div style="display: none; font-size: 0; line-height: 0; max-height: 0; overflow: hidden;">
                    [Header Image - If you cannot see this image, please enable images in your email client]
                </div>
                <!--<![endif]-->
            </div>
        `;
    }
    
    // Header text
    html += `
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa; margin: 20px; border-radius: 8px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold;">${emailTemplate.headerText}</h1>
        </div>
    `;
    
    // Introduction questions
    if (emailTemplate.includeIntroQuestions && results.introResponses) {
        html += `
            <div style="margin: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <h2 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; font-weight: bold;">Background Information</h2>
        `;
        Object.entries(results.introResponses).forEach(([question, answer]) => {
            html += `
                <div style="margin-bottom: 10px;">
                    <strong style="color: #495057;">${question}</strong><br>
                    <span style="color: #6c757d;">${answer}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // Overall score
    if (emailTemplate.includeOverallScore) {
        html += `
            <div style="margin: 20px; padding: 20px; background-color: #e3f2fd; border-radius: 8px; text-align: center;">
                <h2 style="color: #1976d2; font-size: 18px; margin-bottom: 15px; font-weight: bold;">Overall Score</h2>
                <div style="font-size: 36px; font-weight: bold; color: #1976d2; margin-bottom: 10px;">
                    ${results.percentage}%
                </div>
                <div style="color: #424242; font-size: 14px;">
                    ${results.totalScore} out of ${results.maxPossibleScore} points
                </div>
            </div>
        `;
    }
    
    // Category scores
    if (emailTemplate.includeCategoryScores && results.categoryScores) {
        html += `
            <div style="margin: 20px;">
                <h2 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; font-weight: bold;">Category Results</h2>
        `;
        Object.entries(results.categoryScores).forEach(([categoryName, categoryData]) => {
            html += `
                <div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${categoryData.range.color};">
                    <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 10px; font-weight: bold;">${categoryName}</h3>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: ${categoryData.range.color};">${categoryData.range.title}</strong>
                        <span style="float: right; color: #6c757d; font-weight: bold;">${categoryData.percentage}%</span>
                    </div>
                    ${emailTemplate.includeCategoryDescriptions ? `
                        <div style="color: #495057; font-size: 14px; line-height: 1.5; clear: both;">
                            ${categoryData.range.description}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // Custom sections
    emailTemplate.customSections.forEach(section => {
        if (section.type === 'text') {
            html += `
                <div style="margin: 20px; padding: 20px; background-color: ${section.backgroundColor}; border-radius: 8px;">
                    <h3 style="color: ${section.textColor}; font-size: 16px; margin-bottom: 10px; font-weight: bold;">${section.title}</h3>
                    <div style="color: ${section.textColor}; line-height: 1.5; font-size: 14px;">
                        ${section.content.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        } else if (section.type === 'spacer') {
            html += `<div style="height: 30px; line-height: 30px; font-size: 1px;">&nbsp;</div>`;
        } else if (section.type === 'divider') {
            html += `
                <div style="margin: 20px;">
                    <hr style="border: none; height: 2px; background-color: ${section.backgroundColor}; margin: 0;">
                </div>
            `;
        }
    });
    
    // Footer image with better email client compatibility
    if (emailTemplate.footerImage) {
        html += `
            <div style="text-align: center; padding: 20px;">
                <img src="${emailTemplate.footerImage}" 
                     alt="Footer Image" 
                     style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
                     width="560"
                     border="0">
                <!--[if !mso]><!-->
                <div style="display: none; font-size: 0; line-height: 0; max-height: 0; overflow: hidden;">
                    [Footer Image - If you cannot see this image, please enable images in your email client]
                </div>
                <!--<![endif]-->
            </div>
        `;
    }
    
    html += `
            </div>
        </body>
        </html>
    `;
    
    return html;
}

function showEmailPreview(emailHtml) {
    console.log('showEmailPreview called');
    const modal = document.getElementById('email-preview-modal');
    const previewBody = document.getElementById('email-template-preview');
    
    console.log('modal element:', modal);
    console.log('previewBody element:', previewBody);
    
    if (modal && previewBody) {
        previewBody.innerHTML = emailHtml;
        modal.classList.add('active');
        console.log('Modal should now be visible');
    } else {
        console.error('Modal or preview body element not found');
    }
}

function closeEmailPreview() {
    const modal = document.getElementById('email-preview-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Update the existing emailResults function to use the custom template
async function emailResultsWithTemplate(results) {
    try {
        // Check email configuration first
        const configResult = await fetch('/api/email-config');
        const configData = await configResult.json();
        
        if (!configData.success || !configData.data.emailConfig.auth.user) {
            showMessage('Email settings not configured. Please contact the administrator.', 'error');
            return;
        }
        
        // Generate custom email HTML
        const emailHtml = generateEmailHtml(results);
        
        // Send email with custom template
        const response = await fetch('/api/email-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: results,
                surveyTitle: surveyData.title,
                customTemplate: emailHtml,
                useCustomTemplate: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Results emailed successfully!', 'success');
        } else {
            showMessage('Failed to email results: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Email error:', error);
        showMessage('Failed to email results. Please try again or contact support.', 'error');
    }
}