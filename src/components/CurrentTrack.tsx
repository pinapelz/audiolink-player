import React from 'react';

interface CurrentTrackProps {
  albumArt: string;
  title?: string;
  artist?: string;
  album?: string;
}

const CurrentTrack: React.FC<CurrentTrackProps> = ({ albumArt, title, artist, album }) => {
    return (
        <div className="flex flex-col items-center space-y-2 p-4 shadow-md rounded-lg mt-2">
            <img src={albumArt} alt="Album Art" className="w-140 h-96 shadow-lg" />
            <div className="text-center py-4">
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-lg text-gray-600">{artist}</p>
                <p className="text-lg text-gray-400 italic">{album}</p>
            </div>
        </div>
    );
};

export default CurrentTrack;
