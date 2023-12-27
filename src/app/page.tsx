"use client";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import CurrentTrack from "../components/CurrentTrack";
import { useEffect, useState } from "react";
import MusicQueue from "../components/MusicQueue";
import { useSearchParams } from "next/navigation";

interface SongMetadata {
  title?: string;
  artist?: string;
  album?: string;
  album_art?: string;
  url?: string;
}
interface Playlist {
  songs: SongMetadata[];
  error?: string;
}
export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const [playlist, setPlaylist] = useState<Playlist>({
    songs: [],
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentPlaylistUrl, setCurrentPlaylistUrl] = useState<string | null>(
    null
  );
  const [currentTrack, setCurrentTrack] = useState<SongMetadata>({
    title: "No Song Selected",
    artist: "No Artist Selected",
    album: "No Album Selected",
    album_art: "/placeholder.png",
  });
  const searchParams = useSearchParams();
  const preload = searchParams.get("pl");
  useEffect(() => {
    if (preload) {
      setCurrentPlaylistUrl(preload);
    }
  }, [preload]);

  useEffect(() => {
    if (currentPlaylistUrl) {
      const encodedUrl = encodeURIComponent(currentPlaylistUrl);
      if (currentPlaylistUrl && currentPlaylistUrl.endsWith(".json") || currentPlaylistUrl.startsWith("blob")) {
        try {
          fetch(currentPlaylistUrl)
            .then((response) => response.json())
            .then((data) => {
              if (Array.isArray(data) && data.length > 0) {
                setPlaylist({ songs: data });
                setCurrentTrack(data[0]);
                setCurrentTrackIndex(0);
              }
            });
        } catch (e) {
          console.log(e);
        }
      } else {
        fetch(apiUrl + "/api/get_playlist_data?url=" + encodedUrl)
          .then((response) => response.json())
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              setPlaylist({ songs: data });
              setCurrentTrack(data[0]);
              setCurrentTrackIndex(0);
            }
          });
      }
    }
  }, [currentPlaylistUrl, apiUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <CurrentTrack
        albumArt={
          "data:image/jpeg;base64," +
          (currentTrack.album_art || "/placeholder.png")
        }
        title={currentTrack.title}
        album={currentTrack.album}
        artist={currentTrack.artist}
      />
      <div className="py-1">
        <MusicQueue songs={playlist.songs} currentIndex={currentTrackIndex} />
      </div>



      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <input
          type="text"
          className="text-black rounded-lg w-full sm:w-48 p-2 text-center"
          placeholder="Enter URL"
          onChange={(e) => setCurrentPlaylistUrl(e.target.value)}
        />
        <div className="flex justify-center">
          <label className="text-black bg-white rounded-lg w-auto px-2 py-1 text-center cursor-pointer">
            Upload File
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                const fileUrl = URL.createObjectURL(file);
                setCurrentPlaylistUrl(URL.createObjectURL(file));
                console.log(fileUrl);
              }}
            />
          </label>
        </div>
      </div>


      

      <button
        className="bg-white text-black py-2 px-4 rounded mt-2 mb-2 hover:bg-gray-200"
        onClick={() => {
          const newPlaylist = playlist.songs;
          for (let i = newPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
          }
          setPlaylist({ songs: newPlaylist });
          setCurrentTrack(newPlaylist[0]);
          setCurrentTrackIndex(0);
        }}
      >
        Shuffle
      </button>

      <AudioPlayer
        autoPlay
        showSkipControls
        key={currentTrack.url}
        src={currentTrack.url}
        onEnded={() => {
          if (currentTrackIndex < playlist.songs.length - 1) {
            setCurrentTrackIndex(currentTrackIndex + 1);
            setCurrentTrack(playlist.songs[currentTrackIndex + 1]);
          }
        }}
        onClickNext={() => {
          if (currentTrackIndex < playlist.songs.length - 1) {
            setCurrentTrackIndex(currentTrackIndex + 1);
            setCurrentTrack(playlist.songs[currentTrackIndex + 1]);
          }
        }}
        onClickPrevious={() => {
          if (currentTrackIndex > 0) {
            setCurrentTrackIndex(currentTrackIndex - 1);
            setCurrentTrack(playlist.songs[currentTrackIndex - 1]);
          }
        }}
      />
    </main>
  );
}
