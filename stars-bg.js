// Starfield Background Animation
document.addEventListener('DOMContentLoaded', function() {
    // Create star layers
    const stars = document.getElementById('stars');
    const stars2 = document.getElementById('stars2');
    const stars3 = document.getElementById('stars3');
    
    // Generate stars for each layer
    generateStars(stars, 200, 2);
    generateStars(stars2, 100, 3);
    generateStars(stars3, 50, 4);
    
    // Meteor shower animation
    setInterval(createMeteor, 5000);
    
    // Twinkling stars
    setInterval(twinkleStars, 1000);
    
    function generateStars(container, count, size) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            // Random size and opacity
            const starSize = Math.random() * size;
            const opacity = 0.1 + Math.random() * 0.9;
            
            star.style.position = 'absolute';
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${starSize}px`;
            star.style.height = `${starSize}px`;
            star.style.backgroundColor = '#ffffff';
            star.style.borderRadius = '50%';
            star.style.opacity = opacity;
            star.style.boxShadow = `0 0 ${starSize * 2}px ${starSize}px rgba(255, 255, 255, 0.3)`;
            
            container.appendChild(star);
        }
    }
    
    function createMeteor() {
        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        
        const startX = Math.random() * 100;
        const startY = -10;
        
        meteor.style.position = 'fixed';
        meteor.style.left = `${startX}%`;
        meteor.style.top = `${startY}%`;
        meteor.style.width = '2px';
        meteor.style.height = '100px';
        meteor.style.background = 'linear-gradient(to bottom, transparent, #ffffff, transparent)';
        meteor.style.borderRadius = '50%';
        meteor.style.transform = 'rotate(-45deg)';
        meteor.style.transformOrigin = 'top left';
        meteor.style.zIndex = '-1';
        
        document.body.appendChild(meteor);
        
        // Animate meteor
        const animation = meteor.animate([
            { 
                transform: `rotate(-45deg) translate(0, 0)`,
                opacity: 0
            },
            { 
                transform: `rotate(-45deg) translate(500px, 500px)`,
                opacity: 1
            },
            { 
                transform: `rotate(-45deg) translate(1000px, 1000px)`,
                opacity: 0
            }
        ], {
            duration: 2000,
            easing: 'ease-in'
        });
        
        // Remove after animation
        animation.onfinish = () => meteor.remove();
    }
    
    function twinkleStars() {
        const allStars = document.querySelectorAll('#stars .star, #stars2 .star, #stars3 .star');
        
        allStars.forEach(star => {
            if (Math.random() > 0.7) {
                const currentOpacity = parseFloat(star.style.opacity);
                const newOpacity = Math.min(1, Math.max(0.1, currentOpacity + (Math.random() - 0.5) * 0.5));
                
                star.animate([
                    { opacity: currentOpacity },
                    { opacity: newOpacity }
                ], {
                    duration: 1000,
                    fill: 'forwards'
                });
            }
        });
    }
    
    // Add CSS for meteor trail
    const style = document.createElement('style');
    style.textContent = `
        .star {
            position: absolute;
            border-radius: 50%;
        }
        
        .meteor {
            position: fixed;
            width: 2px;
            height: 100px;
            background: linear-gradient(to bottom, transparent, #ffffff, transparent);
            border-radius: 50%;
            transform: rotate(-45deg);
            transform-origin: top left;
            z-index: -1;
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.8));
        }
        
        .meteor::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, 
                rgba(0, 243, 255, 0) 0%,
                rgba(0, 243, 255, 0.3) 50%,
                rgba(0, 243, 255, 0) 100%);
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);
});