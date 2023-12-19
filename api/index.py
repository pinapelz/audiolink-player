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
import mutagen.flac
from enum import Enum

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


class TagType(Enum):
    ID3 = 1
    VORBIS = 2
    NONE = 99



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
    if expected_mime == "image/jpeg":
        if image_data[0:2] == b'\xff\xd8' and image_data[-2:] == b'\xff\xd9':
            result = True
    elif expected_mime == "image/png":
        if image_data[0:8] == b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' and image_data[-8:] == b'\x49\x45\x4e\x44\xae\x42\x60\x82':
            result = True
    return result


def get_id3_tag(filepath: str):
    audio_file = eyed3.load(filepath)
    if audio_file.tag is None or audio_file.tag is None:
        return None
    image_data = None
    if audio_file.tag.images:
        if validate_image_mime(audio_file.tag.images[0].image_data, audio_file.tag.images[0].mime_type):
            print("[INFO] Image data found and validated")
        else:
            print("[INFO] Image data found but failed validation. Continuing to download the file")
            return None
    else:
        print("[INFO] No image data found. Tags successful breaking out of loop")
    if audio_file is None:
        raise InvalidFileError("[ERROR] The file was not recognized as a supported audio file")
    tag_data = {
        "album": str(audio_file.tag.album),
        "artist": str(audio_file.tag.artist),
        "title": str(audio_file.tag.title),
        "year": str(audio_file.tag.getBestDate()),
    }
    if audio_file.tag.images:
        image_data = audio_file.tag.images[0].image_data
        base64_image = base64.b64encode(image_data).decode('utf-8')
        tag_data["album_art"] = base64_image
    else:
        tag_data["album_art"] = None
    return tag_data


def get_vorbis_tag(filepath: str):
    try:
        audio_file = mutagen.flac.FLAC(filepath)
        if not audio_file:
            return None
        tag_data = {
            "album": audio_file.get('album')[0] if 'album' in audio_file else None,
            "artist": audio_file.get('artist')[0] if 'artist' in audio_file else None,
            "title": audio_file.get('title')[0] if 'title' in audio_file else None,
            "year": audio_file.get('date')[0] if 'date' in audio_file else None,
        }
        if audio_file.pictures:
            mime_type = audio_file.pictures[0].mime
            if validate_image_mime(audio_file.pictures[0].data, mime_type):
                print("[Info] Image data found and validated")
                print("[Info] Mime type: " + mime_type)
                image_data = audio_file.pictures[0].data
                base64_image = base64.b64encode(image_data).decode('utf-8')
                tag_data["album_art"] = base64_image
            else:
                print("[Info] Image data found but failed validation. Continuing to download the file")
                return None
        return tag_data
    except Exception:
        print("[Info] Failed to read file as FLAC")
        return None

def get_audio_tags(url: str, chunk_size=DEFAULT_CHUNK_SIZE):
    """
    Check if the remote mp3 file if ID3v2
    """
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        print("Error downloading the file")
        raise InvalidFileError("Error downloading the file. Remote server responded with status code " + str(response.status_code))
    with NamedTemporaryFile(delete=False) as temp_file:
        bytes_written = 0
        meta_tag_type = TagType.NONE
        for chunk in response.iter_content(chunk_size=chunk_size):
            temp_file.write(chunk)
            temp_file.flush()
            bytes_written += len(chunk)
            if meta_tag_type == TagType.NONE:
                with open(temp_file.name, 'rb') as f:
                    first_four_bytes = f.read(4)
                    if first_four_bytes[:3] == b'ID3':
                        meta_tag_type = TagType.ID3
                    elif first_four_bytes == b'fLaC':
                        meta_tag_type = TagType.VORBIS
                    else:
                        raise InvalidFileError("[ERROR] Did not match any supported audio file formats")

            if meta_tag_type == TagType.ID3:
                print("[Info] Attempting to read ID3 tag of " + url)
                tag_data = get_id3_tag(temp_file.name)
                if tag_data:
                    break
            elif meta_tag_type == TagType.VORBIS:
                print("[Info] Attempting to read Vorbis tag of " + url)
                tag_data = get_vorbis_tag(temp_file.name)
                if tag_data:
                    break
    tag_data["url"] = url
    return tag_data


@app.route('/api/get_playlist_data')
def get_playlist_data():
    url = request.args.get('url')
    use_cache = request.args.get('cache')
    if url is None:
        print("No url provided")
        return 404
    if use_cache is not None and use_cache == "false":
        print("[Info] Cache disabled for this request")
        ENABLE_CACHE = False # WILL NOT WORK for NON SERVERLESS DEPLOYMENTS
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
            playlist_data.append(get_audio_tags(line))
            if ENABLE_CACHE:
                print(f"[Info] Cache Miss for individual song {line}! Setting cache data")
                redis.set_data(line, json.dumps(playlist_data[-1]))
        if ENABLE_CACHE and CACHE_PLAYLISTS:
            print("[INFO] Setting playlist cache data in Redis")
            redis.set_data(url, json.dumps(playlist_data))
        return jsonify(playlist_data)
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)




