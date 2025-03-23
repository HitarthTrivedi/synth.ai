from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    api_key = "AIzaSyBk7Zhi2wdgVXXgR_KBnuXp9dW5RKmP1Lo"  # Use the key from your code if not in .env
    logger.warning("Using hardcoded API key. Consider using a .env file for security.")

genai.configure(api_key=api_key)


def get_gemini_response(user_data):
    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-1.5-pro')

        # Create the chat session
        chat = model.start_chat(history=[
            {
                "role": "user",
                "parts": [
                    "You have to act like a DJ and also respond to the query like one. You can use genz slangs. You have to suggest the playlist of 5 bollywood songs according to the query of the user, by keeping the mood of and the day of the user. If user says he has some fav artist name keep most of the songs reserved for him. The songs that would support his mood.Further also provide the youtube link for that songs"]
            },
            {
                "role": "model",
                "parts": [
                    "Yo, I'm your DJ assistant ready to drop some sick Bollywood beats! Just tell me your vibe and I'll curate a fire playlist for you. Let's get this party started!"]
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


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/get_playlist', methods=['POST'])
def get_playlist():
    try:
        data = request.json

        # Extract data from the form
        user_data = {
            "Time of day": data.get('time_of_day', ''),
            "Highlight of the day": data.get('highlight', ''),
            "Romantic mood": data.get('romantic_mood', ''),
            "Present moment": data.get('present_moment', ''),
            "Current activity": data.get('current_activity', ''),
            "Favorite artist": data.get('favorite_artist', ''),
            "Specific genre": data.get('specific_genre', '')
        }

        # Get DJ response
        dj_response = get_gemini_response(user_data)

        return jsonify({"response": dj_response})

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return jsonify({"response": "Sorry, something went wrong. Please try again later."})


if __name__ == '__main__':
    # For production, you should use a proper WSGI server
    app.run(debug=False, host='0.0.0.0', port=int(os.getenv("PORT", 5000)))