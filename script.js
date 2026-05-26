// ===== Site Data =====
let siteData = null;

// ===== Load Site Data =====
async function loadSiteData() {
    try {
        // Try the API first
        const response = await fetch('/api/data');
        if (response.ok) {
            siteData = await response.json();
            renderSiteContent();
            console.log('Loaded data from API');
            return;
        }
        throw new Error('API not available');
    } catch (error) {
        console.log('API not available, attempting to load static data file...');
        try {
            // Fallback to the static JSON file (useful for static hosting like Nginx)
            const staticResponse = await fetch('/data/site-data.json');
            if (staticResponse.ok) {
                siteData = await staticResponse.json();
                renderSiteContent();
                console.log('Loaded data from static JSON file');
            }
        } catch (staticError) {
            console.error('Failed to load site data:', staticError);
        }
    }
}

// ===== Render Dynamic Content =====
function renderSiteContent() {
    if (!siteData) return;

    // Business Info
    const businessName = siteData.business.name;
    document.querySelectorAll('[data-content="business.name"]').forEach(el => {
        el.textContent = businessName;
    });

    const tagline = siteData.business.tagline;
    document.querySelectorAll('[data-content="business.tagline"]').forEach(el => {
        el.textContent = tagline;
    });

    const heroText = siteData.business.heroText;
    document.querySelectorAll('[data-content="business.heroText"]').forEach(el => {
        el.textContent = heroText;
    });

    // About Section
    const aboutTitle = siteData.business.aboutTitle;
    document.querySelectorAll('[data-content="business.aboutTitle"]').forEach(el => {
        el.textContent = aboutTitle;
    });

    const aboutContainer = document.querySelector('[data-content="business.aboutText"]');
    if (aboutContainer && siteData.business.aboutText) {
        aboutContainer.innerHTML = siteData.business.aboutText.map(p => `<p>${p}</p>`).join('');
    }

    // Contact
    const email = siteData.business.email;
    document.querySelectorAll('[data-content="business.email"]').forEach(el => {
        if (el.tagName === 'A') {
            el.href = `mailto:${email}`;
        } else {
            el.textContent = email;
        }
    });

    const contactTitle = siteData.business.contactTitle;
    document.querySelectorAll('[data-content="business.contactTitle"]').forEach(el => {
        el.textContent = contactTitle;
    });

    const contactText = siteData.business.contactText;
    document.querySelectorAll('[data-content="business.contactText"]').forEach(el => {
        el.textContent = contactText;
    });

    // Social Links
    const socialPlatforms = ['facebook', 'instagram', 'nextdoor', 'googleMaps'];
    socialPlatforms.forEach(platform => {
        const link = document.querySelector(`[data-social="${platform}"]`);
        if (link && siteData.business.socialLinks[platform]) {
            link.href = siteData.business.socialLinks[platform];
            link.style.display = 'flex';
        } else if (link && !siteData.business.socialLinks[platform]) {
            link.style.display = 'none';
        }
    });

    // Logo
    renderLogo();

    // Hero Gallery
    renderHeroGallery();

    // Hours
    renderHours();

    // Menu
    renderMenu();

    // Flavors
    renderFlavors();

    // Perks
    renderPerks();

    // Re-initialize animations after content loaded
    initAnimations();
    initMenuHoverEffects();
    initFlavorHoverEffects();
}

function renderLogo() {
    const logoImg = document.getElementById('logoImg');
    const logoText = document.querySelector('.logo-text');

    if (siteData.business.logo && logoImg) {
        logoImg.src = siteData.business.logo;
        logoImg.style.display = 'block';
        // Optionally hide text when logo image is present
        // if (logoText) logoText.style.display = 'none';
    } else if (logoImg) {
        logoImg.style.display = 'none';
    }
}

// ===== Hero Gallery =====
let currentSlide = 0;
let galleryInterval = null;

function renderHeroGallery() {
    if (!siteData.heroGallery || !siteData.heroGallery.images || siteData.heroGallery.images.length === 0) {
        return; // Keep placeholder
    }

    const hero = document.querySelector('.hero');
    const gallerySlides = document.getElementById('gallerySlides');
    const galleryNav = document.getElementById('galleryNav');
    const images = siteData.heroGallery.images;

    // Add class to hero for styling
    hero.classList.add('has-images');

    // Render slides
    gallerySlides.innerHTML = images.map((img, index) => `
        <div class="gallery-slide ${index === 0 ? 'active' : ''}"
             style="background-image: url('${img.url}');"
             data-index="${index}">
            ${img.link ? `<a href="${img.link}" class="slide-link" target="_blank" rel="noopener"></a>` : ''}
        </div>
    `).join('');

    // Render navigation dots
    if (images.length > 1) {
        galleryNav.innerHTML = images.map((_, index) => `
            <button class="gallery-dot ${index === 0 ? 'active' : ''}"
                    data-index="${index}"
                    aria-label="Go to slide ${index + 1}"></button>
        `).join('');

        // Bind dot clicks
        galleryNav.querySelectorAll('.gallery-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                goToSlide(parseInt(dot.dataset.index));
            });
        });

        // Start auto-slide if enabled
        if (siteData.heroGallery.autoSlide) {
            startAutoSlide();
        }
    } else {
        galleryNav.style.display = 'none';
        document.getElementById('galleryPrev').style.display = 'none';
        document.getElementById('galleryNext').style.display = 'none';
    }
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.gallery-slide');
    const dots = document.querySelectorAll('.gallery-dot');

    if (slides.length === 0) return;

    // Wrap around
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    currentSlide = index;

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function nextSlide() {
    goToSlide(currentSlide + 1);
}

