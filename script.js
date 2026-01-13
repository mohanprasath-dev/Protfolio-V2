(function() {
    'use strict';

    const isTouchDevice = () => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    };

    const prefersReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

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
            
            this.init();
        }
        
        init() {
            document.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
            
            document.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-ready');
            });
            
            document.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-ready');
            });
            
            const magneticElements = document.querySelectorAll('.magnetic');
            magneticElements.forEach(el => {
                el.addEventListener('mouseenter', () => {
                    this.follower.classList.add('hovering');
                });
                el.addEventListener('mouseleave', () => {
                    this.follower.classList.remove('hovering');
                });
            });
            
            this.animate();
        }
        
        animate() {
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
            
            this.cursor.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px) translate(-50%, -50%)`;
            this.follower.style.transform = `translate(${this.followerPos.x}px, ${this.followerPos.y}px) translate(-50%, -50%)`;
            
            requestAnimationFrame(() => this.animate());
        }
    }

    class MagneticElements {
        constructor() {
            if (isTouchDevice()) return;
            
            this.elements = document.querySelectorAll('.magnetic');
            this.init();
        }
        
        init() {
            this.elements.forEach(el => {
                const strength = parseFloat(el.dataset.strength) || 0.2;
                const radius = 80;
                
                el.addEventListener('mousemove', (e) => {
                    const rect = el.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const deltaX = e.clientX - centerX;
                    const deltaY = e.clientY - centerY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    if (distance < radius) {
                        const magnetX = deltaX * strength;
                        const magnetY = deltaY * strength;
                        el.style.transform = `translate(${magnetX}px, ${magnetY}px)`;
                    }
                });
                
                el.addEventListener('mouseleave', () => {
                    el.style.transform = 'translate(0, 0)';
                    el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                    setTimeout(() => {
                        el.style.transition = '';
                    }, 400);
                });
            });
        }
    }

    class TiltCards {
        constructor() {
            if (isTouchDevice() || prefersReducedMotion()) return;
            
            this.cards = document.querySelectorAll('[data-tilt]');
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
                    
                    const rotateX = (y - centerY) / centerY * -8;
                    const rotateY = (x - centerX) / centerX * 8;
                    
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
                    card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                    setTimeout(() => {
                        card.style.transition = '';
                    }, 600);
                });
            });
        }
    }

    class ScrollReveal {
        constructor() {
            this.elements = document.querySelectorAll('.reveal-text, .reveal-line, .reveal-block');
            this.chars = document.querySelectorAll('.reveal-char');
            this.init();
        }
        
        init() {
            if (prefersReducedMotion()) {
                this.elements.forEach(el => el.classList.add('revealed'));
                this.chars.forEach(char => char.classList.add('revealed'));
                return;
            }
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const delay = entry.target.dataset.delay || 0;
                        setTimeout(() => {
                            entry.target.classList.add('revealed');
                        }, delay * 100);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            
            this.elements.forEach(el => observer.observe(el));
            
            const charObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.chars.forEach((char, index) => {
                            const delay = char.dataset.delay || index;
                            setTimeout(() => {
                                char.classList.add('revealed');
                            }, delay * 80 + 300);
                        });
                        charObserver.disconnect();
                    }
                });
            }, {
                threshold: 0.5
            });
            
            const heroTitle = document.querySelector('.hero-title');
            if (heroTitle) {
                charObserver.observe(heroTitle);
            }
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
            
            this.init();
        }
        
        init() {
            let ticking = false;
            
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.updateDepth();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
        
        updateDepth() {
            const scrollY = window.scrollY;
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
                        layer.style.transform = `translateZ(-400px) translateY(${depthOffset * 0.5}px)`;
                    });
                    
                    frontLayers.forEach(layer => {
                        layer.style.transform = `translateZ(220px) translateY(${-depthOffset * 0.2}px)`;
                    });
                }
            });
        }
    }

    class SmoothScroll {
        constructor() {
            this.links = document.querySelectorAll('a[href^="#"]');
            this.init();
        }
        
        init() {
            this.links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href');
                    const target = document.querySelector(targetId);
                    
                    if (target) {
                        const targetPosition = target.getBoundingClientRect().top + window.scrollY;
                        const startPosition = window.scrollY;
                        const distance = targetPosition - startPosition;
                        const duration = 1200;
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
                            }
                        };
                        
                        requestAnimationFrame(animation);
                    }
                });
            });
        }
    }

    class ContactForm {
        constructor() {
            this.form = document.getElementById('contactForm');
            if (!this.form) return;
            this.init();
        }
        
        init() {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(this.form);
                const data = Object.fromEntries(formData);
                
                console.log('Form submitted:', data);
                
                const submitBtn = this.form.querySelector('.form-submit');
                const originalText = submitBtn.querySelector('.submit-text').textContent;
                
                submitBtn.querySelector('.submit-text').textContent = 'Sent';
                submitBtn.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    this.form.reset();
                    submitBtn.querySelector('.submit-text').textContent = originalText;
                    submitBtn.style.pointerEvents = '';
                }, 2000);
            });
            
            const inputs = this.form.querySelectorAll('.form-input');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    input.parentElement.classList.add('focused');
                });
                input.addEventListener('blur', () => {
                    input.parentElement.classList.remove('focused');
                });
            });
        }
    }

    class HeroSequence {
        constructor() {
            if (prefersReducedMotion()) return;
            this.init();
        }
        
        init() {
            document.body.classList.add('no-scroll');
            
            setTimeout(() => {
                document.body.classList.remove('no-scroll');
            }, 1500);
        }
    }

    class ParallaxBackground {
        constructor() {
            if (isTouchDevice() || prefersReducedMotion()) return;
            
            this.heroMetadata = document.querySelector('.hero-metadata');
            if (!this.heroMetadata) return;
            
            this.scrollY = 0;
            this.init();
        }
        
        init() {
            window.addEventListener('scroll', () => {
                this.scrollY = window.scrollY;
            });
            
            this.animate();
        }
        
        animate() {
            const scrollOffset = this.scrollY * 0.15;
            
            if (this.heroMetadata) {
                const metadataTransY = scrollOffset * 0.06;
                this.heroMetadata.style.transform = `translateY(${metadataTransY}px)`;;
            }
            
            requestAnimationFrame(() => this.animate());
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        new Cursor();
        new MagneticElements();
        new TiltCards();
        new ScrollReveal();
        new DepthScroll();
        new SmoothScroll();
        new ContactForm();
        new HeroSequence();
        new ParallaxBackground();
    });

    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });

    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
})();
