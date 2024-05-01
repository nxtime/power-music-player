import express from "express";
import { handler } from "./frontend/build/handler.js";
import fs from "fs";
import path from "path";
import cors from "cors";
import NodeCache from "node-cache";

const PORT = 3000;
const app = express();

app.use(cors());
const cache = new NodeCache();

const s3 = `https://s3.marcospaulo.dev.br`

const defaultPath = path.join(process.cwd(), "music")

const normalizeName = (item) => item.replaceAll(" ", "-").toLowerCase();

app.get("/api/albums/:album", (req, res) => {
  const currentPath = req.path;
  let data = cache.get(currentPath);

  const { album } = req.params;
  const albumPath = path.join(defaultPath, album);
  const cover = `${s3}/${normalizeName(album)}/${normalizeName(album)}.jpg`;

  if (!data) {
    const albumSongs = fs.readdirSync(albumPath).filter(file => file.endsWith('.mp3')).map((song) => {
      const songName = song.replace(".mp3", "");
      const cover = `${s3}/${normalizeName(album)}/${normalizeName(songName)}.jpg`;

      return {
        name: songName,
        cover
      };
    });

    data = {
      name: album,
      cover,
      songs: albumSongs
    };
    cache.set(currentPath, data, 3600);
  }

  return res.json(data);
});

app.get("/api/albums/:album/:song", (req, res) => {
  const { album, song } = req.params;

  const songPath = path.join(defaultPath, album, song + ".mp3");

  return res.sendFile(songPath);
});

app.get("/api/albums", (_req, res) => {
  const musicPath = defaultPath;

  const albums = fs.readdirSync(musicPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const albumPath = path.join(musicPath, dirent.name);

      const songs = fs.readdirSync(albumPath).filter(file => file.endsWith('.mp3'));

      const cover = `${s3}/${normalizeName(dirent.name)}/${normalizeName(dirent.name)}.jpg`

      return {
        name: dirent.name,
        cover,
        songs: songs.map(song => song.replace(".mp3", ""))
      };
    });

  return res.json(albums);
});

app.get("/api/songs", (req, res) => {
  const currentPath = req.path;
  let data = cache.get(currentPath);

  const songs = [];

  if (!data) {
    fs.readdirSync(defaultPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .forEach(dirent => {
        const albumPath = path.join(defaultPath, dirent.name);

        const currentSongs = fs.readdirSync(albumPath).filter(file => file.endsWith('.mp3'));

        const defaultCover = `${s3}/${normalizeName(dirent.name)}/${normalizeName(dirent.name)}.jpg`

        for (const song of currentSongs) {
          const songName = song.replace(".mp3", "");

          const cover = `${s3}/${normalizeName(dirent.name)}/${normalizeName(songName)}.jpg`

          songs.push({
            name: songName,
            cover,
            defaultCover,
            album: dirent.name
          });
        }
      });

    data = songs;
    cache.set(currentPath, data, 3600);
  }

  return res.json(data);
})

app.use(handler);

app.listen(PORT, () => {
  console.log(`🚀 App running on PORT ${PORT}`)
});
