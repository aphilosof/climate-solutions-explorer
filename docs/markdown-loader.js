// Load and render a markdown file into a target element
(function() {
  const contentEl = document.getElementById('faq-content') || document.getElementById('privacy-content');
  if (!contentEl) return;

  const mdFile = contentEl.id === 'faq-content' ? 'FAQ.md' : 'PRIVACY.md';

  fetch(mdFile)
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(text => {
      marked.setOptions({ breaks: true, gfm: true });
      const html = marked.parse(text);
      contentEl.innerHTML = DOMPurify.sanitize(html);
    })
    .catch(error => {
      console.error('Error loading content:', error);
      contentEl.innerHTML =
        '<p style="color: #ff4444;">Error loading content. Please try again later.</p>';
    });
})();
