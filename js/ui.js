// UI Enhancement Script
// Description auto-hide, sidebar toggle, keyboard shortcuts, home button

// Auto-hide description after 6 seconds
let descriptionHidden = false;
setTimeout(() => {
  const description = document.getElementById('siteDescription');
  if (description) {
    description.style.maxHeight = '0';
    description.style.opacity = '0';
    description.style.marginBottom = '0';
    descriptionHidden = true;
  }
}, 6000);

// Click site title to show description again
const siteTitle = document.querySelector('.site-title');
if (siteTitle) {
  siteTitle.style.cursor = 'pointer';
  siteTitle.addEventListener('click', () => {
    const description = document.getElementById('siteDescription');
    if (description && descriptionHidden) {
      description.style.maxHeight = '100px';
      description.style.opacity = '1';
      description.style.marginBottom = '15px';
      descriptionHidden = false;
      // Auto-hide again after 6 seconds
      setTimeout(() => {
        description.style.maxHeight = '0';
        description.style.opacity = '0';
        description.style.marginBottom = '0';
        descriptionHidden = true;
      }, 6000);
    }
  });
}

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', openSidebar);
}

if (sidebarClose) {
  sidebarClose.addEventListener('click', closeSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

// Home button functionality
const homeToggle = document.getElementById('homeToggle');
if (homeToggle) {
  homeToggle.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('resetVisualization'));
  });
}
