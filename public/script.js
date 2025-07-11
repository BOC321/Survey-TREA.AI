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
function validateEmailInput(input) {
    const value = input.value.trim();
    const errorElement = document.getElementById(input.id + '-error');
    
    // Clear previous error
    clearValidationError(input, errorElement);
    
    if (!value) {
        return true; // Empty is valid for optional fields
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(value) || value.length > 254) {
        showValidationError(input, errorElement, 'Please enter a valid email address');
        return false;
    }
    
    return true;
}

function validateFileUpload(input) {
    const file = input.files[0];
    const errorElement = document.getElementById(input.id + '-error');
    
    // Clear previous error
    clearValidationError(input, errorElement);
    
    if (!file) {
        return true; // No file selected is valid
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showValidationError(input, errorElement, 'Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return false;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        showValidationError(input, errorElement, 'File size must be less than 5MB');
        return false;
    }
    
    // Check image dimensions
    const img = new Image();
    img.onload = function() {
        const maxWidth = 2000;
        const maxHeight = 1000;
        
        if (this.width > maxWidth || this.height > maxHeight) {
            showValidationError(input, errorElement, `Image dimensions must be less than ${maxWidth}x${maxHeight} pixels`);
            return false;
        }
    };
    img.src = URL.createObjectURL(file);
    
    return true;
}

function showValidationError(input, errorElement, message) {
    input.classList.add('invalid');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearValidationError(input, errorElement) {
    input.classList.remove('invalid');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
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

let userResponses = {
    intro: {},
    categorical: {}
};

let currentQuestionIndex = 0;
let allQuestions = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded - Script is running');
    await loadSurveyData();
    
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
function setRole(role) {
    console.log('setRole called with role:', role);
    currentRole = role;
    if (role === 'admin') {
        console.log('Showing admin screen');
        showScreen('admin-screen');
        initializeAdminInterface();
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

function initializeAdminInterface() {
    // Load existing data into admin forms
    document.getElementById('survey-title-input').value = surveyData.title;
    document.getElementById('intro-text-input').value = surveyData.introText || '';
    
    // Initialize admin sections
    renderIntroQuestions();
    renderCategories();
    renderScoringRanges();
    loadEmailSettings();
}

// Basic settings
function saveBasicSettings() {
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
    if (bannerInput.files[0] && !validateFileUpload(bannerInput)) {
        return; // Validation failed, error already shown
    }
    
    surveyData.title = sanitizedTitle;
    document.getElementById('survey-title').textContent = surveyData.title;
    
    const bannerFile = bannerInput.files[0];
    if (bannerFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            surveyData.banner = e.target.result;
            const bannerImg = document.getElementById('banner-image');
            bannerImg.src = surveyData.banner;
            bannerImg.style.display = 'block';
        };
        reader.readAsDataURL(bannerFile);
    }
    
    saveSurveyData();
    showMessage('Basic settings saved successfully!', 'success');
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

function saveIntroQuestions() {
    // Save the introduction text
    surveyData.introText = document.getElementById('intro-text-input').value;
    saveSurveyData();
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

function saveCategoriesQuestions() {
    saveSurveyData();
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

function saveScoringRanges() {
    saveSurveyData();
    showMessage('Scoring ranges saved successfully!', 'success');
}

// Email settings
function loadEmailSettings() {
    const settings = surveyData.emailSettings;
    document.getElementById('smtp-server').value = settings.smtpServer || '';
    document.getElementById('smtp-port').value = settings.smtpPort || 587;
    document.getElementById('email-username').value = settings.username || '';
    document.getElementById('email-password').value = settings.password || '';
}

async function saveEmailSettings() {
    // Validate email input before saving
    const emailInput = document.getElementById('email-username');
    if (!validateEmailInput(emailInput)) {
        showMessage('Please fix the email validation errors before saving.', 'error');
        return;
    }

    const rawSmtpServer = document.getElementById('smtp-server').value;
    const rawSmtpPort = document.getElementById('smtp-port').value;
    const rawUsername = document.getElementById('email-username').value;
    const rawPassword = document.getElementById('email-password').value;

    console.log('Raw input - SMTP Server:', rawSmtpServer);
    console.log('Raw input - SMTP Port:', rawSmtpPort);
    console.log('Raw input - Username:', rawUsername);

    const emailSettings = {
        smtpServer: sanitizeInput(rawSmtpServer.trim()),
        smtpPort: parseInt(rawSmtpPort),
        username: sanitizeInput(rawUsername.trim()),
        password: rawPassword // Don't sanitize passwords
    };

    console.log('Processed settings - SMTP Server:', emailSettings.smtpServer);
    console.log('Processed settings - SMTP Port:', emailSettings.smtpPort);
    console.log('Processed settings - Username:', emailSettings.username);

    // Additional validation
    if (!emailSettings.smtpServer) {
        console.log('Validation failed: SMTP Server is empty. Value:', emailSettings.smtpServer);
        showMessage('SMTP server is required', 'error');
        return;
    }

    if (!emailSettings.smtpPort || emailSettings.smtpPort < 1 || emailSettings.smtpPort > 65535) {
        showMessage('Please enter a valid SMTP port (1-65535)', 'error');
        return;
    }

    if (!emailSettings.username) {
        showMessage('Email username is required', 'error');
        return;
    }

    try {
        // Save to local storage
        surveyData.emailSettings = emailSettings;
        saveSurveyData();
        
        // Configure server-side email
        const response = await fetch('/api/configure-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailSettings)
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
    if (!surveyData.emailSettings.username) {
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
    
    // Ask if user wants to include PDF attachment
    const includePDF = confirm('Would you like to include a PDF attachment with your results?');
    
    try {
        const loadingMessage = includePDF ? 'Generating PDF and sending email...' : 'Sending email...';
        showMessage(loadingMessage, 'info');
        
        // Calculate current results
        const results = calculateResults();
        
        const response = await fetch('/api/send-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientEmail: email,
                surveyTitle: surveyData.title,
                results: results,
                chartData: null, // Could include chart data if needed
                includePDF: includePDF
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
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
function saveSurveyData() {
    localStorage.setItem('surveyData', JSON.stringify(surveyData));
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
        loadDefaultSurveyData();
    }

    // Update UI with loaded data
    document.getElementById('survey-title').textContent = surveyData.title;
    if (surveyData.banner) {
        const bannerImg = document.getElementById('banner-image');
        bannerImg.src = surveyData.banner;
        bannerImg.style.display = 'block';
    }
}

function loadDefaultSurveyData() {
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
    saveSurveyData();
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