// ===== State Management =====
let siteData = null;
let originalData = null;
let hasUnsavedChanges = false;

// ===== DOM Elements =====
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const deployBtn = document.getElementById('deployBtn');
const saveBar = document.getElementById('saveBar');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');
const toastContainer = document.getElementById('toastContainer');
const modalOverlay = document.getElementById('modalOverlay');

// ===== Authentication =====
async function checkAuth() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        if (data.authenticated) {
            showDashboard();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

async function login(password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            showDashboard();
            return true;
        } else {
            const data = await response.json();
            loginError.textContent = data.error || 'Login failed';
            return false;
        }
    } catch (error) {
        loginError.textContent = 'Connection error. Please try again.';
        return false;
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
    siteData = null;
    originalData = null;
}

async function deployToServer() {
    if (hasUnsavedChanges) {
        showToast('Please save your changes before deploying', 'warning');
        return;
    }

    const originalContent = deployBtn.innerHTML;
    deployBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" class="spin" style="margin-right: 5px;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
        Deploying...
    `;
    deployBtn.disabled = true;

    try {
        const response = await fetch('/api/deploy', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast('Deployment successful! You may need to refresh the live site with Ctrl+F5 to clear cache.', 'success');
        } else {
            showToast('Deployment failed: ' + (result.error || 'Unknown error'), 'error');
            console.error('Deployment details:', result.details);
        }
    } catch (error) {
        showToast('Connection error during deployment', 'error');
        console.error('Fetch error:', error);
    } finally {
        deployBtn.innerHTML = originalContent;
        deployBtn.disabled = false;
    }
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    loadData();
}

// ===== Data Management =====
async function loadData() {
    try {
        const response = await fetch('/api/data');
        siteData = await response.json();
        originalData = JSON.parse(JSON.stringify(siteData));
        renderAllSections();
        showToast('Data loaded successfully', 'success');
    } catch (error) {
        showToast('Failed to load data', 'error');
        console.error('Load error:', error);
    }
}

async function saveData() {
    try {
        const response = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteData)
        });

        if (response.ok) {
            originalData = JSON.parse(JSON.stringify(siteData));
            setUnsavedChanges(false);
            showToast('Changes saved successfully!', 'success');
        } else {
            throw new Error('Save failed');
        }
    } catch (error) {
        showToast('Failed to save changes', 'error');
        console.error('Save error:', error);
    }
}

function discardChanges() {
    siteData = JSON.parse(JSON.stringify(originalData));
    renderAllSections();
    setUnsavedChanges(false);
    showToast('Changes discarded', 'warning');
}

function setUnsavedChanges(hasChanges) {
    hasUnsavedChanges = hasChanges;
    if (hasChanges) {
        saveBar.classList.add('visible');
    } else {
        saveBar.classList.remove('visible');
    }
}

function markAsChanged() {
    setUnsavedChanges(true);
}

// ===== Render Functions =====
function renderAllSections() {
    renderBusinessInfo();
    renderAppearance();
    renderHours();
    renderMenu();
    renderFlavors();
    renderPerks();
    bindInputListeners();
}

function renderBusinessInfo() {
    // Set values for business fields
    setFieldValue('businessName', siteData.business.name);
    setFieldValue('businessTagline', siteData.business.tagline);
    setFieldValue('heroText', siteData.business.heroText);
    setFieldValue('aboutTitle', siteData.business.aboutTitle);
    setFieldValue('aboutText1', siteData.business.aboutText[0] || '');
    setFieldValue('aboutText2', siteData.business.aboutText[1] || '');
    setFieldValue('email', siteData.business.email);
    setFieldValue('contactTitle', siteData.business.contactTitle);
    setFieldValue('contactText', siteData.business.contactText);
    setFieldValue('facebook', siteData.business.socialLinks.facebook);
    setFieldValue('instagram', siteData.business.socialLinks.instagram);
    setFieldValue('nextdoor', siteData.business.socialLinks.nextdoor);
    setFieldValue('googleMaps', siteData.business.socialLinks.googleMaps);
}

function renderAppearance() {
    // Logo
    setFieldValue('logoUrl', siteData.business.logo || '');
    updateLogoPreview();

    // Initialize heroGallery if not present
    if (!siteData.heroGallery) {
        siteData.heroGallery = {
            images: [],
            autoSlide: true,
            slideInterval: 5000
        };
    }

    // Gallery settings
    const autoSlideToggle = document.getElementById('autoSlideToggle');
    const slideIntervalInput = document.getElementById('slideInterval');

    if (autoSlideToggle) {
        autoSlideToggle.checked = siteData.heroGallery.autoSlide !== false;
    }

    if (slideIntervalInput) {
        slideIntervalInput.value = (siteData.heroGallery.slideInterval || 5000) / 1000;
    }

    // Render gallery images
    renderGalleryImages();
    bindAppearanceListeners();
}

function updateLogoPreview() {
    const logoPreview = document.getElementById('logoPreview');
    const logoUrl = siteData.business.logo;

    if (logoUrl) {
        logoPreview.innerHTML = `<img src="${logoUrl}" alt="Logo preview" onerror="this.parentElement.innerHTML='<div class=\\'preview-placeholder\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'currentColor\\' width=\\'40\\' height=\\'40\\'><path d=\\'M21 5v6.59l-2.29-2.3a1 1 0 0 0-1.42 0L14 12.59l-2.29-2.3a1 1 0 0 0-1.42 0L8 12.59l-2.29-2.3a1 1 0 0 0-1.42 0L2 12.59V5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2zM2 15.41l2.29-2.3 2.3 2.3a1 1 0 0 0 1.41 0l2.3-2.3 2.29 2.3a1 1 0 0 0 1.41 0l3.3-3.3 2.3 2.3V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3.59z\\'/></svg><span>Invalid image URL</span></div>'">`;
    } else {
        logoPreview.innerHTML = `
            <div class="preview-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M4 5v14h16V5H4zm14 12H6V7h12v10zm-3.5-4.33l-2.5 3.01L10 12l-2.5 3.17L5 14.5l2 4.5h10l2-4.5-2.5-.83z"/></svg>
                <span>Logo Preview</span>
            </div>
        `;
    }
}

function renderGalleryImages() {
    const galleryImages = document.getElementById('galleryImages');
    if (!galleryImages) return;

    const images = siteData.heroGallery.images || [];

    galleryImages.innerHTML = images.map((img, index) => `
        <div class="gallery-image-card" data-index="${index}">
            <div class="image-preview ${!img.url ? 'empty' : ''}" style="${img.url ? `background-image: url('${img.url}')` : ''}">
                ${!img.url ? `
                    <div class="image-upload-overlay">
                        <input type="file" class="card-file-input" accept="image/*" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                        <span>Click to upload</span>
                    </div>
                ` : `
                    <div class="image-replace-overlay">
                        <input type="file" class="card-file-input" accept="image/*" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                        <span>Replace</span>
                    </div>
                `}
            </div>
            <div class="image-controls">
                <input type="url" class="gallery-image-url" value="${img.url || ''}" placeholder="Image URL or upload above">
                <input type="text" class="gallery-image-alt" value="${img.alt || ''}" placeholder="Alt text (optional)">
                <input type="url" class="gallery-image-link" value="${img.link || ''}" placeholder="Link URL (optional)">
                <div class="image-actions">
                    <button class="delete-image-btn" title="Delete image">Delete</button>
                </div>
            </div>
        </div>
    `).join('') + `
        <div class="add-image-placeholder" id="addImagePlaceholder">
            <input type="file" class="placeholder-file-input" accept="image/*" multiple>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <span>Add Image</span>
            <small>Click to upload or add URL</small>
        </div>
    `;

    bindGalleryListeners();
}

function bindAppearanceListeners() {
    // Logo upload tabs
    document.querySelectorAll('.upload-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.target.dataset.target;
            const container = e.target.closest('.form-section');

            // Toggle active tab
            container.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // Toggle panels
            container.querySelectorAll('.upload-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${target}Panel`).classList.add('active');
        });
    });

    // Logo file upload
    const logoUploadArea = document.getElementById('logoUploadArea');
    const logoFileInput = document.getElementById('logoFileInput');

    if (logoUploadArea && logoFileInput) {
        logoUploadArea.addEventListener('click', () => logoFileInput.click());

        logoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            logoUploadArea.classList.add('dragover');
        });

        logoUploadArea.addEventListener('dragleave', () => {
            logoUploadArea.classList.remove('dragover');
        });

        logoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            logoUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                uploadLogoFile(files[0]);
            }
        });

        logoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadLogoFile(e.target.files[0]);
            }
        });
    }

    // Logo URL input
    const logoInput = document.getElementById('logoUrl');
    if (logoInput) {
        logoInput.addEventListener('input', (e) => {
            siteData.business.logo = e.target.value;
            updateLogoPreview();
            markAsChanged();
        });
    }

    // Gallery file upload button
    const uploadGalleryBtn = document.getElementById('uploadGalleryImages');
    const galleryFileInput = document.getElementById('galleryFileInput');

    if (uploadGalleryBtn && galleryFileInput) {
        uploadGalleryBtn.addEventListener('click', () => galleryFileInput.click());

        galleryFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadGalleryFiles(e.target.files);
            }
        });
    }

    // Auto-slide toggle
    const autoSlideToggle = document.getElementById('autoSlideToggle');
    if (autoSlideToggle) {
        autoSlideToggle.addEventListener('change', (e) => {
            siteData.heroGallery.autoSlide = e.target.checked;
            markAsChanged();
        });
    }

    // Slide interval
    const slideIntervalInput = document.getElementById('slideInterval');
    if (slideIntervalInput) {
        slideIntervalInput.addEventListener('input', (e) => {
            const seconds = parseInt(e.target.value) || 5;
            siteData.heroGallery.slideInterval = seconds * 1000;
            markAsChanged();
        });
    }

    // Add gallery image button (URL)
    const addGalleryImageBtn = document.getElementById('addGalleryImage');
    if (addGalleryImageBtn) {
        addGalleryImageBtn.addEventListener('click', addNewGalleryImage);
    }
}

