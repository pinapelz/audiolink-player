import React from 'react';

interface SongMetadata {
    title?: string;
    artist?: string;
    album?: string;
    album_art?: string;
    url?: string;
}

interface Playlist{
    songs: SongMetadata[];
    currentIndex?: number;
    error?: string;
}

const MusicQueue: React.FC<Playlist> = ({ songs = [], currentIndex = 1 }) => {
    return (
        <div className="music-queue px-2">
            <h2>Music Queue</h2>
            <ul>
                {songs.map((song, index) => (
                    <li key={index + 1} className={index === currentIndex ? 'bg-gray-200 text-black' : ''}>
                        <span className="text-xl">
                            {song.title.length > 30 ? song.title.substring(0, 26) + '...' : song.title}
                        </span> - <span>{song.artist}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MusicQueue;