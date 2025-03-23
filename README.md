# SYNTH.AI 🎵

A personalized Bollywood music recommendation web application that curates playlists based on your mood, preferences, and current state of mind.



## ✨ Features

- **Mood-Based Recommendations**: Get song suggestions tailored to how your day is going
- **Personalized Experience**: Takes into account your favorite artists, genres, and current activities
- **Bollywood Focus**: Specialized in Indian music across different eras and styles
- **Interactive UI**: Sleek, responsive design with dynamic animations
- **AI-Powered**: Leverages Google's Gemini 1.5 Pro model for intelligent recommendations

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Python, Flask
- **AI Integration**: Google Generative AI (Gemini 1.5 Pro)
- **Styling**: Custom CSS with gradients and animations

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/synth-ai.git
   cd synth-ai
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the project root with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

## 📁 Project Structure

```
synth-ai/
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── templates/
│   └── index.html
├── app.py
├── requirements.txt
├── .env
└── README.md
```



## 📝 How It Works

1. Users input details about their day, current mood, and music preferences
2. The application sends this information to the Flask backend
3. Gemini AI processes the input and generates a personalized playlist
4. The playlist is returned and displayed with animated formatting

## 🔮 Future Enhancements

- Integration with Spotify/YouTube APIs for direct playback
- User accounts to save favorite playlists
- Expanded genre coverage beyond Bollywood
- Mobile application version



## 🙏 Acknowledgements

- Google Generative AI for the Gemini model
- The Flask community for the excellent web framework
- All Bollywood artists whose music makes this project meaningful

## 📧 Contact

For any questions or feedback, feel free to reach out:
- Email: [hitartht318@gmail.com]


---

Created with ❤️ by Hitarth Trivedi(ALPHA.KORE)
