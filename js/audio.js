/**
 * [사찰 오디오 & 실제 스님 독경 플레이리스트 엔진 - js/audio.js]
 * - 사용자가 제공한 '불경 모음' 폴더의 실제 스님 육성 음원(반야심경, 헌다게, 오분향게) 재생
 * - 볼륨 조절 슬라이더 실시간 연동 (0% ~ 100%)
 * - Web Audio API 청아한 목탁, 범종, 풍경, 산새 소리 효과음
 */

class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.natureTimer = null;
    this.isNaturePlaying = false;

    // 실제 스님 육성 경전 플레이리스트
    this.playlist = window.TEMPLE_CONFIG.buddhistPlaylists || [];
    this.currentTrackIndex = 0;
    this.isPlayingBgm = false;
    this.bgmVolume = 0.5; // 기본 볼륨 50%

    // 실제 오디오 엘리먼트
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";
    this.audioElement.volume = this.bgmVolume;
    this.onTrackChangeCallback = null;
    this.onVolumeChangeCallback = null;

    this.setupAudioListeners();
  }

  setupAudioListeners() {
    // 트랙 종료 시 자동으로 다음 곡으로 넘어가며 순환 반복 재생
    this.audioElement.addEventListener("ended", () => {
      this.playNextTrack();
    });

    this.audioElement.addEventListener("play", () => {
      this.isPlayingBgm = true;
      if (this.onTrackChangeCallback) {
        this.onTrackChangeCallback(this.getCurrentTrack(), true, this.currentTrackIndex);
      }
    });

    this.audioElement.addEventListener("pause", () => {
      this.isPlayingBgm = false;
      if (this.onTrackChangeCallback) {
        this.onTrackChangeCallback(this.getCurrentTrack(), false, this.currentTrackIndex);
      }
    });

    this.audioElement.addEventListener("error", (e) => {
      console.warn("오디오 재생 오류 발생:", this.audioElement.src, e);
    });
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setTrackChangeListener(fn) {
    this.onTrackChangeCallback = fn;
  }

  setVolumeChangeListener(fn) {
    this.onVolumeChangeCallback = fn;
  }

  getCurrentTrack() {
    return this.playlist[this.currentTrackIndex] || null;
  }

  /**
   * 실제 스님 육성 불경 BGM 재생 / 일시정지 토글
   */
  toggleBgm() {
    this.initContext();
    if (this.isPlayingBgm) {
      this.pauseBgm();
      return false;
    } else {
      this.playBgm();
      return true;
    }
  }

  playBgm(trackIndex = null) {
    this.initContext();
    if (this.isMuted) this.isMuted = false;

    // [개선 2] 실제 스님 불경 음악이 재생될 때는 기존 자연 앰비언스 BGM을 완전히 정지 (음원 중복 방지)
    this.stopNatureAmbience();

    if (trackIndex !== null && trackIndex >= 0 && trackIndex < this.playlist.length) {
      this.currentTrackIndex = trackIndex;
    }

    const track = this.getCurrentTrack();
    if (!track) return;

    // 한글 및 공백 파일명 URL 안전 인코딩
    const encodedUrl = encodeURI(track.audioUrl);
    if (this.audioElement.src !== location.origin + "/" + encodedUrl && !this.audioElement.src.endsWith(encodedUrl)) {
      this.audioElement.src = encodedUrl;
    }

    this.audioElement.volume = this.bgmVolume;
    this.isPlayingBgm = true;

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("오디오 자동 재생 제한 또는 오류:", err);
      });
    }

    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(track, true, this.currentTrackIndex);
    }
  }

  /**
   * 특정 트랙 인덱스로 즉시 재생
   */
  playTrack(index) {
    if (typeof index === "number" && index >= 0 && index < this.playlist.length) {
      this.currentTrackIndex = index;
      this.playBgm();
    }
  }

  pauseBgm() {
    this.isPlayingBgm = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(this.getCurrentTrack(), false, this.currentTrackIndex);
    }
    // [개선 2] 불경 음악을 일시정지하면 조용한 산사 자연 앰비언스를 재개
    if (!this.isMuted) {
      this.startNatureAmbience();
    }
  }

  playNextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.playBgm();
  }

  playPrevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.playBgm();
  }

  /**
   * 볼륨 조절 (0.0 ~ 1.0)
   */
  setVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.bgmVolume;
    }
    if (this.onVolumeChangeCallback) {
      this.onVolumeChangeCallback(this.bgmVolume);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.audioElement) this.audioElement.pause();
      this.stopNatureAmbience();
    } else {
      if (this.isPlayingBgm) {
        this.playBgm();
      }
    }
    return this.isMuted;
  }

  /**
   * 1. 청아한 목탁(木鐸) 소리 (실제 나무 공명 물리 합성)
   */
  playMoktak(pitchOffset = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreq = 660 + pitchOffset;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(baseFreq * 1.18, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.025);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, now + 0.14);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(baseFreq * 2.08, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.95, now + 0.08);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(baseFreq * 1.25, now);
    filter.Q.setValueAtTime(6.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.52, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.17);
    osc2.stop(now + 0.17);
  }

  /**
   * 2. 웅장한 범종 소리
   */
  playTempleBell(deep = true) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const base = deep ? 174 : 293.66;
    const harmonics = [1, 1.5, 2.0, 2.756, 3.01];
    const gains = [0.28, 0.14, 0.1, 0.05, 0.04];
    const duration = deep ? 4.2 : 2.8;

    harmonics.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(base * ratio, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gains[idx], now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (1 - idx * 0.12));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * 3. 처마 끝 풍경 소리
   */
  playWindChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    const chosen = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(chosen, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.65);
  }

  /**
   * 4. 산새 소리
   */
  playBirdChirp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chirpCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < chirpCount; i++) {
      const start = now + i * 0.18;
      const fStart = 2100 + Math.random() * 600;
      const fPeak = fStart + 500 + Math.random() * 400;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(fStart, start);
      osc.exponentialRampToValueAtTime(fPeak, start + 0.06);
      osc.exponentialRampToValueAtTime(fStart * 0.9, start + 0.13);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    }
  }

  /**
   * 5. 산사 자연 앰비언스 (산새 + 풍경)
   * [개선 2] 불경 BGM이 재생 중이거나 음소거 상태일 때는 실행되지 않음
   */
  startNatureAmbience() {
    if (this.isMuted || this.isNaturePlaying || this.isPlayingBgm) return;
    this.initContext();
    this.isNaturePlaying = true;
    this.playWindChime();

    this.natureTimer = setInterval(() => {
      if (this.isMuted || !this.isNaturePlaying || this.isPlayingBgm) return;
      const rand = Math.random();
      if (rand < 0.55) {
        this.playBirdChirp();
      } else if (rand < 0.85) {
        this.playWindChime();
      }
    }, 4500);
  }

  stopNatureAmbience() {
    this.isNaturePlaying = false;
    if (this.natureTimer) {
      clearInterval(this.natureTimer);
      this.natureTimer = null;
    }
  }
}

window.templeAudio = new TempleAudioEngine();
