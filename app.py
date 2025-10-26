from flask import Flask, render_template, request, jsonify, redirect, session, url_for
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Required for sessions

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    api_key = "*YOUR GEMINI API KEY*"  # Use the key from your code if not in .env
    logger.warning("Using hardcoded API key. Consider using a .env file for security.")

genai.configure(api_key=api_key)

# Spotify Configuration
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = "https://synth-ai.onrender.com/callback"
SPOTIFY_SCOPE = "user-read-private user-read-email streaming user-modify-playback-state"


# 19doocf7lx4fkjjeiy4sop84n

def create_spotify_oauth():
    return SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=SPOTIFY_SCOPE
    )


def get_gemini_response(user_data):
    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Create the chat session with clearer formatting instructions
        chat = model.start_chat(history=[
            {
                "role": "user",
                "parts": [
                    """You have to act like a DJ and respond to the query like one. You can use Gen Z slang. 
                    You need to suggest a playlist of 7-8 Bollywood songs according to the user's query, 
                    keeping in mind their mood and day. If they mention favorite artists, reserve most songs for those artists.

                    VERY IMPORTANT: Format each song EXACTLY like this:

                    1. Song Name | Artist Name | Why did you suggest this song
                    2. Song Name | Artist Name | Why did you suggest this song

                    Use this exact format with the pipe symbol (|) between song name and artist. 
                    This specific format is required for Spotify integration to work properly.
                    Don't use dashes or other separators between song name and artist."""
                ]
            },
            {
                "role": "model",
                "parts": [
                    "Yo, I'm your DJ assistant ready to drop some sick Bollywood beats! Just tell me your vibe and I'll curate a fire playlist for you. I'll make sure to format each song exactly as: 'Song Name | Artist Name' so you can vibe to them on Spotify! Let's get this party started!"]
            }
        ])

        # Prepare user information as a string
        user_input = " ".join([f"{key}: {value}" for key, value in user_data.items() if value])

        # Send the user's input to the chat and get a response
        response = chat.send_message(user_input)

        # Return the response content
        return response.text

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return "Sorry, I couldn't generate a playlist right now. Please try again later."


def extract_songs_from_response(response):
    songs = []
    logger.info(f"Raw AI response to extract from: {response}")

    # Remove HTML tags from the response
    response = re.sub(r'<[^>]+>', '', response)

    # Primary pattern: "Song Name | Artist Name" format
    pattern = r'([^|\n]+)\s*\|\s*([^|\n]+)'
    matches = re.finditer(pattern, response)

    for match in matches:
        try:
            song_name = match.group(1).strip()
            artist_name = match.group(2).strip()

            # Clean up song name - remove numbers, special characters
            song_name = re.sub(r'^\d+[\.\)]\s*', '', song_name)
            song_name = re.sub(r'[\"\'\(\)]', '', song_name).strip()

            # Clean up artist name
            artist_name = re.sub(r'[\"\'\(\)]', '', artist_name).strip()

            # Skip if either song name or artist is empty
            if song_name and artist_name:
                logger.info(f"Extracted song: '{song_name}' by '{artist_name}'")
                songs.append({
                    'name': song_name,
                    'artist': artist_name
                })
        except Exception as e:
            logger.error(f"Error processing song match: {e}")
            continue

    # Fallback pattern: Look for numbered list items with likely song formats
    if not songs:
        logger.info("Primary pattern failed, trying fallback extraction")
        lines = response.split('\n')
        for line in lines:
            # Try to find patterns like "1. Song Name - Artist Name" or similar
            numbered_pattern = r'^\d+[\.\)]\s+(.+?)(?:\s+-\s+|\s+by\s+)(.+)$'
            match = re.search(numbered_pattern, line)
            if match:
                song_name = match.group(1).strip()
                artist_name = match.group(2).strip()

                # Clean up names
                song_name = re.sub(r'[\"\'\(\)]', '', song_name).strip()
                artist_name = re.sub(r'[\"\'\(\)]', '', artist_name).strip()

                if song_name and artist_name:
                    logger.info(f"Extracted with fallback: '{song_name}' by '{artist_name}'")
                    songs.append({
                        'name': song_name,
                        'artist': artist_name
                    })

    logger.info(f"Total songs extracted: {len(songs)}")
    return songs