// ===== File Upload Functions =====
async function uploadLogoFile(file) {
    const logoUploadArea = document.getElementById('logoUploadArea');

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    logoUploadArea.classList.add('uploading');

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        // Update logo URL
        siteData.business.logo = result.url;
        document.getElementById('logoUrl').value = result.url;
        updateLogoPreview();
        markAsChanged();

        showToast('Logo uploaded successfully!', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Failed to upload logo', 'error');
    } finally {
        logoUploadArea.classList.remove('uploading');
    }
}

async function uploadGalleryFiles(files) {
    const uploadBtn = document.getElementById('uploadGalleryImages');
    const originalText = uploadBtn.innerHTML;

    uploadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" class="spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
        Uploading...
    `;
    uploadBtn.disabled = true;

    let uploadedCount = 0;
    const totalFiles = files.length;

    for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast(`Skipped ${file.name} - not an image`, 'warning');
            continue;
        }

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
            showToast(`Skipped ${file.name} - file too large`, 'warning');
            continue;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await response.json();

            // Add to gallery
            if (!siteData.heroGallery.images) {
                siteData.heroGallery.images = [];
            }

            siteData.heroGallery.images.push({
                url: result.url,
                alt: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
                link: ''
            });

            uploadedCount++;
        } catch (error) {
            console.error('Upload error:', error);
            showToast(`Failed to upload ${file.name}`, 'error');
        }
    }

    uploadBtn.innerHTML = originalText;
    uploadBtn.disabled = false;

    // Clear the file input
    document.getElementById('galleryFileInput').value = '';

    if (uploadedCount > 0) {
        renderGalleryImages();
        markAsChanged();
        showToast(`Uploaded ${uploadedCount} of ${totalFiles} images`, 'success');
    }
}

function bindGalleryListeners() {
    // Card file inputs (for upload/replace)
    document.querySelectorAll('.card-file-input').forEach(input => {
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('change', async (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.files.length > 0) {
                await uploadCardImage(e.target.files[0], index);
            }
        });

        // Make the overlay clickable
        const overlay = input.parentElement;
        overlay.addEventListener('click', (e) => {
            if (e.target !== input) {
                input.click();
            }
        });
    });

    // Placeholder file input
    const placeholderInput = document.querySelector('.placeholder-file-input');
    if (placeholderInput) {
        placeholderInput.addEventListener('click', (e) => e.stopPropagation());
        placeholderInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await uploadGalleryFiles(e.target.files);
            }
        });
    }

    // Image URL inputs
    document.querySelectorAll('.gallery-image-url').forEach(input => {
        input.addEventListener('input', (e) => {
            const card = e.target.closest('.gallery-image-card');
            const index = parseInt(card.dataset.index);
            siteData.heroGallery.images[index].url = e.target.value;

            // Update preview
            const preview = card.querySelector('.image-preview');
            if (e.target.value) {
                preview.style.backgroundImage = `url('${e.target.value}')`;
                preview.classList.remove('empty');
            } else {
                preview.style.backgroundImage = '';
                preview.classList.add('empty');
            }
            // Re-render to update overlay
            renderGalleryImages();
            markAsChanged();
        });
    });

    // Alt text inputs
    document.querySelectorAll('.gallery-image-alt').forEach(input => {
        input.addEventListener('input', (e) => {
            const card = e.target.closest('.gallery-image-card');
            const index = parseInt(card.dataset.index);
            siteData.heroGallery.images[index].alt = e.target.value;
            markAsChanged();
        });
    });

    // Link URL inputs
    document.querySelectorAll('.gallery-image-link').forEach(input => {
        input.addEventListener('input', (e) => {
            const card = e.target.closest('.gallery-image-card');
            const index = parseInt(card.dataset.index);
            siteData.heroGallery.images[index].link = e.target.value;
            markAsChanged();
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.gallery-image-card');
            const index = parseInt(card.dataset.index);
            siteData.heroGallery.images.splice(index, 1);
            renderGalleryImages();
            markAsChanged();
        });
    });

    // Add image placeholder - for clicking (not on file input)
    const addPlaceholder = document.getElementById('addImagePlaceholder');
    if (addPlaceholder) {
        addPlaceholder.addEventListener('click', (e) => {
            // If clicking directly on the file input, let it handle
            if (e.target.classList.contains('placeholder-file-input')) return;
            // Otherwise trigger the file input
            const fileInput = addPlaceholder.querySelector('.placeholder-file-input');
            if (fileInput) {
                fileInput.click();
            }
        });
    }
}

async function uploadCardImage(file, index) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    const card = document.querySelector(`.gallery-image-card[data-index="${index}"]`);
    const preview = card.querySelector('.image-preview');
    preview.classList.add('uploading');

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        // Update image URL
        siteData.heroGallery.images[index].url = result.url;
        siteData.heroGallery.images[index].alt = siteData.heroGallery.images[index].alt || file.name.replace(/\.[^/.]+$/, '');

        renderGalleryImages();
        markAsChanged();
        showToast('Image uploaded successfully!', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Failed to upload image', 'error');
    } finally {
        preview.classList.remove('uploading');
    }
}

function addNewGalleryImage() {
    if (!siteData.heroGallery.images) {
        siteData.heroGallery.images = [];
    }
    siteData.heroGallery.images.push({
        url: '',
        alt: '',
        link: ''
    });
    renderGalleryImages();
    markAsChanged();

    // Focus on the new image URL input
    setTimeout(() => {
        const inputs = document.querySelectorAll('.gallery-image-url');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 100);
}

function renderHours() {
    if (!siteData.business.hours) {
        // Initialize hours if not present
        siteData.business.hours = {
            title: "Find Us This Week",
            subtitle: "Serving fresh coffee at these locations",
            schedule: [
                { day: "Monday", time: "", location: "", closed: false },
                { day: "Tuesday", time: "", location: "", closed: false },
                { day: "Wednesday", time: "", location: "", closed: false },
                { day: "Thursday", time: "", location: "", closed: false },
                { day: "Friday", time: "", location: "", closed: false },
                { day: "Saturday", time: "", location: "", closed: false },
                { day: "Sunday", time: "", location: "", closed: true }
            ]
        };
    }

    setFieldValue('hoursTitle', siteData.business.hours.title);
    setFieldValue('hoursSubtitle', siteData.business.hours.subtitle);
    setFieldValue('location', siteData.business.location || '');

    const hoursSchedule = document.getElementById('hoursSchedule');
    if (!hoursSchedule) return;

    hoursSchedule.innerHTML = siteData.business.hours.schedule.map((item, index) => `
        <div class="schedule-row ${item.closed ? 'closed' : ''}" data-index="${index}">
            <span class="schedule-day">${item.day}</span>
            <input type="text" value="${item.time}" placeholder="e.g., 7:00 AM - 2:00 PM" class="schedule-time" ${item.closed ? 'disabled' : ''}>
            <input type="text" value="${item.location}" placeholder="Location" class="schedule-location" ${item.closed ? 'disabled' : ''}>
            <label class="closed-toggle">
                <input type="checkbox" class="schedule-closed" ${item.closed ? 'checked' : ''}>
                Closed
            </label>
        </div>
    `).join('');

    bindHoursListeners();
}

function bindHoursListeners() {
    document.querySelectorAll('.schedule-row').forEach(row => {
        const index = parseInt(row.dataset.index);
        const timeInput = row.querySelector('.schedule-time');
        const locationInput = row.querySelector('.schedule-location');
        const closedCheckbox = row.querySelector('.schedule-closed');

        timeInput.addEventListener('input', (e) => {
            siteData.business.hours.schedule[index].time = e.target.value;
            markAsChanged();
        });

        locationInput.addEventListener('input', (e) => {
            siteData.business.hours.schedule[index].location = e.target.value;
            markAsChanged();
        });

        closedCheckbox.addEventListener('change', (e) => {
            const isClosed = e.target.checked;
            siteData.business.hours.schedule[index].closed = isClosed;
            timeInput.disabled = isClosed;
            locationInput.disabled = isClosed;
            row.classList.toggle('closed', isClosed);
            markAsChanged();
        });
    });
}

function renderMenu() {
    setFieldValue('menuTitle', siteData.menu.title);
    setFieldValue('menuSubtitle', siteData.menu.subtitle);

    const menuManager = document.getElementById('menuManager');
    menuManager.innerHTML = '';

    siteData.menu.categories.forEach(category => {
        // Ensure active property exists
        if (category.active === undefined) category.active = true;

        const categoryEl = document.createElement('div');
        categoryEl.className = `menu-category ${!category.active ? 'inactive' : ''}`;
        categoryEl.dataset.categoryId = category.id;

        categoryEl.innerHTML = `
            <div class="category-header">
                <div class="category-title-row">
                    <h4>${category.name}</h4>
                    <label class="visibility-toggle" title="${category.active ? 'Visible on menu' : 'Hidden from menu'}">
                        <input type="checkbox" class="category-active-toggle" ${category.active ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">${category.active ? 'Visible' : 'Hidden'}</span>
                    </label>
                </div>
                <div class="category-actions">
                    <button class="btn btn-sm btn-ghost edit-category-btn">Rename</button>
                    <button class="btn btn-sm btn-danger delete-category-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        Delete
                    </button>
                </div>
            </div>
            <div class="category-items">
                ${category.items.map(item => {
                    // Ensure active property exists
                    if (item.active === undefined) item.active = true;
                    return `
                    <div class="menu-item-row ${!item.active ? 'inactive' : ''}" data-item-id="${item.id}">
                        <label class="item-visibility-toggle" title="${item.active ? 'Visible' : 'Hidden'}">
                            <input type="checkbox" class="item-active-toggle" ${item.active ? 'checked' : ''}>
                            <span class="mini-toggle-slider"></span>
                        </label>
                        <input type="text" value="${item.name}" placeholder="Item name" class="item-name-input" ${!item.active ? 'style="opacity: 0.5"' : ''}>
                        <input type="text" value="${item.description}" placeholder="Description" class="item-desc-input" ${!item.active ? 'style="opacity: 0.5"' : ''}>
                        <div class="price-input">
                            <input type="number" value="${item.price.toFixed(2)}" step="0.25" min="0" class="item-price-input" ${!item.active ? 'style="opacity: 0.5"' : ''}>
                        </div>
                        <button class="delete-btn delete-item-btn" title="Delete item">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                `}).join('')}
                <button class="add-item-btn" data-category-id="${category.id}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    Add Item
                </button>
            </div>
        `;

        menuManager.appendChild(categoryEl);
    });

    // Bind menu event listeners
    bindMenuListeners();
}

function renderFlavors() {
    setFieldValue('flavorsTitle', siteData.flavors.title);
    setFieldValue('flavorsSubtitle', siteData.flavors.subtitle);

    // Regular flavors
    const regularFlavors = document.getElementById('regularFlavors');
    regularFlavors.innerHTML = siteData.flavors.regular.map((flavor, index) => `
        <span class="tag" data-index="${index}" data-type="regular">
            ${flavor}
            <button class="remove-tag">&times;</button>
        </span>
    `).join('');

    // Sugar-free flavors
    const sugarFreeFlavors = document.getElementById('sugarFreeFlavors');
    sugarFreeFlavors.innerHTML = siteData.flavors.sugarFree.map((flavor, index) => `
        <span class="tag" data-index="${index}" data-type="sugarFree">
            ${flavor}
            <button class="remove-tag">&times;</button>
        </span>
    `).join('');

    // Extras
    const extrasList = document.getElementById('extrasList');
    extrasList.innerHTML = siteData.flavors.extras.map((extra, index) => `
        <div class="extra-row" data-index="${index}">
            <input type="text" value="${extra.name}" placeholder="Extra name" class="extra-name-input">
            <div class="price-input">
                <input type="number" value="${extra.price.toFixed(2)}" step="0.25" min="0" class="extra-price-input">
            </div>
            <button class="delete-btn delete-extra-btn" title="Delete">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        </div>
    `).join('');

    // Bind flavor event listeners
    bindFlavorListeners();
}

function renderPerks() {
    setFieldValue('perksTitle', siteData.perks.title);

    const perksManager = document.getElementById('perksManager');
    perksManager.innerHTML = siteData.perks.items.map((perk, index) => `
        <div class="perk-card-edit" data-index="${index}">
            <div class="form-row">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${perk.title}" class="perk-title-input">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" class="perk-desc-input">${perk.description}</textarea>
            </div>
        </div>
    `).join('');

    // Bind perk listeners
    bindPerkListeners();
}

// ===== Event Listeners =====
function bindInputListeners() {
    // Bind all data-field inputs
    document.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('input', (e) => {
            const field = e.target.dataset.field;
            const value = e.target.value;
            setNestedValue(siteData, field, value);
            markAsChanged();
        });
    });
}

function bindMenuListeners() {
    // Edit category
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryEl = e.target.closest('.menu-category');
            const categoryId = categoryEl.dataset.categoryId;
            const category = siteData.menu.categories.find(c => c.id === categoryId);
            showEditCategoryModal(category);
        });
    });

    // Delete category
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryEl = e.target.closest('.menu-category');
            const categoryId = categoryEl.dataset.categoryId;
            showConfirmModal('Delete Category', 'Are you sure you want to delete this category and all its items?', () => {
                siteData.menu.categories = siteData.menu.categories.filter(c => c.id !== categoryId);
                renderMenu();
                markAsChanged();
            });
        });
    });

    // Item name/desc/price changes
    document.querySelectorAll('.menu-item-row').forEach(row => {
        const categoryEl = row.closest('.menu-category');
        const categoryId = categoryEl.dataset.categoryId;
        const itemId = parseInt(row.dataset.itemId);
        const category = siteData.menu.categories.find(c => c.id === categoryId);
        const item = category.items.find(i => i.id === itemId);

        row.querySelector('.item-name-input').addEventListener('input', (e) => {
            item.name = e.target.value;
            markAsChanged();
        });

        row.querySelector('.item-desc-input').addEventListener('input', (e) => {
            item.description = e.target.value;
            markAsChanged();
        });

        row.querySelector('.item-price-input').addEventListener('input', (e) => {
            item.price = parseFloat(e.target.value) || 0;
            markAsChanged();
        });
    });

    // Delete item
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.menu-item-row');
            const categoryEl = row.closest('.menu-category');
            const categoryId = categoryEl.dataset.categoryId;
            const itemId = parseInt(row.dataset.itemId);
            const category = siteData.menu.categories.find(c => c.id === categoryId);
            category.items = category.items.filter(i => i.id !== itemId);
            row.remove();
            markAsChanged();
        });
    });

    // Add item
    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.target.dataset.categoryId;
            const category = siteData.menu.categories.find(c => c.id === categoryId);
            const maxId = Math.max(...siteData.menu.categories.flatMap(c => c.items.map(i => i.id)), 0);
            category.items.push({
                id: maxId + 1,
                name: 'New Item',
                description: 'Description',
                price: 0.00,
                active: true
            });
            renderMenu();
            markAsChanged();
        });
    });

    // Category visibility toggle
    document.querySelectorAll('.category-active-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const categoryEl = e.target.closest('.menu-category');
            const categoryId = categoryEl.dataset.categoryId;
            const category = siteData.menu.categories.find(c => c.id === categoryId);
            category.active = e.target.checked;

            // Update UI
            categoryEl.classList.toggle('inactive', !category.active);
            const label = e.target.closest('.visibility-toggle').querySelector('.toggle-label');
            label.textContent = category.active ? 'Visible' : 'Hidden';
            markAsChanged();
        });
    });

    // Item visibility toggle
    document.querySelectorAll('.item-active-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const row = e.target.closest('.menu-item-row');
            const categoryEl = row.closest('.menu-category');
            const categoryId = categoryEl.dataset.categoryId;
            const itemId = parseInt(row.dataset.itemId);
            const category = siteData.menu.categories.find(c => c.id === categoryId);
            const item = category.items.find(i => i.id === itemId);
            item.active = e.target.checked;

            // Update UI
            row.classList.toggle('inactive', !item.active);
            row.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
                input.style.opacity = item.active ? '1' : '0.5';
            });
            markAsChanged();
        });
    });
}

function bindFlavorListeners() {
    // Remove regular flavor
    document.querySelectorAll('#regularFlavors .remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.closest('.tag');
            const index = parseInt(tag.dataset.index);
            siteData.flavors.regular.splice(index, 1);
            renderFlavors();
            markAsChanged();
        });
    });

    // Remove sugar-free flavor
    document.querySelectorAll('#sugarFreeFlavors .remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.closest('.tag');
            const index = parseInt(tag.dataset.index);
            siteData.flavors.sugarFree.splice(index, 1);
            renderFlavors();
            markAsChanged();
        });
    });

    // Extra name/price changes
    document.querySelectorAll('.extra-row').forEach(row => {
        const index = parseInt(row.dataset.index);

        row.querySelector('.extra-name-input').addEventListener('input', (e) => {
            siteData.flavors.extras[index].name = e.target.value;
            markAsChanged();
        });

        row.querySelector('.extra-price-input').addEventListener('input', (e) => {
            siteData.flavors.extras[index].price = parseFloat(e.target.value) || 0;
            markAsChanged();
        });
    });

    // Delete extra
    document.querySelectorAll('.delete-extra-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.extra-row');
            const index = parseInt(row.dataset.index);
            siteData.flavors.extras.splice(index, 1);
            renderFlavors();
            markAsChanged();
        });
    });
}

function bindPerkListeners() {
    document.querySelectorAll('.perk-card-edit').forEach(card => {
        const index = parseInt(card.dataset.index);

        card.querySelector('.perk-title-input').addEventListener('input', (e) => {
            siteData.perks.items[index].title = e.target.value;
            markAsChanged();
        });

        card.querySelector('.perk-desc-input').addEventListener('input', (e) => {
            siteData.perks.items[index].description = e.target.value;
            markAsChanged();
        });
    });
}

// ===== Tab Navigation =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Show corresponding tab
        const tabId = item.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// ===== Add Buttons =====
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    showAddCategoryModal();
});

document.getElementById('addRegularFlavor').addEventListener('click', () => {
    showAddFlavorModal('regular');
});

document.getElementById('addSugarFreeFlavor').addEventListener('click', () => {
    showAddFlavorModal('sugarFree');
});

document.getElementById('addExtra').addEventListener('click', () => {
    siteData.flavors.extras.push({ name: 'New Extra', price: 0.25 });
    renderFlavors();
    markAsChanged();
});

// ===== Modal Functions =====
function showModal(title, bodyContent, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyContent;
    modalOverlay.classList.add('visible');

    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    const closeBtn = document.getElementById('modalClose');

    const cleanup = () => {
        modalOverlay.classList.remove('visible');
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    document.getElementById('modalConfirm').addEventListener('click', () => {
        onConfirm();
        cleanup();
    });

    document.getElementById('modalCancel').addEventListener('click', cleanup);
    closeBtn.addEventListener('click', cleanup);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) cleanup();
    });
}

function showConfirmModal(title, message, onConfirm) {
    showModal(title, `<p>${message}</p>`, onConfirm);
}

function showAddCategoryModal() {
    showModal('Add Category', `
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" id="newCategoryName" placeholder="e.g., Seasonal Drinks">
        </div>
    `, () => {
        const name = document.getElementById('newCategoryName').value.trim();
        if (name) {
            const id = name.toLowerCase().replace(/\s+/g, '-');
            siteData.menu.categories.push({
                id,
                name,
                order: siteData.menu.categories.length + 1,
                items: []
            });
            renderMenu();
            markAsChanged();
        }
    });
}

function showEditCategoryModal(category) {
    showModal('Edit Category', `
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" id="editCategoryName" value="${category.name}">
        </div>
    `, () => {
        const name = document.getElementById('editCategoryName').value.trim();
        if (name) {
            category.name = name;
            renderMenu();
            markAsChanged();
        }
    });
}

function showAddFlavorModal(type) {
    const label = type === 'regular' ? 'Regular Flavor' : 'Sugar-Free Flavor';
    showModal(`Add ${label}`, `
        <div class="form-group">
            <label>Flavor Name</label>
            <input type="text" id="newFlavorName" placeholder="e.g., Vanilla">
        </div>
    `, () => {
        const name = document.getElementById('newFlavorName').value.trim();
        if (name) {
            siteData.flavors[type].push(name);
            renderFlavors();
            markAsChanged();
        }
    });
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Utility Functions =====
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.match(/^\d+$/)) {
            current = current[parseInt(key)];
        } else {
            current = current[key];
        }
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey.match(/^\d+$/)) {
        current[parseInt(lastKey)] = value;
    } else {
        current[lastKey] = value;
    }
}

// ===== Event Handlers =====
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    loginError.textContent = '';
    await login(password);
});

logoutBtn.addEventListener('click', () => {
    if (hasUnsavedChanges) {
        showConfirmModal('Unsaved Changes', 'You have unsaved changes. Are you sure you want to logout?', logout);
    } else {
        logout();
    }
});

deployBtn.addEventListener('click', () => {
    showConfirmModal(
        'Deploy to Server',
        'This will push all current saved data and files to the remote Unraid server. Are you sure you want to continue?',
        deployToServer
    );
});

saveBtn.addEventListener('click', saveData);
discardBtn.addEventListener('click', () => {
    showConfirmModal('Discard Changes', 'Are you sure you want to discard all changes?', discardChanges);
});

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ===== Initialize =====
checkAuth();
