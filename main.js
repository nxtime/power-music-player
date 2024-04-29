import express from "express";
import { handler } from "./frontend/build/handler.js";
import fs from "fs";
import path from "path";
import cors from "cors";


const PORT = 3000;
const app = express();

app.use(cors());

const s3 = `https://s3.marcospaulo.dev.br`

const normalizeName = (item) => item.replaceAll(" ", "-").toLowerCase();

app.get("/api/albums/:album", (req, res) => {
  const { album } = req.params;
  const albumPath = path.join(process.cwd(), `music/${album}`);

  const albumCoverPath = path.join(albumPath, album + ".jpg")
  const albumCoverBuffer = fs.readFileSync(albumCoverPath);

  const albumCover = Buffer.from(albumCoverBuffer).toString("base64");

  const albumSongs =  fs.readdirSync(albumPath).filter(file => file.endsWith('.mp3')).map((song) => {
      const songName = song.replace(".mp3", "");
      const cover = `${s3}/${normalizeName(album)}/${normalizeName(songName)}.jpg`

      return {
        name: songName,
        cover
      }
  });

  return res.json({
    name: album,
    cover: albumCover,
    songs: albumSongs 
  });
});

app.get("/api/albums/:album/:song", (req, res) => {
  const { album, song } = req.params;

  const songPath = path.join(process.cwd(), `music/${album}/${song}.mp3`);

  return res.sendFile(songPath);
});

app.get("/api/albums", (_req, res) => {
  const musicPath = path.join(process.cwd(), "music");

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
})

app.use(handler);

app.listen(PORT, () => {
  console.log(`🚀 App running on PORT ${PORT}`)
})
