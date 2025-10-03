/**
 * Vehicle Owner Feedback Carousel
 * This script handles the auto-scrolling feedback carousel that displays reviews
 * from signed-in users (users table only).
 * This carousel scrolls from left to right, while the customer carousel scrolls right to left.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the vehicle owner feedback carousel
    initVehicleOwnerCarousel();
});

/**
 * Initialize the vehicle owner feedback carousel by fetching reviews and setting up auto-scroll
 */
function initVehicleOwnerCarousel() {
    const carouselElement = document.getElementById('vehicleOwnerCarousel');
    if (!carouselElement) return;
    
    // Fetch feedback data and populate the carousel
    fetchVehicleOwnerFeedbackData()
        .then(feedbacks => {
            if (feedbacks && feedbacks.length > 0) {
                // Filter feedbacks to only include those with rating AND review text
                const validFeedbacks = feedbacks.filter(feedback => 
                    feedback.rating > 0 && 
                    feedback.reviewText && 
                    feedback.reviewText.trim() !== ''
                );
                
                if (validFeedbacks.length > 0) {
                    // First, get all registered user locations to enrich the feedback data
                    fetchRegisteredUserLocations()
                        .then(userLocations => {
                            // Enrich feedback data with user locations
                            const enrichedFeedbacks = enrichFeedbackWithUserLocations(validFeedbacks, userLocations);
                            populateVehicleOwnerCarousel(carouselElement, enrichedFeedbacks);
                            setupLeftToRightScroll(carouselElement);
                        })
                        .catch(error => {
                            console.error('Error fetching user locations:', error);
                            // If we fail to fetch user locations, just proceed with the original feedback data
                            populateVehicleOwnerCarousel(carouselElement, validFeedbacks);
                            setupLeftToRightScroll(carouselElement);
                        });
                } else {
                    showNoFeedbackMessage(carouselElement);
                }
            } else {
                showNoFeedbackMessage(carouselElement);
            }
        })
        .catch(error => {
            console.error('Error loading vehicle owner feedback:', error);
            showErrorMessage(carouselElement);
        });
}

/**
 * Fetch vehicle owner feedback data from the users table via API
 * @returns {Promise<Array>} Array of feedback objects
 */
function fetchVehicleOwnerFeedbackData() {
    return new Promise((resolve, reject) => {
        // First, try to use the API to fetch reviews from users table only
        const base = window.API_BASE_URL || 'http://localhost:8080';
        fetch(`${base}/api/get-user-feedback`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Log successful data fetch
                console.log('Successfully fetched vehicle owner feedback data:', data);
                resolve(data);
            })
            .catch(error => {
                console.warn('Could not fetch vehicle owner feedback from API:', error);
                // Try the backend URL directly as fallback
                fetch(`${base}/api/get-user-feedback`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Direct API call failed too');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Successfully fetched vehicle owner feedback via direct URL');
                        resolve(data);
                    })
                    .catch(directError => {
                        console.warn('Direct API call failed:', directError);
                        
                        // Try the get-all-feedback endpoint and filter for user feedback only
                        console.log('Trying get-all-feedback as fallback');
                        fetch(`${base}/api/get-all-feedback`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('All feedback API call failed too');
                                }
                                return response.json();
                            })
                            .then(allData => {
                                // Filter to get only user feedback (not from feedback table)
                                const userFeedbackOnly = allData.filter(item => item.source === 'user');
                                console.log('Filtered user feedback from all feedback:', userFeedbackOnly);
                                resolve(userFeedbackOnly);
                            })
                            .catch(e => {
                                console.warn('All feedback API call failed too:', e);
                                // Use mock data as last resort
                                console.log('Using mock vehicle owner feedback data');
                                const mockFeedback = generateMockVehicleOwnerFeedback();
                                resolve(mockFeedback);
                            });
                    });
            });
    });
}

/**
 * Fetch registered user locations from the registration table
 * @returns {Promise<Object>} Object mapping user IDs to their registered locations
 */
function fetchRegisteredUserLocations() {
    return new Promise((resolve, reject) => {
        const base = window.API_BASE_URL || 'http://localhost:8080';
        fetch(`${base}/api/get-user-locations`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Successfully fetched user locations:', data);
                resolve(data);
            })
            .catch(error => {
                console.warn('Could not fetch user locations from API:', error);
                // Try the backend URL directly as fallback
                fetch(`${base}/api/get-user-locations`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Direct API call failed too');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Successfully fetched user locations via direct URL');
                        resolve(data);
                    })
                    .catch(directError => {
                        console.warn('Direct API call for user locations failed:', directError);
                        // Use mock data as last resort
                        console.log('Using mock user locations data');
                        const mockLocations = generateMockUserLocations();
                        resolve(mockLocations);
                    });
            });
    });
}

