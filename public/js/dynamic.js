class ContentManager {
  constructor() {
    this.cache = new Map();
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this));
  }

  async load(section) {
    if (this.cache.has(section)) return this.cache.get(section);
    
    try {
      const response = await fetch(`/content/${section}`);
      const html = await response.text();
      this.cache.set(section, html);
      return html;
    } catch (error) {
      return `<div class="error">Content unavailable</div>`;
    }
  }

  async render(section, targetElement) {
    const content = await this.load(section);
    targetElement.innerHTML = content;
    this.observer.observe(targetElement);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.animateContent(entry.target);
      }
    });
  }

  animateContent(element) {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }
}

// Initialize
window.contentManager = new ContentManager(); 