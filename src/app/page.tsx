"use client";
import React, { useState } from 'react';
import Song from '../components/Songs/Song';


export default function HomePage() {
  const [clientLoggedIn, setClientLoggedIn] = useState(false);

  const handleLogin = () => {
    setClientLoggedIn(true);
  };
// antalmanac styled codes used here
  return (
      <div>
        <Song albumArt="https://w0.peakpx.com/wallpaper/274/399/HD-wallpaper-anime-virtual-youtuber-hoshimachi-suisei-hololive.jpg" title="AHH TITLE" />
        <Song albumArt="https://w0.peakpx.com/wallpaper/274/399/HD-wallpaper-anime-virtual-youtuber-hoshimachi-suisei-hololive.jpg" title="AHH TITLE" />
        <Song albumArt="https://w0.peakpx.com/wallpaper/274/399/HD-wallpaper-anime-virtual-youtuber-hoshimachi-suisei-hololive.jpg" title="AHH TITLE" />
      </div>
  );
};