/**
 * Generate mock user locations for testing/fallback
 * @returns {Object} Object mapping user IDs to their registered locations
 */
function generateMockUserLocations() {
    return {
        1: "Mumbai, Maharashtra",
        2: "Ahmedabad, Gujarat",
        3: "Delhi, NCR",
        4: "Pune, Maharashtra",
        5: "Hyderabad, Telangana"
    };
}

/**
 * Enrich feedback data with user locations
 * @param {Array} feedbacks Array of feedback objects
 * @param {Object} userLocations Object mapping user IDs to their registered locations
 * @returns {Array} Array of enriched feedback objects
 */
function enrichFeedbackWithUserLocations(feedbacks, userLocations) {
    return feedbacks.map(feedback => {
        // Check if this user ID has a registered location
        if (userLocations && userLocations[feedback.userId]) {
            // Create a new object with updated address from registration
            return {
                ...feedback,
                address: userLocations[feedback.userId] // Use the registered location
            };
        }
        return feedback; // Return the original if no registered location found
    });
}

/**
 * Generate mock vehicle owner feedback data for testing/fallback
 * @returns {Array} Array of mock feedback objects
 */
function generateMockVehicleOwnerFeedback() {
    return [
        {
            id: 1,
            userId: 1,
            name: "Ramesh Kumar",
            address: "Mumbai, Maharashtra", // This would be replaced with registered location
            rating: 5,
            reviewText: "Herapheri Goods has transformed my truck business. I get regular bookings and the direct customer contact means better earnings!",
            source: "user"
        },
        {
            id: 2,
            userId: 2,
            name: "Suresh Patel",
            address: "Ahmedabad, Gujarat", // This would be replaced with registered location
            rating: 4,
            reviewText: "My mini-truck is now busy 6 days a week thanks to this platform. The registration process was so simple!",
            source: "user"
        },
        {
            id: 3,
            userId: 3,
            name: "Jayesh Singh",
            address: "Delhi", // This would be replaced with registered location
            rating: 5,
            reviewText: "As a JCB operator, finding consistent work was challenging. Herapheri Goods has connected me with multiple construction projects.",
            source: "user"
        },
        {
            id: 4,
            userId: 4,
            name: "Priya Sharma",
            address: "Pune, Maharashtra", // This would be replaced with registered location
            rating: 4,
            reviewText: "Our family-owned transport business has grown 40% since we registered here. The platform brings serious customers.",
            source: "user"
        },
        {
            id: 5,
            userId: 5,
            name: "Abdul Karim",
            address: "Hyderabad, Telangana", // This would be replaced with registered location
            rating: 5,
            reviewText: "I operate 3 trucks and registration was quick. The support team helped verify all my vehicles in just one day!",
            source: "user"
        }
    ];
}

/**
 * Populate the carousel with feedback cards
 * @param {HTMLElement} carouselElement The carousel container element
 * @param {Array} feedbacks Array of feedback objects
 */
function populateVehicleOwnerCarousel(carouselElement, feedbacks) {
    // Clear loading indicator
    carouselElement.innerHTML = '';

    // Add original cards first, clones will be added in the setup function
    feedbacks.forEach(feedback => {
        const card = createVehicleOwnerFeedbackCard(feedback);
        carouselElement.appendChild(card);
    });
}

/**
 * Create a feedback card element
 * @param {Object} feedback The feedback object
 * @returns {HTMLElement} The created card element
 */
