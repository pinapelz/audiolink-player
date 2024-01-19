import React from 'react';
import Image from 'next/image';

interface SongProps {
    albumArt: string;
    title: string;
}

const Song: React.FC<SongProps> = ({ albumArt, title }) => {
    return (
                <div className="song flex items-center space-x-4">
                    <div className="w-64 h-64">
                        <Image src={albumArt} alt="Album Art" className="album-art" width={128} height={128} onError={(e) => { e.target.onerror = null; e.target.src = 'placeholder.jpg' }} />
                        <h3 className="song-title text-white">{title}</h3>
                    </div>
                </div>
    );
};

export default Song;
