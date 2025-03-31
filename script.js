document.addEventListener('DOMContentLoaded', function() {
    const moodForm = document.querySelector('.mood-form');
    const responseContainer = document.getElementById('response-container');
    const djResponse = document.getElementById('dj-response');
    const submitBtn = document.getElementById('submit-btn');
    const newPlaylistBtn = document.getElementById('new-playlist-btn');
    const loader = document.getElementById('loader');

    // Submit form event
    submitBtn.addEventListener('click', function() {
        // Get form values
        const timeOfDay = document.getElementById('time_of_day').value;
        const highlight = document.getElementById('highlight').value;
        const romanticMood = document.getElementById('romantic_mood').value;
        const presentMoment = document.getElementById('present_moment').value;
        const currentActivity = document.getElementById('current_activity').value;
        const favoriteArtist = document.getElementById('favorite_artist').value;
        const specificGenre = document.getElementById('specific_genre').value;

        // Check if at least some fields are filled
        if (!timeOfDay && !highlight && !presentMoment && !favoriteArtist) {
            alert('Please fill at least some details about your day or mood to get better recommendations!');
            return;
        }

        // Show loader and response container
        moodForm.classList.add('hidden');
        responseContainer.classList.remove('hidden');
        loader.style.display = 'flex';
        djResponse.innerHTML = '';

        // Prepare data for sending to the server
        const data = {
            time_of_day: timeOfDay,
            highlight: highlight,
            romantic_mood: romanticMood,
            present_moment: presentMoment,
            current_activity: currentActivity,
            favorite_artist: favoriteArtist,
            specific_genre: specificGenre
        };

        // Send request to the server
        fetch('/get_playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            // Hide loader
            loader.style.display = 'none';
            
            // Process and display response with fancy formatting
            const formattedResponse = formatDJResponse(data.response);
            djResponse.innerHTML = formattedResponse;

            // Add animation to the response
            animateText(djResponse);
        })
        .catch(error => {
            console.error('Error:', error);
            loader.style.display = 'none';
            djResponse.innerHTML = "Oops! Looks like our DJ dropped the beat. Please try again later!";
        });
    });

    // Format DJ response to highlight songs
    function formatDJResponse(text) {
        // Replace numbered songs with emoji and styling
        let formattedText = text.replace(/(\d+\.\s*)([\w\s'"-]+)(by|feat\.|\-|\–)([^,:.!?\n]+)/gi, 
            '<div class="song-item">🎵 <strong>$2</strong>$3<em>$4</em></div>'
        );
        
        // Add extra formatting for "playlist" heading if it exists
        formattedText = formattedText.replace(/(playlist|tracklist|tracks|songs):/i, 
            '<div class="playlist-heading">$1:</div>'
        );
        
        return formattedText;
    }

    // Text reveal animation
    function animateText(element) {
        const text = element.innerHTML;
        element.innerHTML = '';
        let i = 0;
        
        function typeWriter() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeWriter, 10);
            }
        }
        
        typeWriter();
    }

    // New playlist button event
    newPlaylistBtn.addEventListener('click', function() {
        responseContainer.classList.add('hidden');
        moodForm.classList.remove('hidden');
    });

    // Add some dynamic styling
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('active');
        });
        
        input.addEventListener('blur', function() {
            if (this.value === '') {
                this.parentElement.classList.remove('active');
            }
        });
    });

    // Add some extra styles dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .song-item {
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .song-item:hover {
            background: rgba(255,255,255,0.1);
            transform: translateX(5px);
        }
        
        .playlist-heading {
            font-size: 1.2rem;
            color: var(--primary-color);
            margin: 15px 0;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .form-group.active label {
            color: var(--secondary-color);
        }
    `;
    document.head.appendChild(style);
});
// Format DJ response to highlight songs - Improved version
function formatDJResponse(text) {
    // First, split the response by lines to better handle different formatting
    let lines = text.split('\n');
    let formattedLines = [];

    // Process each line
    for (let line of lines) {
        // Match song patterns with better regex
        // This matches various formats like "1. Song Name - Artist", "1) Song Name by Artist", etc.
        let songRegex = /(\d+[\.\)\s]+)([^-\–\—\by]+)([-\–\—\s]+|by\s+|feat\.\s+)([^,:.!?\n]+)/i;

        if (songRegex.test(line)) {
            line = line.replace(songRegex,
                '<div class="song-item">🎵 <strong>$2</strong>$3<em>$4</em></div>'
            );
        }

        // Handle playlist headings
        if (/\b(playlist|tracklist|tracks|songs|recommendations|vibes)[:!\s]/i.test(line)) {
            line = line.replace(/\b(playlist|tracklist|tracks|songs|recommendations|vibes)[:!\s]/i,
                '<div class="playlist-heading">$1:</div>'
            );
        }

        // Handle DJ intros/outros with some style
        if (/\b(yo|hey|sup|wassup|hello|hi|check|listen|enjoy|vibe)/i.test(line) &&
            line.length < 150 &&
            !songRegex.test(line)) {
            line = '<div class="dj-message">' + line + '</div>';
        }

        formattedLines.push(line);
    }

    return formattedLines.join('\n');
}