function createVehicleOwnerFeedbackCard(feedback) {
    const card = document.createElement('div');
    card.className = 'feedback-card vehicle-owner-card';
    card.dataset.id = feedback.id;
    if (feedback.userId) {
        card.dataset.userId = feedback.userId;
    }
    
    // Add rating class to style cards differently based on rating
    if (feedback.rating <= 2) {
        card.classList.add('low-rating');
    } else if (feedback.rating === 3) {
        card.classList.add('medium-rating');
    } else {
        card.classList.add('high-rating');
    }
    
    // Create user info section
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // Create avatar with first letter of name
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = feedback.name ? feedback.name.charAt(0).toUpperCase() : 'U';
    
    // Set avatar color based on rating - matching customer feedback carousel colors
    if (feedback.rating <= 2) {
        avatar.classList.add('low-rating-avatar');
    } else if (feedback.rating === 3) {
        avatar.classList.add('medium-rating-avatar');
    } else {
        avatar.classList.add('high-rating-avatar');
    }
    
    // Create user details
    const userDetails = document.createElement('div');
    userDetails.className = 'user-details';
    
    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = feedback.name || 'Anonymous User';
    
    const userLocation = document.createElement('div');
    userLocation.className = 'user-location';
    userLocation.textContent = feedback.address || 'Unknown Location';
    
    userDetails.appendChild(userName);
    userDetails.appendChild(userLocation);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(userDetails);
    
    // Create rating stars with appropriate styling
    const rating = document.createElement('div');
    rating.className = 'rating';
    
    // Add star icons based on rating
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('i');
        star.className = i < feedback.rating ? 'fas fa-star' : 'far fa-star';
        
        // Add specific styling to stars based on rating
        if (feedback.rating <= 2) {
            star.classList.add('low-rating-star');
        } else if (feedback.rating === 3) {
            star.classList.add('medium-rating-star');
        } else {
            star.classList.add('high-rating-star');
        }
        
        rating.appendChild(star);
    }
    
    // Create review text wrapper for expansion effect
    const reviewWrapper = document.createElement('div');
    reviewWrapper.className = 'review-wrapper';
    
    // Create review text
    const reviewText = document.createElement('div');
    reviewText.className = 'review-text';
    reviewText.textContent = feedback.reviewText || '';
    
    // Add review to wrapper
    reviewWrapper.appendChild(reviewText);
    
    // Add all elements to the card
    card.appendChild(userInfo);
    card.appendChild(rating);
    card.appendChild(reviewWrapper);
    
    // Add event listeners for expand/collapse on hover
    card.addEventListener('mouseenter', function() {
        expandCard(card);
    });
    
    card.addEventListener('mouseleave', function() {
        collapseCard(card);
    });
    
    return card;
}

/**
 * Expand a card to show full review text
 * @param {HTMLElement} card The card element to expand
 */
function expandCard(card) {
    const reviewWrapper = card.querySelector('.review-wrapper');
    const reviewText = card.querySelector('.review-text');
    
    if (reviewWrapper && reviewText) {
        // Remove height restriction and gradient
        reviewText.style.maxHeight = 'none';
        reviewText.style.overflow = 'visible';
        reviewText.classList.add('expanded');
        
        // Make card wider and apply highlight effect
        card.style.zIndex = '10';
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
    }
}

/**
 * Collapse a card back to normal size
 * @param {HTMLElement} card The card element to collapse
 */
function collapseCard(card) {
    const reviewText = card.querySelector('.review-text');
    
    if (reviewText) {
        // Reset to default styles
        reviewText.style.maxHeight = '';
        reviewText.style.overflow = '';
        reviewText.classList.remove('expanded');
        
        // Reset card size
        card.style.zIndex = '';
        card.style.transform = '';
        card.style.boxShadow = '';
    }
}

/**
 * Set up truly continuous loop scrolling from left to right (opposite direction of customer carousel)
 * @param {HTMLElement} carouselElement The carousel container element
 */
