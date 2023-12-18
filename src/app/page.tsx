"use client";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import CurrentTrack from "../components/CurrentTrack";
import { useEffect, useState } from "react";
import MusicQueue from "../components/MusicQueue";
import { useSearchParams } from 'next/navigation'

interface SongMetadata {
  title?: string;
  artist?: string;
  album?: string;
  album_art?: string;
  url?: string;
}
interface Playlist{
  songs: SongMetadata[];
  error?: string;
}
export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const [playlist, setPlaylist] = useState<Playlist>({
    songs: [],
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentPlaylistUrl, setCurrentPlaylistUrl] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SongMetadata>({
    title: "No Song Selected",
    artist: "No Artist Selected",
    album: "No Album Selected",
    album_art: "",
  });
  const searchParams = useSearchParams()
  const preload = searchParams.get('pl')
  useEffect(() => {
    if (preload) {
      setCurrentPlaylistUrl(preload)
    }
  }, [preload])

  useEffect(() => {
    if (currentPlaylistUrl) {
      const encodedUrl = encodeURIComponent(currentPlaylistUrl);
      console.log(apiUrl+"/api/get_playlist_data?url="+encodedUrl);
      fetch(apiUrl+encodedUrl)
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPlaylist({ songs: data });
            setCurrentTrack(data[0]);
            setCurrentTrackIndex(0);
          }
        });
    }
  }, [currentPlaylistUrl]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <CurrentTrack
        albumArt={"data:image/jpeg;base64," + currentTrack.album_art}
        title={currentTrack.title}
        album={currentTrack.album}
        artist={currentTrack.artist}
      />
      <div className="py-1">
        <MusicQueue songs={playlist.songs} currentIndex={currentTrackIndex} />
      </div>
      <input
        type="text"
        className="text-black rounded-lg p-2 w-96"
        placeholder="Enter URL"
        onChange={(e) => setCurrentPlaylistUrl(e.target.value)}
      />
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