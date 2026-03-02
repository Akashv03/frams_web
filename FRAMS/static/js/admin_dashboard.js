// ========== admin_dashboard.js ==========
(function() {
    'use strict';

    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const pageTitle = document.getElementById('currentPageTitle');
    const titleSuffix = document.getElementById('titleSuffix');
    const notificationBell = document.getElementById('notificationBell');
    const logoutBtn = document.getElementById('logoutButton');

    const sections = {
        dashboard: document.getElementById('dashboardSection'),
        facerec: document.getElementById('faceRecognitionSection'),
        students: document.getElementById('studentsSection'),
        subjects: document.getElementById('subjectsSection'),
        attendance: document.getElementById('attendanceSection'),
        reports: document.getElementById('reportsSection'),
        settings: document.getElementById('settingsSection')
    };

    const sectionNames = {
        dashboard: 'Face Recognition Dashboard',
        facerec: 'Live Face Recognition',
        students: 'Manage Students',
        subjects: 'Manage Subjects',
        attendance: 'Attendance Monitor',
        reports: 'Reports',
        settings: 'Settings'
    };

    function activateSection(sectionId) {
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        Object.values(sections).forEach(sec => {
            if (sec) sec.classList.remove('active-section');
        });

        if (sections[sectionId]) {
            sections[sectionId].classList.add('active-section');
        }

        pageTitle.innerText = sectionNames[sectionId] || 'Dashboard';
        
        const suffixMap = {
            dashboard: 'attendance system',
            facerec: 'real-time recognition',
            students: 'student management',
            subjects: 'curriculum',
            attendance: 'live monitor',
            reports: 'analytics',
            settings: 'preferences'
        };
        titleSuffix.innerText = suffixMap[sectionId] || 'management';
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;
            if (sectionId) activateSection(sectionId);
        });
    });

    if (notificationBell) {
        notificationBell.addEventListener('click', () => {
            alert('🔔 5 new face recognitions (demo)');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                alert('Logging out... (demo)');
                // In real app: window.location.href = '/logout';
            }
        });
    }

    // Add keyboard shortcut for logout (Ctrl+Shift+L) as professional touch
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            if (logoutBtn) logoutBtn.click();
        }
    });

    activateSection('dashboard');
    console.log('Face Recognition Attendance System ready with logout');
})();