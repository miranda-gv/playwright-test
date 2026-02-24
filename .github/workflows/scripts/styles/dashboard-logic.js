// dashboard-logic.js

// This script is responsible for handling the dynamic behavior of the dashboard page.
// It updates the total artifacts count and manages the accordion functionality for displaying artifact details.

// Check if the document is fully loaded
  if (document.readyState === 'loading') {
    // Document is still loading, wait for it to be ready
    document.addEventListener('DOMContentLoaded', updateTotalArtifacts);
  } else {
    // Document is already loaded, update the total artifacts count immediately
    updateTotalArtifacts();
  }
  
  /**
   * Update the total artifacts count in the HTML
   */
  function updateTotalArtifacts() {
    const totalArtifactsElement = document.getElementById('total-artifacts');
    if (totalArtifactsElement && window.totalArtifacts) {
      totalArtifactsElement.textContent = window.totalArtifacts;
    }
  }
  
  // Fallback for older browsers that may not support DOMContentLoaded
  if (document.readyState === 'complete') {
    // Document is already loaded, update the total artifacts count immediately
    updateTotalArtifacts();
  } else {
    // Document is still loading, wait for it to be ready
    document.addEventListener('DOMContentLoaded', updateTotalArtifacts);
  }  
document.addEventListener('DOMContentLoaded', function() {
    const totalArtifactsElement = document.getElementById('total-artifacts');
    if (totalArtifactsElement && window.totalArtifacts) {
      totalArtifactsElement.textContent = window.totalArtifacts;
    }
  });
  
  /**
   * Toggle the accordion expansion state
   * @param {HTMLElement} element - The accordion header element that was clicked
   * @export - Function is used in HTML via onclick attributes
   */
  function toggleAccordion(element) {
    const content = element.nextElementSibling;
    const isActive = content.classList.contains('active');
    
    // Close all active accordions
    document.querySelectorAll('.accordion-content.active').forEach(item => {
      if (item !== content) {
        item.classList.remove('active');
      }
    });
    
    // Toggle the clicked accordion
    if (isActive) {
      content.classList.remove('active');
    } else {
      content.classList.add('active');
    }
  }
  

  // Make the function available globally for HTML onclick handlers
  window.toggleAccordion = toggleAccordion;

  // Theme switching logic
  document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;
    const themeLink = document.querySelector('link[rel="stylesheet"][href*="scripts/"]');
    if (!themeLink) return;

    themeSelect.addEventListener('change', function() {
      const theme = themeSelect.value;
      themeLink.href = `./scripts/${theme}.css`;
      // Optionally, persist selection
      localStorage.setItem('dashboard-theme', theme);
    });

    // Restore theme from localStorage if available
    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme && themeSelect.querySelector(`option[value="${savedTheme}"]`)) {
      themeSelect.value = savedTheme;
      themeLink.href = `./scripts/${savedTheme}.css`;
    }
  });
  