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
    const isOpen = content.classList.contains('open');
    // Close all open accordions
    document.querySelectorAll('.accordion-content.open').forEach(item => {
      if (item !== content) {
        item.classList.remove('open');
      }
    });
    // Toggle the clicked accordion
    if (isOpen) {
      content.classList.remove('open');
    } else {
      content.classList.add('open');
    }
  }
  

  // Make the function available globally for HTML onclick handlers
  window.toggleAccordion = toggleAccordion;

  // Theme switching logic using body class and CSS variables
  document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

      // Get available themes from data attribute
      let themes = [];
      const selectorWrapper = themeSelect.closest('.theme-selector');
      if (selectorWrapper && selectorWrapper.dataset.themes) {
        themes = JSON.parse(selectorWrapper.dataset.themes);
      } else {
        themes = ['blue', 'gold', 'green', 'purple']; // fallback
      }

      // Populate select
      themeSelect.innerHTML = themes.map(
        t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
      ).join('');

      function setTheme(theme) {
        themes.forEach(t => document.body.classList.remove(`theme-${t}`));
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('dashboard-theme', theme);
      }

      themeSelect.addEventListener('change', function() {
        setTheme(themeSelect.value);
      });

      // Restore theme from localStorage if available, else default to first theme
      const savedTheme = localStorage.getItem('dashboard-theme') || themes[0];
      if (themes.includes(savedTheme)) {
        themeSelect.value = savedTheme;
        setTheme(savedTheme);
      } else {
        setTheme(themes[0]);
      }
    });
  