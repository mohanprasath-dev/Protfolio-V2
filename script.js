(function() {
    'use strict';

    const isTouchDevice = () => {
        try {
            return 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 || 
                   window.matchMedia('(pointer: coarse)').matches;
        } catch (e) {
            return false;
        }
    };

    const prefersReducedMotion = () => {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    };

    const supportsPassive = (() => {
        let passive = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get: function() { passive = true; return true; }
            });
            window.addEventListener('testPassive', null, opts);
            window.removeEventListener('testPassive', null, opts);
        } catch (e) {}
        return passive;
    })();

    const passiveOption = supportsPassive ? { passive: true } : false;

    class Cursor {
        constructor() {
            if (isTouchDevice()) return;
            
            this.cursor = document.querySelector('.cursor');
            this.follower = document.querySelector('.cursor-follower');
            
            if (!this.cursor || !this.follower) return;
            
            this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            this.followerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            
            this.lerp = 0.12;
            this.damping = 0.85;
            this.velocity = { x: 0, y: 0 };
            this.rafId = null;
            this.isVisible = false;
            
            this.init();
        }
        
        init() {
            document.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }, passiveOption);
            
            document.addEventListener('mouseenter', () => {
                this.isVisible = true;
                document.body.classList.add('cursor-ready');
            });
            
            document.addEventListener('mouseleave', () => {
                this.isVisible = false;
                document.body.classList.remove('cursor-ready');
            });
            
            const magneticElements = document.querySelectorAll('.magnetic');
            magneticElements.forEach(el => {
                el.addEventListener('mouseenter', () => {
                    if (this.follower) this.follower.classList.add('hovering');
                });
                el.addEventListener('mouseleave', () => {
                    if (this.follower) this.follower.classList.remove('hovering');
                });
            });
            
            this.animate();
        }
        
        animate() {
            if (!this.cursor || !this.follower) return;
            
            const dx = this.mouse.x - this.pos.x;
            const dy = this.mouse.y - this.pos.y;
            
            this.velocity.x += dx * this.lerp;
            this.velocity.y += dy * this.lerp;
            
            this.velocity.x *= this.damping;
            this.velocity.y *= this.damping;
            
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
            
            this.followerPos.x += (this.mouse.x - this.followerPos.x) * 0.08;
            this.followerPos.y += (this.mouse.y - this.followerPos.y) * 0.08;
            
            this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;
            this.follower.style.transform = `translate3d(${this.followerPos.x}px, ${this.followerPos.y}px, 0) translate(-50%, -50%)`;
            
            this.rafId = requestAnimationFrame(() => this.animate());
        }
        
        destroy() {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
        }
    }

    class MagneticElements {
        constructor() {
            if (isTouchDevice()) return;
            
            this.elements = document.querySelectorAll('.magnetic');
            this.boundHandlers = new Map();
            this.init();
        }
        
        init() {
            this.elements.forEach(el => {
                const strength = parseFloat(el.dataset.strength) || 0.2;
                const radius = 80;
                
                const moveHandler = (e) => {
                    const rect = el.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const deltaX = e.clientX - centerX;
                    const deltaY = e.clientY - centerY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    if (distance < radius) {
                        const magnetX = deltaX * strength;
                        const magnetY = deltaY * strength;
                        el.style.transform = `translate3d(${magnetX}px, ${magnetY}px, 0)`;
                    }
                };
                
                const leaveHandler = () => {
                    el.style.transform = 'translate3d(0, 0, 0)';
                    el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                    const timeoutId = setTimeout(() => {
                        el.style.transition = '';
                    }, 400);
                    this.boundHandlers.set(el, { ...this.boundHandlers.get(el), timeoutId });
                };
                
                el.addEventListener('mousemove', moveHandler, passiveOption);
                el.addEventListener('mouseleave', leaveHandler);
                
                this.boundHandlers.set(el, { moveHandler, leaveHandler });
            });
        }
        
        destroy() {
            this.boundHandlers.forEach((handlers, el) => {
                if (handlers.timeoutId) clearTimeout(handlers.timeoutId);
            });
        }
    }

    class TiltCards {
        constructor() {
            if (isTouchDevice() || prefersReducedMotion()) return;
            
            this.cards = document.querySelectorAll('[data-tilt]');
            this.timeouts = new Map();
            this.init();
        }
        
        init() {
            this.cards.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = ((y - centerY) / centerY) * -8;
                    const rotateY = ((x - centerX) / centerX) * 8;
                    
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
                }, passiveOption);
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
                    card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                    
                    if (this.timeouts.has(card)) {
                        clearTimeout(this.timeouts.get(card));
                    }
                    
                    const timeoutId = setTimeout(() => {
                        card.style.transition = '';
                        this.timeouts.delete(card);
                    }, 600);
                    
                    this.timeouts.set(card, timeoutId);
                });
            });
        }
        
        destroy() {
            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts.clear();
        }
    }

    class ScrollReveal {
        constructor() {
            this.elements = document.querySelectorAll('.reveal-text, .reveal-line, .reveal-block');
            this.chars = document.querySelectorAll('.reveal-char');
            this.observer = null;
            this.charObserver = null;
            this.timeouts = [];
            this.init();
        }
        
        init() {
            if (prefersReducedMotion()) {
                this.elements.forEach(el => el.classList.add('revealed'));
                this.chars.forEach(char => char.classList.add('revealed'));
                return;
            }
            
            if (!('IntersectionObserver' in window)) {
                this.elements.forEach(el => el.classList.add('revealed'));
                this.chars.forEach(char => char.classList.add('revealed'));
                return;
            }
            
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                        const timeoutId = setTimeout(() => {
                            entry.target.classList.add('revealed');
                        }, delay * 100);
                        this.timeouts.push(timeoutId);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            
            this.elements.forEach(el => this.observer.observe(el));
            
            this.charObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.chars.forEach((char, index) => {
                            const delay = parseInt(char.dataset.delay, 10) || index;
                            const timeoutId = setTimeout(() => {
                                char.classList.add('revealed');
                            }, delay * 80 + 300);
                            this.timeouts.push(timeoutId);
                        });
                        this.charObserver.disconnect();
                    }
                });
            }, {
                threshold: 0.5
            });
            
            const heroTitle = document.querySelector('.hero-title');
            if (heroTitle) {
                this.charObserver.observe(heroTitle);
            }
        }
        
        destroy() {
            this.timeouts.forEach(id => clearTimeout(id));
            if (this.observer) this.observer.disconnect();
            if (this.charObserver) this.charObserver.disconnect();
        }
    }

    class DepthScroll {
        constructor() {
            if (prefersReducedMotion()) return;
            
            this.sections = document.querySelectorAll('.section');
            this.layers = {
                back: document.querySelectorAll('.layer-back'),
                mid: document.querySelectorAll('.layer-mid'),
                front: document.querySelectorAll('.layer-front')
            };
            
            this.ticking = false;
            this.boundUpdate = this.handleScroll.bind(this);
            this.init();
        }
        
        init() {
            window.addEventListener('scroll', this.boundUpdate, passiveOption);
        }
        
        handleScroll() {
            if (!this.ticking) {
                requestAnimationFrame(() => {
                    this.updateDepth();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        }
        
        updateDepth() {
            const windowHeight = window.innerHeight;
            
            this.sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top;
                const sectionHeight = rect.height;
                
                if (sectionTop < windowHeight && sectionTop > -sectionHeight) {
                    const progress = 1 - (sectionTop / windowHeight);
                    const depthOffset = progress * 30;
                    
                    const backLayers = section.querySelectorAll('.layer-back');
                    const frontLayers = section.querySelectorAll('.layer-front');
                    
                    backLayers.forEach(layer => {
                        layer.style.transform = `translateZ(-400px) translate3d(0, ${depthOffset * 0.5}px, 0)`;
                    });
                    
                    frontLayers.forEach(layer => {
                        layer.style.transform = `translateZ(220px) translate3d(0, ${-depthOffset * 0.2}px, 0)`;
                    });
                }
            });
        }
        
        destroy() {
            window.removeEventListener('scroll', this.boundUpdate);
        }
    }

    class SmoothScroll {
        constructor() {
            this.links = document.querySelectorAll('a[href^="#"]');
            this.isAnimating = false;
            this.init();
        }
        
        init() {
            this.links.forEach(link => {
                link.addEventListener('click', (e) => {
                    if (this.isAnimating) return;
                    
                    const targetId = link.getAttribute('href');
                    if (!targetId || targetId === '#') return;
                    
                    const target = document.querySelector(targetId);
                    if (!target) return;
                    
                    e.preventDefault();
                    
                    if (prefersReducedMotion()) {
                        target.scrollIntoView({ behavior: 'auto', block: 'start' });
                        return;
                    }
                    
                    this.isAnimating = true;
                    
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
                    const startPosition = window.scrollY;
                    const distance = targetPosition - startPosition;
                    const duration = Math.min(1200, Math.max(600, Math.abs(distance) * 0.5));
                    let start = null;
                    
                    const ease = (t) => {
                        return t < 0.5 
                            ? 4 * t * t * t 
                            : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    };
                    
                    const animation = (currentTime) => {
                        if (start === null) start = currentTime;
                        const elapsed = currentTime - start;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        window.scrollTo(0, startPosition + distance * ease(progress));
                        
                        if (elapsed < duration) {
                            requestAnimationFrame(animation);
                        } else {
                            this.isAnimating = false;
                        }
                    };
                    
                    requestAnimationFrame(animation);
                });
            });
        }
    }

    class ContactForm {
        constructor() {
            this.form = document.getElementById('contactForm');
            if (!this.form) return;
            this.isSubmitting = false;
            this.timeoutId = null;
            this.init();
        }
        
        init() {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                if (this.isSubmitting) return;
                
                if (!this.form.checkValidity()) {
                    this.form.reportValidity();
                    return;
                }
                
                this.isSubmitting = true;
                
                const formData = new FormData(this.form);
                const data = Object.fromEntries(formData);
                
                const submitBtn = this.form.querySelector('.form-submit');
                const submitText = submitBtn ? submitBtn.querySelector('.submit-text') : null;
                
                if (!submitBtn || !submitText) {
                    this.isSubmitting = false;
                    return;
                }
                
                const originalText = submitText.textContent;
                
                submitText.textContent = 'Sent';
                submitBtn.style.pointerEvents = 'none';
                submitBtn.setAttribute('aria-busy', 'true');
                
                this.timeoutId = setTimeout(() => {
                    this.form.reset();
                    submitText.textContent = originalText;
                    submitBtn.style.pointerEvents = '';
                    submitBtn.removeAttribute('aria-busy');
                    this.isSubmitting = false;
                }, 2000);
            });
            
            const inputs = this.form.querySelectorAll('.form-input');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    const parent = input.parentElement;
                    if (parent) parent.classList.add('focused');
                });
                input.addEventListener('blur', () => {
                    const parent = input.parentElement;
                    if (parent) parent.classList.remove('focused');
                });
            });
        }
        
        destroy() {
            if (this.timeoutId) clearTimeout(this.timeoutId);
        }
    }

    class HeroSequence {
        constructor() {
            if (prefersReducedMotion()) return;
            this.timeoutId = null;
            this.init();
        }
        
        init() {
            document.body.classList.add('no-scroll');
            
            this.timeoutId = setTimeout(() => {
                document.body.classList.remove('no-scroll');
            }, 1500);
        }
        
        destroy() {
            if (this.timeoutId) clearTimeout(this.timeoutId);
            document.body.classList.remove('no-scroll');
        }
    }

    class ParallaxBackground {
        constructor() {
            if (isTouchDevice() || prefersReducedMotion()) return;
            
            this.heroMetadata = document.querySelector('.hero-metadata');
            if (!this.heroMetadata) return;
            
            this.scrollY = 0;
            this.rafId = null;
            this.ticking = false;
            this.boundScrollHandler = this.handleScroll.bind(this);
            this.init();
        }
        
        init() {
            window.addEventListener('scroll', this.boundScrollHandler, passiveOption);
            this.animate();
        }
        
        handleScroll() {
            this.scrollY = window.scrollY;
        }
        
        animate() {
            const scrollOffset = this.scrollY * 0.15;
            
            if (this.heroMetadata) {
                const metadataTransY = scrollOffset * 0.06;
                this.heroMetadata.style.transform = `translate3d(0, ${metadataTransY}px, 0)`;
            }
            
            this.rafId = requestAnimationFrame(() => this.animate());
        }
        
        destroy() {
            window.removeEventListener('scroll', this.boundScrollHandler);
            if (this.rafId) cancelAnimationFrame(this.rafId);
        }
    }

    let instances = {};

    const init = () => {
        instances.cursor = new Cursor();
        instances.magnetic = new MagneticElements();
        instances.tilt = new TiltCards();
        instances.reveal = new ScrollReveal();
        instances.depth = new DepthScroll();
        instances.scroll = new SmoothScroll();
        instances.form = new ContactForm();
        instances.hero = new HeroSequence();
        instances.parallax = new ParallaxBackground();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });

    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    window.addEventListener('pagehide', () => {
        Object.values(instances).forEach(instance => {
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
        });
    });
})();
