function openTab(tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Load external content if needed
    if(tabName === 'help' && !document.getElementById('help').innerHTML) {
        fetch('/help.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('help').innerHTML = data;
            });
    }
    
    if(tabName === 'team' && !document.getElementById('team').innerHTML) {
        fetch('/team.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('team').innerHTML = data;
            });
    }
    
    // Add active class to clicked tab
    event.currentTarget.classList.add('active');
}

// Initialize live stats
function updateLiveStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('player-count').textContent = data.players;
            document.getElementById('game-count').textContent = data.games;
        });
}

// Update stats every 30 seconds
setInterval(updateLiveStats, 30000);
updateLiveStats();

function initMobileMenu() {
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-button';
    menuButton.innerHTML = '☰';
    
    const nav = document.querySelector('.nav-links');
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.classList.toggle('active');
    });
    
    document.querySelector('.nav-content').appendChild(menuButton);
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !menuButton.contains(e.target)) {
            nav.classList.remove('active');
        }
    });
    
    // Close menu on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            nav.classList.remove('active');
        }
    });
}

// Function to create and show the player details modal
function showPlayerDetailsModal(callback) {
    // Check if modal already exists
    if (document.getElementById('playerDetailsModal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'playerDetailsModal';
    modalOverlay.className = 'modal-overlay';

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2>Player Details</h2>
            <p>Please enter your details to proceed to multiplayer.</p>
            <form id="modalDetailsForm">
                <div class="form-group">
                    <label for="modalPlayerName">Name:</label>
                    <input type="text" id="modalPlayerName" name="playerName" required>
                </div>
                <div class="form-group">
                    <label for="modalPlayerAge">Age:</label>
                    <input type="number" id="modalPlayerAge" name="playerAge" required min="1">
                </div>
                <div class="form-group">
                    <label for="modalPlayerDOB">Date of Birth:</label>
                    <input type="date" id="modalPlayerDOB" name="playerDOB" required>
                </div>
                <button type="submit" class="modern-btn primary">Submit & Play</button>
                 <p id="modalFormError" class="form-error-message"></p> <!-- Changed style="display: none;" to rely on CSS/class -->
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // Add event listeners after appending
    const form = modalOverlay.querySelector('#modalDetailsForm');
    const errorMsg = modalOverlay.querySelector('#modalFormError');
    const closeButton = modalOverlay.querySelector('.modal-close-btn');

    // Function to close modal
    const closeModal = () => {
        modalOverlay.classList.remove('visible');
        // Remove modal from DOM after transition
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300); // Match CSS transition duration
    };

    closeButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => {
        // Close if clicked outside the modal content
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMsg.textContent = ''; // Clear previous errors

        const name = document.getElementById('modalPlayerName').value.trim();
        const age = document.getElementById('modalPlayerAge').value;
        const dob = document.getElementById('modalPlayerDOB').value;

        // Basic validation (same as before)
        if (!name || !age || !dob) {
            errorMsg.textContent = 'All fields are required.';
            return;
        }
        if (parseInt(age) <= 0) {
             errorMsg.textContent = 'Age must be a positive number.';
             return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
             errorMsg.textContent = 'Please enter a valid Date of Birth.';
             return;
        }

        const playerDetails = {
            name: name,
            age: parseInt(age),
            dob: dob,
            submittedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem('playerDetails', JSON.stringify(playerDetails));
            console.log('Player details saved via modal:', playerDetails);
            closeModal();
            callback(); // Execute the callback (navigate to multiplayer)
        } catch (e) {
            console.error('Error saving player details to localStorage:', e);
            errorMsg.textContent = 'Could not save details. Ensure localStorage is enabled.';
        }
    });

    // Make modal visible with transition
    // Use setTimeout to allow the element to be added to the DOM first
    setTimeout(() => {
         modalOverlay.classList.add('visible');
    }, 10); // Small delay
}

// Function called by the Multiplayer button
function checkDetailsAndGoMultiplayer() {
    const storedDetails = localStorage.getItem('playerDetails');
    let detailsValid = false;
    if (storedDetails) {
        try {
            const details = JSON.parse(storedDetails);
            if (details && details.name && details.age && details.dob) {
                detailsValid = true;
            }
        } catch (e) {
             console.error('Error parsing stored player details:', e);
             localStorage.removeItem('playerDetails'); // Clear invalid data
        }
    }

    if (detailsValid) {
        console.log('Details found, navigating to multiplayer...');
        window.location.href = 'multiplayer.html';
    } else {
        console.log('No valid details found, showing modal...');
        showPlayerDetailsModal(() => {
            // This callback runs after details are successfully submitted in the modal
            window.location.href = 'multiplayer.html';
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    // handlePlayerDetails(); // REMOVED call to old handler

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}); 