def search_spotify_tracks(sp, songs):
    track_results = []
    for song in songs:
        # Try exact search first
        query = f"track:\"{song['name']}\" artist:\"{song['artist']}\""
        try:
            logger.info(f"Searching Spotify with query: {query}")
            result = sp.search(q=query, type='track', limit=1)

            if result['tracks']['items']:
                track = result['tracks']['items'][0]
                track_data = {
                    'id': track['id'],
                    'name': track['name'],
                    'artist': track['artists'][0]['name'],
                    'album': track['album']['name'],
                    'image': track['album']['images'][0]['url'] if track['album']['images'] else None,
                    'preview_url': track['preview_url'],
                    'external_url': track['external_urls']['spotify']
                }
                track_results.append(track_data)
                logger.info(f"Found track: {track_data['name']} by {track_data['artist']}")
            else:
                # Try a more flexible search if exact search fails
                logger.info("Exact search failed, trying flexible search")
                # Try with just song name (useful for covers, remixes, etc.)
                result = sp.search(q=song['name'], type='track', limit=3)
                if result['tracks']['items']:
                    for track in result['tracks']['items']:
                        # Check if artist name is somewhat similar
                        artist_name = track['artists'][0]['name'].lower()
                        if (song['artist'].lower() in artist_name or
                                artist_name in song['artist'].lower() or
                                # Calculate similarity (basic implementation)
                                len(set(artist_name.split()) & set(song['artist'].lower().split())) > 0):
                            track_data = {
                                'id': track['id'],
                                'name': track['name'],
                                'artist': track['artists'][0]['name'],
                                'album': track['album']['name'],
                                'image': track['album']['images'][0]['url'] if track['album']['images'] else None,
                                'preview_url': track['preview_url'],
                                'external_url': track['external_urls']['spotify']
                            }
                            track_results.append(track_data)
                            logger.info(f"Found with flexible search: {track_data['name']} by {track_data['artist']}")
                            break
        except Exception as e:
            logger.error(f"Error searching Spotify: {e}")

    logger.info(f"Total tracks found: {len(track_results)}")
    return track_results

def get_spotify_client():
    """Get an authenticated Spotify client if user is logged in"""
    if 'token_info' not in session:
        return None

    token_info = session['token_info']

    if create_spotify_oauth().is_token_expired(token_info):
        try:
            token_info = create_spotify_oauth().refresh_access_token(token_info['refresh_token'])
            session['token_info'] = token_info
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    return spotipy.Spotify(auth=token_info['access_token'])
@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/synth')
def synth():
    return render_template('index.html', spotify_auth_url=create_spotify_oauth().get_authorize_url())


@app.route('/callback')
def callback():
    sp_oauth = create_spotify_oauth()
    session.clear()
    code = request.args.get('code')
    token_info = sp_oauth.get_access_token(code)
    session["token_info"] = token_info
    return redirect('/')


@app.route('/token_info', methods=['GET'])
def get_token_info():
    if 'token_info' in session:
        # Share token status with frontend for login button state
        return jsonify({"is_connected": True})
    else:
        return jsonify({"is_connected": False})


@app.route('/client_token', methods=['GET'])
def client_token():
    """Endpoint to provide client-side with token confirmation"""
    if 'token_info' in session:
        return jsonify({"has_token": True})
    else:
        return jsonify({"has_token": False})


@app.route('/get_playlist', methods=['POST'])
def get_playlist():
    try:
        logger.info("get_playlist route called")
        data = request.json
        logger.info(f"Received data: {data}")

        # Generate response from Gemini AI
        logger.info("Calling Gemini AI for response")
        gemini_response = get_gemini_response(data)
        logger.info(f"Gemini response received: {gemini_response[:100]}...")  # Log first 100 chars

        # Extract songs
        logger.info("Extracting songs from response")
        songs = extract_songs_from_response(gemini_response)
        logger.info(f"Extracted songs: {songs}")

        # Check Spotify connection
        is_spotify_connected = 'token_info' in session
        logger.info(f"Is Spotify connected: {is_spotify_connected}")

        # Initialize spotify_tracks as an empty list
        spotify_tracks = []

        # Search for tracks on Spotify if user is connected
        if is_spotify_connected and songs:
            logger.info("Getting Spotify client")
            sp = get_spotify_client()

            if sp:
                logger.info("Searching for tracks on Spotify")
                spotify_tracks = search_spotify_tracks(sp, songs)
                logger.info(f"Found {len(spotify_tracks)} tracks on Spotify")
            else:
                logger.warning("Failed to get Spotify client despite token being present")

        # Return the response, tracks, and connection status
        return jsonify({
            "response": gemini_response,
            "spotify_tracks": spotify_tracks,
            "is_spotify_connected": is_spotify_connected
        })

    except Exception as e:
        logger.error(f"Error in get_playlist: {e}", exc_info=True)  # Include stack trace
        return jsonify({
            "response": f"Sorry, something went wrong: {str(e)}",
            "spotify_tracks": [],
            "is_spotify_connected": False
        })


@app.route('/refresh_token')
def refresh_token():
    if 'token_info' not in session:
        return redirect(create_spotify_oauth().get_authorize_url())

    token_info = session['token_info']
    sp_oauth = create_spotify_oauth()

    # Check if token needs refreshing
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session['token_info'] = token_info

    return jsonify({"success": True})


if __name__ == '__main__':
    # For production, you should use a proper WSGI server
    app.run(debug=False, host='0.0.0.0', port=int(os.getenv("PORT", 5000)))

