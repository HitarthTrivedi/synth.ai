// First check if user is connected to Spotify
fetch('/token_info')
    .then(response => response.json())
    .then(data => {
        const isSpotifyConnected = data.is_connected;

        // Store Spotify connection status in a variable accessible to the rest of the script
        window.isSpotifyConnected = isSpotifyConnected;

        // Update Spotify button based on connection status
        updateSpotifyButton(isSpotifyConnected);

        // Initialize the app
        initializeApp();
    })
    .catch(error => {
        console.error('Error checking Spotify connection:', error);
        // Initialize app anyway, but mark as not connected
        window.isSpotifyConnected = false;
        updateSpotifyButton(false);
        initializeApp();
    });

function updateSpotifyButton(isConnected) {
    const spotifyButton = document.querySelector('.spotify-button');
    const spotifyAuthUrl = spotifyButton.getAttribute('href') || spotifyButton.getAttribute('data-auth-url');

    if (isConnected) {
        spotifyButton.innerHTML = '<i class="fab fa-spotify"></i> Connected to Spotify';
        spotifyButton.classList.add('spotify-connected');
        spotifyButton.style.cursor = 'default';
        spotifyButton.style.pointerEvents = 'none';
        spotifyButton.removeAttribute('href');
    } else {
        spotifyButton.innerHTML = '<i class="fab fa-spotify"></i> Connect to Spotify';
        spotifyButton.classList.remove('spotify-connected');
        spotifyButton.style.cursor = 'pointer';
        spotifyButton.style.pointerEvents = 'auto';
        if (spotifyAuthUrl && spotifyAuthUrl !== 'None') {
            spotifyButton.setAttribute('href', spotifyAuthUrl);
        }
    }
}

