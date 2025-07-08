# The Answer Trap Risk Profile Survey - Design Specifications

A comprehensive web-based survey application designed to assess risk profiles through configurable questionnaires with advanced scoring and reporting capabilities.

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Requirements](#system-requirements)
3. [Features and Functionality](#features-and-functionality)
4. [User Interface Design](#user-interface-design)
5. [Database Design](#database-design)
6. [Security and Access Control](#security-and-access-control)
7. [Installation and Setup](#installation-and-setup)
8. [Usage Guide](#usage-guide)
9. [Technical Architecture](#technical-architecture)
10. [Customization Guide](#customization-guide)

## Project Overview

### Objectives and Goals

The Answer Trap Risk Profile Survey is designed to:
- Provide a flexible, configurable survey platform
- Assess user risk profiles through structured questionnaires
- Generate comprehensive reports with visual analytics
- Support role-based access for administrators and users
- Deliver results via email or shareable links

### Key Features

- **Admin Configuration**: Complete survey setup and management
- **User Survey Interface**: Intuitive, sequential question presentation
- **Advanced Scoring**: Category-based scoring with customizable ranges
- **Visual Reports**: Charts and color-coded results
- **Email Integration**: Result delivery capabilities (requires Node.js server)
- **Shareable Links**: Generate links to share results with others
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Capable**: Basic functionality works without internet connection

## System Requirements

### Hardware Requirements
- **Minimum**: 2GB RAM, 1GB storage
- **Recommended**: 4GB RAM, 2GB storage

### Software Requirements
- **Web Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Server**: Any web server (Apache, Nginx, IIS)
- **Optional**: HTTPS certificate for secure deployment

### Deployment Environment
- **Development**: Local file system or local web server
- **Production**: Web server with HTTPS support
- **Database**: Browser localStorage (client-side storage)

## Features and Functionality

### Admin Configuration

#### Survey Setup
- **Title Configuration**: Customizable survey title
- **Banner Management**: Upload and display banner images
- **Branding**: Light blue theme (#add8e6) as specified

#### Introduction Questions
- **Question Management**: Add, edit, remove introduction questions
- **Answer Options**: Configurable dropdown options
- **Dynamic Forms**: Real-time form generation

#### Categorical Questions
- **Category Organization**: Group questions by categories
- **Scoring System**: 3-option questions with numerical scores (1-3)
- **Question Management**: Full CRUD operations

#### Scoring Configuration
- **Range Definition**: Customizable score ranges (0-100%)
- **Color Coding**: Visual indicators for different score levels
- **Result Text**: Custom descriptions for each range

#### Email Settings
- **SMTP Configuration**: Server, port, credentials (Gmail, Outlook, custom SMTP)
- **Result Delivery**: Email integration for report sharing (server required)
- **Fallback Mode**: Basic sharing works without server setup

### User Survey Interface

#### Navigation
- **Sequential Layout**: One question per page
- **Progress Tracking**: Visual progress bar
- **Navigation Controls**: Previous/Next buttons

#### Question Types
- **Introduction Questions**: Dropdown selection
- **Categorical Questions**: Button-based selection
- **Consistent Header**: Title and banner on all pages

#### Interactive Elements
- **Visual Feedback**: Selected option highlighting
- **Validation**: Required field checking
- **Responsive Design**: Mobile-friendly interface

### Report Generation

#### Score Calculation
- **Total Score**: Sum of all categorical responses
- **Category Scores**: Individual category totals
- **Percentage Display**: Scores as percentage of maximum

#### Visual Elements
- **Color-Coded Indicators**: Based on scoring ranges
- **Bar Charts**: Category breakdown visualization
- **Range-Based Content**: Dynamic text based on scores

#### Delivery Options
- **Email Reports**: Send results via email (server required)
- **Shareable Links**: Generate unique result URLs
- **Print-Friendly**: Formatted for printing
- **Fallback Mode**: Basic sharing works without server setup

## User Interface Design

### Admin Mode

#### Navigation Structure
```
Admin Dashboard
├── Basic Setup
│   ├── Survey Title
│   └── Banner Image
├── Introduction Questions
│   ├── Question Text
│   └── Answer Options
├── Categories & Questions
│   ├── Category Management
│   ├── Question Creation
│   └── Answer Scoring
├── Scoring & Ranges
│   ├── Range Definition
│   ├── Color Coding
│   └── Result Text
└── Email Settings
    ├── SMTP Configuration
    └── Delivery Options
```

#### Form Components
- **Text Inputs**: Survey titles, questions, descriptions
- **File Uploads**: Banner image management
- **Number Inputs**: Score values, ranges
- **Color Pickers**: Range color selection
- **Dynamic Lists**: Question and option management

### User Mode

#### Page Layout
```
Survey Interface
├── Header
│   ├── Banner Image
│   └── Survey Title
├── Progress Bar
├── Question Container
│   ├── Question Text
│   └── Answer Options
└── Navigation
    ├── Previous Button
    ├── Next Button
    └── Submit Button
```

#### Interactive Elements
- **Dropdown Menus**: Introduction questions
- **Button Selection**: Categorical questions
- **Progress Indicators**: Completion status
- **Validation Messages**: Error handling

## Database Design

### Data Storage

The application uses browser localStorage for client-side data persistence:

#### Survey Configuration
```javascript
surveData = {
    title: String,
    banner: String (base64),
    introQuestions: Array,
    categories: Array,
    scoringRanges: Array,
    emailSettings: Object
}
```

#### User Responses
```javascript
userResponses = {
    intro: Object,
    categorical: Object
}
```

### Entity Relationships

```
Survey
├── Introduction Questions
│   └── Answer Options
├── Categories
│   └── Questions
│       └── Answer Options (with scores)
├── Scoring Ranges
│   ├── Score Thresholds
│   ├── Colors
│   └── Descriptions
└── Email Settings
```

## Security and Access Control

### Role-Based Authentication

#### Admin Access
- **Configuration Rights**: Full survey setup capabilities
- **Data Management**: Create, read, update, delete operations
- **Settings Control**: Email and scoring configuration

#### User Access
- **Survey Taking**: Complete questionnaires
- **Result Viewing**: Access personal results
- **Limited Actions**: No configuration access

### Data Protection

#### Client-Side Security
- **Local Storage**: Data stored in browser localStorage
- **No Server Transmission**: Sensitive data remains local
- **Session Management**: Role-based screen access

#### Deployment Security
- **HTTPS Recommended**: Secure data transmission
- **Input Validation**: XSS prevention
- **Data Sanitization**: Safe content handling

## Installation and Setup

### Quick Start

#### Basic Usage (No Email)
1. **Download Files**
   ```
   index.html
   styles.css
   script.js
   README.md
   ```

2. **Local Development**
   - Open `index.html` in a web browser
   - Or serve files using a local web server

3. **Web Server Deployment**
   - Upload files to web server
   - Ensure HTTPS is configured
   - Test admin and user functionality

#### Full Functionality (With Email)
1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/) (required for email)
2. **Start Server**: Run `start-server.bat` or use `npm start`
3. **Access Survey**: Open `http://localhost:3000` in your browser
4. **Configure Email**: In Admin mode, set up SMTP settings for email functionality
5. **Use All Features**: Email results and generate enhanced shareable links

### Configuration

1. **Access Admin Mode**
   - Click "Admin Access" on login screen
   - Configure survey settings

2. **Basic Setup**
   - Set survey title
   - Upload banner image
   - Save settings

3. **Question Configuration**
   - Add introduction questions
   - Create categories and questions
   - Set up scoring ranges

## Usage Guide

### For Administrators

1. **Initial Setup**
   - Access admin mode
   - Configure basic survey settings
   - Add introduction questions
   - Create categories and questions
   - Set up scoring ranges
   - Configure email settings

2. **Question Management**
   - Use "Add Question" buttons
   - Edit question text and options
   - Set scores for categorical questions
   - Remove unwanted questions

3. **Scoring Configuration**
   - Define score ranges (0-100%)
   - Set colors for visual indicators
   - Write descriptions for each range

### For Users

1. **Taking the Survey**
   - Click "Take Survey" on login screen
   - Answer questions sequentially
   - Use navigation buttons to move between questions
   - Submit survey when complete

2. **Viewing Results**
   - Review total and category scores
   - Read personalized result description
   - View score breakdown chart
   - Email results or get shareable link

## Technical Architecture

### Frontend Technologies
- **HTML5**: Semantic markup and structure
- **CSS3**: Responsive design and animations
- **JavaScript (ES6+)**: Application logic and interactivity

### Key Components

#### Screen Management
- **Single Page Application**: Dynamic screen switching
- **State Management**: Global application state
- **Event Handling**: User interaction processing

#### Data Management
- **localStorage API**: Client-side persistence
- **JSON Serialization**: Data storage format
- **Real-time Updates**: Dynamic UI updates

#### Chart Generation
- **Canvas API**: Custom chart rendering
- **Responsive Charts**: Adaptive visualization
- **Color Coding**: Score-based visual indicators

### File Structure
```
project/
├── index.html          # Main application file
├── styles.css          # Styling and layout
├── script.js           # Application logic
└── README.md           # Documentation
```

## Customization Guide

### Styling Modifications

#### Color Scheme
```css
/* Primary background color */
body {
    background-color: #add8e6; /* Light blue as specified */
}

/* Accent colors */
.primary-color { color: #3498db; }
.success-color { color: #27ae60; }
.warning-color { color: #f39c12; }
.danger-color { color: #e74c3c; }
```

#### Layout Adjustments
- Modify `.container` max-width for different screen sizes
- Adjust `.survey-header` styling for branding
- Customize button styles in respective classes

### Functionality Extensions

#### Additional Question Types
```javascript
// Add new question type in displayCurrentQuestion()
if (question.type === 'scale') {
    // Implement scale-based questions
}
```

#### Enhanced Scoring
```javascript
// Modify calculateAndDisplayResults() for complex scoring
function calculateWeightedScores(responses) {
    // Implement weighted scoring logic
}
```

### Integration Options

#### Server-Side Integration
- Replace localStorage with API calls
- Implement user authentication
- Add database persistence
- Enable real email functionality

#### Third-Party Services
- Email service integration (SendGrid, Mailgun)
- Analytics tracking (Google Analytics)
- Cloud storage (AWS S3, Google Cloud)

---

## Support and Maintenance

For technical support or feature requests, please refer to the project documentation or contact the development team.

**Version**: 1.0.0  
**Last Updated**: 2024  
**License**: MIT License