require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

[UPLOADS_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Admin password and session secret must be supplied via environment variables.
// Refuse to start if either is missing — never fall back to a baked-in default.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('FATAL: ADMIN_PASSWORD environment variable is required and must be at least 8 characters.');
    process.exit(1);
}

if (!SESSION_SECRET || SESSION_SECRET.length < 16) {
    console.error('FATAL: SESSION_SECRET environment variable is required and must be at least 16 characters.');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting for login attempts
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
    const attempts = loginAttempts.get(ip);
    if (!attempts) return true;

    if (Date.now() - attempts.lastAttempt > LOCKOUT_TIME) {
        loginAttempts.delete(ip);
        return true;
    }

    return attempts.count < MAX_ATTEMPTS;
}

function recordLoginAttempt(ip, success) {
    if (success) {
        loginAttempts.delete(ip);
        return;
    }

    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
}

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Data file path
const DATA_FILE = path.join(DATA_DIR, 'site-data.json');

// Default data template
const DEFAULT_DATA = {
    business: {
        name: "Blacktop Brews",
        tagline: "Mobile Coffee Trailer",
        heroText: "Mix & match flavors to create your perfect drink!",
        email: "hello@blacktopbrews.com",
        location: "Your Location",
        hours: { title: "Find Us", subtitle: "Our weekly schedule", schedule: [] },
        aboutTitle: "Our Story",
        aboutText: ["Welcome to Blacktop Brews."],
        contactTitle: "Get In Touch",
        contactText: "We would love to hear from you!",
        socialLinks: { facebook: "", instagram: "", nextdoor: "", googleMaps: "" }
    },
    menu: { title: "Our Menu", subtitle: "Crafted for you", categories: [] },
    flavors: { title: "Flavors", subtitle: "Customize your drink", regular: [], sugarFree: [], extras: [] },
    perks: { title: "Rewards", items: [] },
    heroGallery: { images: [], autoSlide: true, slideInterval: 5000 }
};

// Ensure site-data.json exists
if (!fs.existsSync(DATA_FILE)) {
    console.log('Site data file missing. Initializing with default data...');
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    } catch (err) {
        console.error('Failed to initialize site data:', err);
    }
}

// Helper functions
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return null;
    }
}

function writeData(data) {
    try {
        // Create backup before writing
        const backupPath = path.join(__dirname, 'data', `site-data-backup-${Date.now()}.json`);
        if (fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, backupPath);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        // Clean up old backups (keep last 5)
        const backupDir = path.join(__dirname, 'data');
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('site-data-backup-'))
            .sort()
            .reverse();

        backups.slice(5).forEach(backup => {
            fs.unlinkSync(path.join(backupDir, backup));
        });

        return true;
    } catch (error) {
        console.error('Error writing data file:', error);
        return false;
    }
}

// API Routes

// Get site data (public)
app.get('/api/data', (req, res) => {
    const data = readData();
    if (data) {
        res.json(data);
    } else {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: 'Too many login attempts. Please try again later.'
        });
    }

    const { password } = req.body;
    const provided = Buffer.from(typeof password === 'string' ? password : '');
    const expected = Buffer.from(ADMIN_PASSWORD);
    const crypto = require('crypto');
    const valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    if (valid) {
        recordLoginAttempt(ip, true);
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        recordLoginAttempt(ip, false);
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check auth status
app.get('/api/auth-status', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// Update site data (protected)
app.put('/api/data', requireAuth, (req, res) => {
    const newData = req.body;

    if (!newData || typeof newData !== 'object') {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (writeData(newData)) {
        res.json({ success: true, message: 'Data saved successfully' });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Update specific section (protected)
app.patch('/api/data/:section', requireAuth, (req, res) => {
    const { section } = req.params;
    const sectionData = req.body;

    const data = readData();
    if (!data) {
        return res.status(500).json({ error: 'Failed to read data' });
    }

    data[section] = sectionData;

    if (writeData(data)) {
        res.json({ success: true, message: `${section} updated successfully` });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Add menu item (protected)
app.post('/api/menu/:categoryId/items', requireAuth, (req, res) => {
    const { categoryId } = req.params;
    const newItem = req.body;

    const data = readData();
    if (!data) {
        return res.status(500).json({ error: 'Failed to read data' });
    }

    const category = data.menu.categories.find(c => c.id === categoryId);
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }

    // Generate new ID
    const maxId = Math.max(...data.menu.categories.flatMap(c => c.items.map(i => i.id)), 0);
    newItem.id = maxId + 1;

    category.items.push(newItem);

    if (writeData(data)) {
        res.json({ success: true, item: newItem });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Delete menu item (protected)
app.delete('/api/menu/:categoryId/items/:itemId', requireAuth, (req, res) => {
    const { categoryId, itemId } = req.params;

    const data = readData();
    if (!data) {
        return res.status(500).json({ error: 'Failed to read data' });
    }

    const category = data.menu.categories.find(c => c.id === categoryId);
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }

    const itemIndex = category.items.findIndex(i => i.id === parseInt(itemId));
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    category.items.splice(itemIndex, 1);

    if (writeData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Add menu category (protected)
app.post('/api/menu/categories', requireAuth, (req, res) => {
    const newCategory = req.body;

    const data = readData();
    if (!data) {
        return res.status(500).json({ error: 'Failed to read data' });
    }

    // Generate ID from name
    newCategory.id = newCategory.name.toLowerCase().replace(/\s+/g, '-');
    newCategory.items = newCategory.items || [];
    newCategory.order = data.menu.categories.length + 1;

    data.menu.categories.push(newCategory);

    if (writeData(data)) {
        res.json({ success: true, category: newCategory });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Delete menu category (protected)
app.delete('/api/menu/categories/:categoryId', requireAuth, (req, res) => {
    const { categoryId } = req.params;

    const data = readData();
    if (!data) {
        return res.status(500).json({ error: 'Failed to read data' });
    }

    const categoryIndex = data.menu.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) {
        return res.status(404).json({ error: 'Category not found' });
    }

    data.menu.categories.splice(categoryIndex, 1);

    if (writeData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Upload image (protected)
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the URL to access the uploaded file
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Upload multiple images (protected)
app.post('/api/upload/multiple', requireAuth, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size
        }));

        res.json({
            success: true,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// Delete uploaded image (protected)
app.delete('/api/upload/:filename', requireAuth, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'File deleted' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// List uploaded images (protected)
app.get('/api/uploads', requireAuth, (req, res) => {
    try {
        const files = fs.readdirSync(UPLOADS_DIR)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(UPLOADS_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    url: `/uploads/${file}`,
                    size: stats.size,
                    uploadedAt: stats.mtime
                };
            })
            .sort((a, b) => b.uploadedAt - a.uploadedAt);

        res.json({ success: true, files });
    } catch (error) {
        console.error('List uploads error:', error);
        res.status(500).json({ error: 'Failed to list uploads' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Error handling for multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: error.message });
    } else if (error) {
        return res.status(400).json({ error: error.message });
    }
    next();
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ☕ Blacktop Brews Server Running                        ║
║                                                           ║
║   Website:  http://localhost:${PORT}                        ║
║   Admin:    http://localhost:${PORT}/admin.html             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
