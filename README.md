# Wheather

A responsive weather app built with plain HTML, CSS, and JavaScript. It uses Visual Crossing to show current conditions, wind, rain chance, and hourly weather for the previous or next 24 hours.

## Run locally

1. Copy `config.example.js` to `config.js`.
2. Add your Visual Crossing API key to `config.js`:

   ```js
   const WEATHER_API_KEY = 'YOUR_VISUAL_CROSSING_API_KEY';
   ```

3. Serve this folder with a local web server, then open `index.html` in your browser. For example, run `python3 -m http.server 8000` from this folder and visit `http://localhost:8000`.

`config.js` is ignored by Git so the API key is not included in commits. Browser apps expose API keys to visitors; for a public deployment, proxy weather requests through a server and restrict the key in your Visual Crossing account.
