from flask import Flask, jsonify, request
from flask_cors import CORS

import requests
import base64
import eyed3
import os
from tempfile import NamedTemporaryFile
import redis
from dotenv import load_dotenv
import json


app = Flask(__name__)
CORS(app)

DEFAULT_CHUNK_SIZE = 131072  # 128KB

class InvalidFileError(Exception):
    pass

load_dotenv()
REDIS_HOST = os.environ.get("REDIS_HOST")
REDIS_PORT = os.environ.get("REDIS_PORT")
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD")
ENABLE_CACHE = os.environ.get("ENABLE_CACHE") == "True"
CACHE_PLAYLISTS= os.environ.get("CACHE_PLAYLISTS") == "True"


class RedisCache:
    def __init__(self, host, port, password):
        self.host = host
        self.port = port
        self.password = password
        print(f"[INFO] Connecting to Redis at {self.host}:{self.port}")
        self.cache = redis.Redis(
            host=self.host,
            port=self.port,
            password=self.password,
            ssl=True
        )
        print("[INFO] Connected to Redis")
    
    def get_data(self, key):
        print(f"[INFO] Fetching data from Redis for key {key}")
        return self.cache.get(key)

    def set_data(self, key, value):
        self.cache.set(key, value)
    
    def check_exists(self, key):
        return self.cache.exists(key)

def validate_image_mime(image_data: bytes, expected_mime: str) -> bool:
    """
    Validate that the bytes provided are a valid jpeg image
    """
    result = False
    match expected_mime:
        case "image/jpeg":
            if image_data[0:2] == b'\xff\xd8' and image_data[-2:] == b'\xff\xd9':
                result = True
        case "image/png":
            if image_data[0:8] == b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' and image_data[-8:] == b'\x49\x45\x4e\x44\xae\x42\x60\x82':
                result = True
    return result

def get_mp3_id3v2_tags(url: str, chunk_size=DEFAULT_CHUNK_SIZE) -> bool:
    """
    Check if the remote mp3 file if ID3v2
    """
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        print("Error downloading the file")
        raise InvalidFileError("Error downloading the file. Remote server responded with status code " + str(response.status_code))
    verified_is_ID3_V2 = False
    with NamedTemporaryFile(delete=False) as temp_file:
        bytes_written = 0
        for chunk in response.iter_content(chunk_size=chunk_size):
            temp_file.write(chunk)
            temp_file.flush()
            bytes_written += len(chunk)
            # Check that the file starts with 'ID3' meaning its ID3v2
            if not verified_is_ID3_V2:
                with open(temp_file.name, 'rb') as f:
                    if f.read(3) == b'ID3':
                        verified_is_ID3_V2 = True
                    else:
                        raise InvalidFileError("[ERROR] The file was not recognized as ID3v2")
            audio_file = eyed3.load(temp_file.name)
            if audio_file is not None and audio_file.tag is not None:
                print(f"[INFO] ID3 tag found for file: {url}")
                if audio_file.tag.images:
                    if validate_image_mime(audio_file.tag.images[0].image_data, audio_file.tag.images[0].mime_type):
                        print("[INFO] Image data found and validated")
                        break
                    else:
                        print("[INFO] Image data found but failed validation. Continuing to download the file")
                else:
                    print("[INFO] No image data found. ID3 tag successful breaking out of loop")
                    break
            print(f"[INFO] Chunk {bytes_written} bytes written to disk but failed to find ID3 tag")

    if audio_file is None:
        raise InvalidFileError("[ERROR] The file was not recognized as ID3v2")
    tag_data = {
        "album": str(audio_file.tag.album),
        "artist": str(audio_file.tag.artist),
        "title": str(audio_file.tag.title),
        "year": str(audio_file.tag.getBestDate()),
        "url": url
    }
    if audio_file.tag.images:
        image_data = audio_file.tag.images[0].image_data
        base64_image = base64.b64encode(image_data).decode('utf-8')
        tag_data["album_art"] = base64_image
    else:
        tag_data["album_art"] = None
    return tag_data
        

@app.route('/api/get_playlist_data')
def get_playlist_data():
    url = request.args.get('url')
    if url is None:
        print("No url provided")
        return 404
    try:
        if ENABLE_CACHE:
            redis = RedisCache(REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
        if ENABLE_CACHE and redis.check_exists(url):
            print("[Info] Cache Hit! Returning cached data")
            response_data = json.loads(redis.get_data(url))
            return jsonify(response_data)
        print("[Info] Cache Miss! Fetching data from remote server")
        response = requests.get(url)
        if response.status_code != 200:
            return jsonify({"error": "Error downloading the file. Remote server responded with status code " + str(response.status_code)})
        playlist_data = []
        for line in response.text.splitlines():
            if line.startswith('#'):
                continue
            if ENABLE_CACHE and redis.check_exists(line):
                print(f"[Info] Cache Hit for individual song {line}! Returning cached data")
                playlist_data.append(json.loads(redis.get_data(line)))
                continue
            playlist_data.append(get_mp3_id3v2_tags(line))
            if ENABLE_CACHE:
                print(f"[Info] Cache Miss for individual song {line}! Setting cache data")
                redis.set_data(line, json.dumps(playlist_data[-1]))
        if ENABLE_CACHE and CACHE_PLAYLISTS:
            print("[INFO] Setting playlist cache data in Redis")
            redis.set_data(url, json.dumps(playlist_data))  # Convert Python object to JSON string
        return jsonify(playlist_data)
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)