function prevSlide() {
    goToSlide(currentSlide - 1);
}

function startAutoSlide() {
    const interval = siteData.heroGallery.slideInterval || 5000;
    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(nextSlide, interval);
}

function stopAutoSlide() {
    if (galleryInterval) {
        clearInterval(galleryInterval);
        galleryInterval = null;
    }
}

// Gallery arrow controls
document.getElementById('galleryPrev')?.addEventListener('click', () => {
    prevSlide();
    stopAutoSlide();
    if (siteData?.heroGallery?.autoSlide) {
        setTimeout(startAutoSlide, 10000); // Resume after 10 seconds
    }
});

document.getElementById('galleryNext')?.addEventListener('click', () => {
    nextSlide();
    stopAutoSlide();
    if (siteData?.heroGallery?.autoSlide) {
        setTimeout(startAutoSlide, 10000);
    }
});

function renderHours() {
    if (!siteData.business.hours) return;

    const hoursTitle = document.querySelector('[data-content="hours.title"]');
    if (hoursTitle) hoursTitle.textContent = siteData.business.hours.title;

    const hoursSubtitle = document.querySelector('[data-content="hours.subtitle"]');
    if (hoursSubtitle) hoursSubtitle.textContent = siteData.business.hours.subtitle;

    const hoursGrid = document.getElementById('hoursGrid');
    if (!hoursGrid) return;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    hoursGrid.innerHTML = siteData.business.hours.schedule.map(item => {
        const isToday = item.day === today;
        const isClosed = item.closed;
        let classes = 'hours-card';
        if (isToday) classes += ' today';
        if (isClosed) classes += ' closed';

        return `
            <div class="${classes}">
                <div class="hours-day">${item.day}${isToday ? ' (Today)' : ''}</div>
                <div class="hours-time">${isClosed ? 'Closed' : item.time}</div>
                <div class="hours-location">${isClosed ? 'See you next time!' : item.location}</div>
            </div>
        `;
    }).join('');
}

