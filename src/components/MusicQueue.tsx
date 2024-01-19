import React, { useEffect, useRef } from 'react';

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
    const songRefs = useRef<(HTMLLIElement | null)[]>([]);

    useEffect(() => {
        if (songRefs.current[currentIndex]) {
            songRefs.current[currentIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }, [currentIndex]);

    return (
        <div className="music-queue px-2">
            <h2>Music Queue</h2>
            <ul className="max-h-[10em] overflow-y-auto">
                {songs.map((song, index) => (
                    <li key={index + 1} ref={el => songRefs.current[index] = el} className={index === currentIndex ? 'bg-gray-200 text-black' : ''}>
                        <span className="text-xl">
                            {song.title && song.title.length > 30 ? song.title.substring(0, 26) + '...' : song.title ?? ''}
                        </span> - <span>{song.artist}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MusicQueue;