function setupLeftToRightScroll(carouselElement) {
    // Variables for scroll control
    let scrollPosition = 0;
    const scrollSpeed = 0.3; // Match speed with the other carousel
    let isPaused = false;
    let animationId = null;
    
    // Get container and parent references
    const container = carouselElement.parentElement;
    const containerWidth = container.offsetWidth;
    
    // Get all original cards
    const originalCards = Array.from(carouselElement.querySelectorAll('.feedback-card'));
    if (originalCards.length === 0) return; // Safety check
    
    // Calculate card dimensions
    const cardWidth = originalCards[0].offsetWidth;
    const cardMargin = parseInt(window.getComputedStyle(originalCards[0]).marginLeft) + 
                       parseInt(window.getComputedStyle(originalCards[0]).marginRight);
    const totalCardWidth = cardWidth + cardMargin;
    
    // Clear any existing clones
    const existingClones = carouselElement.querySelectorAll('.clone');
    existingClones.forEach(clone => clone.remove());
    
    // Calculate how many cards are needed to fill the container at least 3 times
    // This ensures smooth scrolling regardless of screen size
    const minCardsNeeded = Math.ceil((containerWidth * 3) / totalCardWidth);
    const setsNeeded = Math.ceil(minCardsNeeded / originalCards.length);
    
    // Create clones and add them before the original cards
    // Adding more clones to ensure a seamless loop
    for (let i = 0; i < setsNeeded; i++) {
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.classList.add('clone');
            
            // Add event listeners to clones
            clone.addEventListener('mouseenter', () => expandCard(clone));
            clone.addEventListener('mouseleave', () => collapseCard(clone));
            
            // Add clones BEFORE the original cards 
            carouselElement.insertBefore(clone, carouselElement.firstChild);
        });
    }
    
    // Then add clones after the original cards too
    for (let i = 0; i < setsNeeded; i++) {
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.classList.add('clone');
            
            // Add event listeners to clones
            clone.addEventListener('mouseenter', () => expandCard(clone));
            clone.addEventListener('mouseleave', () => collapseCard(clone));
            
            // Add clones AFTER the original cards
            carouselElement.appendChild(clone);
        });
    }
    
    // Recalculate total width now that we've added clones
    const totalCards = carouselElement.querySelectorAll('.feedback-card').length;
    const totalWidth = totalCardWidth * totalCards;
    carouselElement.style.width = `${totalWidth}px`;
    
    // Calculate the width of one complete set of cards
    const setWidth = totalCardWidth * originalCards.length;
    
    // Position the carousel so one set of clones is initially off-screen to the right
    scrollPosition = setWidth;
    carouselElement.style.transform = `translateX(-${scrollPosition}px)`;
    
    // Create a true infinite loop effect
    function animateCarousel() {
        if (isPaused) return;
        
        // Move from right to left (negative increment means left-to-right appearance)
        scrollPosition -= scrollSpeed;
        
        // Apply the transform
        carouselElement.style.transform = `translateX(-${scrollPosition}px)`;
        
        // The true infinite loop logic:
        // When we've scrolled back enough that we need to reset
        if (scrollPosition <= 0) {
            // Jump forward by exactly one set width
            // This creates the illusion of infinite scrolling
            scrollPosition = setWidth;
            carouselElement.style.transform = `translateX(-${scrollPosition}px)`;
        }
        
        // Also check if we've somehow scrolled too far right (shouldn't happen but as a fallback)
        if (scrollPosition >= (setWidth * 2)) {
            // Jump back by exactly one set width
            scrollPosition = setWidth;
            carouselElement.style.transform = `translateX(-${scrollPosition}px)`;
        }
        
        // Continue animation
        animationId = requestAnimationFrame(animateCarousel);
    }
    
    // Start animation
    animationId = requestAnimationFrame(animateCarousel);
    
    // Pause scrolling when hovering over carousel
    carouselElement.addEventListener('mouseenter', () => {
        isPaused = true;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    });
    
    // Resume scrolling when mouse leaves
    carouselElement.addEventListener('mouseleave', () => {
        isPaused = false;
        if (!animationId) {
            animationId = requestAnimationFrame(animateCarousel);
        }
    });
    
    // Handle visibility changes (tab switching, etc.)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause when tab is not visible
            isPaused = true;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else {
            // Resume when tab becomes visible again
            isPaused = false;
            if (!animationId) {
                animationId = requestAnimationFrame(animateCarousel);
            }
        }
    });
}

/**
 * Display a message when no feedback is available
 * @param {HTMLElement} carouselElement The carousel container element
 */
function showNoFeedbackMessage(carouselElement) {
    carouselElement.innerHTML = '';
    
    const messageCard = document.createElement('div');
    messageCard.className = 'feedback-card vehicle-owner-card no-feedback';
    
    const message = document.createElement('p');
    message.textContent = 'No vehicle owner reviews yet. Register your vehicle and be the first to share your experience!';
    
    messageCard.appendChild(message);
    carouselElement.appendChild(messageCard);
}

/**
 * Display an error message when feedback cannot be loaded
 * @param {HTMLElement} carouselElement The carousel container element
 */
function showErrorMessage(carouselElement) {
    carouselElement.innerHTML = '';
    
    const errorCard = document.createElement('div');
    errorCard.className = 'feedback-card vehicle-owner-card error';
    
    const message = document.createElement('p');
    message.textContent = 'Sorry, we couldn\'t load the vehicle owner reviews at this time. Please try again later.';
    
    errorCard.appendChild(message);
    carouselElement.appendChild(errorCard);
} 