function renderMenu() {
    const menuGrid = document.querySelector('.menu-grid');
    if (!menuGrid || !siteData.menu) return;

    // Update menu title and subtitle
    const menuTitle = document.querySelector('[data-content="menu.title"]');
    if (menuTitle) menuTitle.textContent = siteData.menu.title;

    const menuSubtitle = document.querySelector('[data-content="menu.subtitle"]');
    if (menuSubtitle) menuSubtitle.textContent = siteData.menu.subtitle;

    // Filter and render only active categories and items
    const activeCategories = siteData.menu.categories
        .filter(category => category.active !== false)
        .sort((a, b) => a.order - b.order);

    menuGrid.innerHTML = activeCategories.map(category => {
        // Filter only active items within the category
        const activeItems = category.items.filter(item => item.active !== false);

        // Don't render category if no active items
        if (activeItems.length === 0) return '';

        return `
            <div class="menu-category">
                <div class="category-header">
                    <h3>${category.name}</h3>
                </div>
                <div class="menu-items">
                    ${activeItems.map(item => {
                        const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
                        const priceHtml = hasSizes
                            ? `<div class="item-sizes">${item.sizes.map(s => `
                                    <div class="item-size">
                                        ${s.name ? `<span class="size-name">${s.name}</span>` : ''}
                                        <span class="size-price">$${(typeof s.price === 'number' ? s.price : 0).toFixed(2)}</span>
                                    </div>
                                `).join('')}</div>`
                            : `<span class="item-price">$${(typeof item.price === 'number' ? item.price : 0).toFixed(2)}</span>`;
                        return `
                        <div class="menu-item ${hasSizes ? 'has-sizes' : ''}">
                            <div class="item-info">
                                <span class="item-name">${item.name}</span>
                                <span class="item-desc">${item.description}</span>
                            </div>
                            ${priceHtml}
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderFlavors() {
    if (!siteData.flavors) return;

    // Update flavors title and subtitle
    const flavorsTitle = document.querySelector('[data-content="flavors.title"]');
    if (flavorsTitle) flavorsTitle.textContent = siteData.flavors.title;

    const flavorsSubtitle = document.querySelector('[data-content="flavors.subtitle"]');
    if (flavorsSubtitle) flavorsSubtitle.textContent = siteData.flavors.subtitle;

    // Regular flavors
    const regularList = document.querySelector('[data-content="flavors.regular"]');
    if (regularList) {
        regularList.innerHTML = siteData.flavors.regular.map(f => `<li>${f}</li>`).join('') + '<li>& More!</li>';
    }

    // Sugar-free flavors
    const sugarFreeList = document.querySelector('[data-content="flavors.sugarFree"]');
    if (sugarFreeList) {
        sugarFreeList.innerHTML = siteData.flavors.sugarFree.map(f => `<li>${f}</li>`).join('');
    }

    // Extras
    const extrasList = document.querySelector('[data-content="flavors.extras"]');
    if (extrasList) {
        extrasList.innerHTML = siteData.flavors.extras.map(extra => {
            const priceText = extra.price === 0 ? 'Free' : `+$${extra.price.toFixed(2)}`;
            return `<li><span>${extra.name}</span><span class="extra-price">${priceText}</span></li>`;
        }).join('');
    }
}

function renderPerks() {
    if (!siteData.perks) return;

    const perksTitle = document.querySelector('[data-content="perks.title"]');
    if (perksTitle) perksTitle.textContent = siteData.perks.title;

    const perksGrid = document.querySelector('.perks-grid');
    if (!perksGrid) return;

    const iconMap = {
        card: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 10H20V7H22V10ZM22 13H20V16H22V13ZM17 4H7C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4ZM7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2ZM9 10H11V12H9V10ZM13 10H15V12H13V10ZM9 14H11V16H9V14ZM13 14H15V16H13V14Z"/></svg>`,
        gift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 2C18.5376 2 21 4.46243 21 7.5C21 9.36016 20.0817 11.0075 18.6685 12H22V22H2V12H5.33152C3.91828 11.0075 3 9.36016 3 7.5C3 4.46243 5.46243 2 8.5 2C10.2147 2 11.7479 2.81018 12.7466 4.07441L12 4.87012L11.2534 4.07441C12.2521 2.81018 13.7853 2 15.5 2ZM20 14H4V20H20V14ZM11 14H13V17H16V19H13V17H11V19H8V17H11V14ZM8.5 4C6.567 4 5 5.567 5 7.5C5 9.20008 6.20893 10.6209 7.81026 10.9269L8.58749 11.0654L9.07998 11.6944L11 14.1424V12H13V14.1424L14.92 11.6944L15.4125 11.0654L16.1897 10.9269C17.7911 10.6209 19 9.20008 19 7.5C19 5.567 17.433 4 15.5 4C14.2119 4 13.0864 4.70549 12.4993 5.74635L12 6.64L11.5007 5.74635C10.9136 4.70549 9.78807 4 8.5 4Z"/></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L21.5 6.5V17.5L12 23L2.5 17.5V6.5L12 1ZM12 3.311L4.5 7.65311V16.3469L12 20.689L19.5 16.3469V7.65311L12 3.311ZM12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z"/></svg>`
    };

    perksGrid.innerHTML = siteData.perks.items.map(perk => `
        <div class="perk-card">
            <div class="perk-icon">
                ${iconMap[perk.icon] || iconMap.star}
            </div>
            <h3>${perk.title}</h3>
            <p>${perk.description}</p>
        </div>
    `).join('');
}

// ===== Navigation =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

// Scroll effect for navbar
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
});

// Close mobile menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

function initAnimations() {
    const animatedElements = document.querySelectorAll(
        '.feature, .menu-category, .customize-card, .perk-card, .contact-card, .about-text p'
    );

    animatedElements.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
}

// ===== Active Navigation Link =====
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (navLink && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            navLink.classList.add('active');
        }
    });
});

// ===== Parallax Effect on Hero =====
const hero = document.querySelector('.hero');

window.addEventListener('scroll', () => {
    if (hero) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.3;
        hero.style.backgroundPositionY = `${rate}px`;
    }
});

// ===== Menu Item Hover Effects =====
function initMenuHoverEffects() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateX(10px)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateX(0)';
        });
    });
}

// ===== Flavor List Animation =====
function initFlavorHoverEffects() {
    const flavorItems = document.querySelectorAll('.flavor-list li');

    flavorItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.paddingLeft = '15px';
        });

        item.addEventListener('mouseleave', () => {
            item.style.paddingLeft = '0';
        });
    });
}

// ===== Button Ripple Effect =====
const buttons = document.querySelectorAll('.btn');

buttons.forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();

        ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            transform: scale(0);
            animation: ripple 0.6s linear;
            left: ${e.clientX - rect.left}px;
            top: ${e.clientY - rect.top}px;
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
        `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation to stylesheet
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Load dynamic data
    loadSiteData();

    // Initialize static animations (will be re-run after data loads)
    initAnimations();
    initMenuHoverEffects();
    initFlavorHoverEffects();
});

// ===== Preloader (optional) =====
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// ===== Console Easter Egg =====
console.log('%c☕ Blacktop Brews', 'font-size: 24px; font-weight: bold; color: #d4a574;');
console.log('%cMix & match flavors to create your perfect drink!', 'font-size: 14px; color: #8b4513;');