function initializeApp() {
    const moodForm = document.querySelector('.mood-form');
    const responseContainer = document.getElementById('response-container');
    const djResponse = document.getElementById('dj-response');
    const submitBtn = document.getElementById('submit-btn');
    const newPlaylistBtn = document.getElementById('new-playlist-btn');
    const loader = document.getElementById('loader');
    const spotifyTracksContainer = document.getElementById('spotify-tracks-container');
    const spotifyTracksList = document.getElementById('spotify-tracks-list');

    // Check if elements exist before proceeding
    if (!moodForm || !responseContainer || !djResponse || !submitBtn || !newPlaylistBtn) {
        console.error('Required elements not found');
        return;
    }

    // Check Spotify token on page load
    refreshSpotifyToken();

    // Submit form event
    submitBtn.addEventListener('click', function() {
        // Check if at least some fields are filled
        const timeOfDay = document.getElementById('time_of_day').value;
        const highlight = document.getElementById('highlight').value;
        const romanticMood = document.getElementById('romantic_mood').value;
        const presentMoment = document.getElementById('present_moment').value;
        const currentActivity = document.getElementById('current_activity').value;
        const favoriteArtist = document.getElementById('favorite_artist').value;
        const specificGenre = document.getElementById('specific_genre').value;

        if (!timeOfDay && !highlight && !presentMoment && !favoriteArtist) {
            alert('Please fill at least some details about your day or mood to get better recommendations!');
            return;
        }

        // Show loader and response container
        moodForm.classList.add('hidden');
        responseContainer.classList.remove('hidden');
        loader.style.display = 'flex';
        djResponse.innerHTML = '';
        spotifyTracksList.innerHTML = '';
        spotifyTracksContainer.classList.add('hidden');

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

            // Process and display DJ response
            const formattedResponse = formatDJResponse(data.response);
            djResponse.innerHTML = formattedResponse;

            // Handle Spotify tracks
            if (data.is_spotify_connected && data.spotify_tracks && data.spotify_tracks.length > 0) {
                spotifyTracksContainer.classList.remove('hidden');
                spotifyNotConnected.classList.add('hidden');

                // Display Spotify tracks
                displaySpotifyTracks(data.spotify_tracks);
            } else if (data.spotify_tracks && data.spotify_tracks.length > 0) {
                // User has tracks but isn't connected
                spotifyTracksContainer.classList.remove('hidden');
                spotifyNotConnected.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loader.style.display = 'none';
            djResponse.innerHTML = "Oops! Looks like our DJ dropped the beat. Please try again later!";
        });
    });

    // Format DJ response to make it readable
    function formatDJResponse(text) {
        // Replace newlines with <br> tags for proper line breaks
        let formatted = text.replace(/\n/g, '<br>');

        // Highlight song entries with the pipe format: Song Name | Artist Name
        formatted = formatted.replace(/(\d+[\.\)]\s*)([^|<]+)\|([^<]+?)(<br>|$)/g,
            '<div style="margin: 10px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 8px;">🎵 <strong>$2</strong> by <em>$3</em></div>');

        return formatted;
    }

    // Display Spotify tracks
    function displaySpotifyTracks(tracks) {
        spotifyTracksList.innerHTML = '';

        // Get the default image URL from a data attribute or use a hardcoded fallback
        const defaultAlbumImage = '/static/images/default-album.png';

        tracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'spotify-track';

            trackElement.innerHTML = `
                <div class="spotify-track-image">
                    <img src="${track.image || defaultAlbumImage}" alt="${track.name}">
                </div>
                <div class="spotify-track-info">
                    <h4>${track.name}</h4>
                    <p>${track.artist}</p>
                </div>
                <div class="spotify-track-actions">
                    <button class="play-track" data-track-id="${track.id}" data-track-name="${track.name}"
                            data-track-artist="${track.artist}" data-track-album="${track.album}"
                            data-track-image="${track.image}" data-track-url="${track.external_url}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;

            spotifyTracksList.appendChild(trackElement);
        });

        // Add event listeners to play buttons
        document.querySelectorAll('.play-track').forEach(button => {
            button.addEventListener('click', function() {
                const trackId = this.getAttribute('data-track-id');
                const trackNameValue = this.getAttribute('data-track-name');
                const trackArtistValue = this.getAttribute('data-track-artist');
                const trackAlbumValue = this.getAttribute('data-track-album');
                const trackImageValue = this.getAttribute('data-track-image');
                const trackUrl = this.getAttribute('data-track-url');

                openPlayerModal(trackId, trackNameValue, trackArtistValue, trackAlbumValue, trackImageValue, trackUrl);
            });
        });
    }

    // Open player modal
    function openPlayerModal(trackId, trackNameValue, trackArtistValue, trackAlbumValue, trackImageValue, trackUrl) {
        // Set track information
        trackName.textContent = trackNameValue;
        trackArtist.textContent = trackArtistValue;
        trackAlbum.textContent = trackAlbumValue;
        trackImage.src = trackImageValue || '/static/images/default-album.png';
        openInSpotify.href = trackUrl;

        // Set Spotify embed
        spotifyEmbed.innerHTML = `
            <iframe src="https://open.spotify.com/embed/track/${trackId}"
                    width="100%" height="80" frameborder="0" allowtransparency="true"
                    allow="encrypted-media"></iframe>
        `;

        // Show modal
        playerModal.classList.remove('hidden');
    }

    // Close player modal
    closePlayer.addEventListener('click', function() {
        playerModal.classList.add('hidden');
        spotifyEmbed.innerHTML = ''; // Stop playback
    });

    // New playlist button event
    newPlaylistBtn.addEventListener('click', function() {
        responseContainer.classList.add('hidden');
        moodForm.classList.remove('hidden');
    });

    // Refresh Spotify token
    function refreshSpotifyToken() {
        fetch('/refresh_token')
            .then(response => response.json())
            .catch(error => console.error('Error refreshing token:', error));
    }

    // Add dynamic styling
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

    // Click outside the modal to close it
    window.addEventListener('click', function(event) {
        if (event.target === playerModal) {
            playerModal.classList.add('hidden');
            spotifyEmbed.innerHTML = ''; // Stop playback
        }
    });
}
