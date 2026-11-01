// ---------- Background music ----------
// Put your song in the "audio" folder and set its name here.
const MUSIC_FILE = 'audio/rpdmusic.mp3';
const MUSIC_VOLUME = 1;          // 0 = silent, 1 = full
const MUSIC_MUTE_KEY = 'm';        // press this to mute / unmute (pick a key controls.js doesn't already use)

const music = new Audio(MUSIC_FILE);
music.loop = true;
music.volume = MUSIC_VOLUME;

// browsers only allow sound after the first click / key press, so the music starts then
function startMusic() {
  music.play().catch(function () {});
  window.removeEventListener('pointerdown', startMusic);
  window.removeEventListener('keydown', startMusic);
}
window.addEventListener('pointerdown', startMusic);
window.addEventListener('keydown', startMusic);

// mute / unmute
window.addEventListener('keydown', function (event) {
  if (event.key.toLowerCase() === MUSIC_MUTE_KEY) music.muted = !music.muted;
});