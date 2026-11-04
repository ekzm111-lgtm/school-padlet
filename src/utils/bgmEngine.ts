/**
 * Web Audio API를 활용한 순수 브라우저 프로그래머틱 배경음악(BGM) 엔진
 * 외부 오디오 파일 다운로드 없이 0초 로딩으로 경쾌한 퀴즈 게임 BGM을 실시간 합성 및 무한 루프 재생합니다.
 */

export type BgmTheme = 'lobby' | 'quiz' | 'victory';

class BgmSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;
  private currentTheme: BgmTheme | null = null;
  private timerId: number | null = null;
  private currentStep: number = 0;
  private bpm: number = 120;
  private volume: number = 0.25;
  private isMuted: boolean = false;
  private listeners: Set<(state: { isPlaying: boolean; isMuted: boolean; theme: BgmTheme | null }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('bgm_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('bgm_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 0.25;
      }
    }
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 짧은 킥 드럼 합성
  private playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  // 경쾌한 하이햇 합성
  private playHiHat(time: number, accent: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(6000, time);
    osc.frequency.linearRampToValueAtTime(8000, time + 0.03);

    const vol = accent ? 0.08 : 0.035;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.045);
  }

  // 멜로디 / 베이스 노트 합성 (따뜻한 트라이앵글 & 사인파 합성)
  private playSynthNote(
    time: number,
    freq: number,
    durationSec: number,
    type: OscillatorType = 'triangle',
    vol: number = 0.2
  ) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + Math.max(0.05, durationSec * 0.9));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + durationSec);
  }

  // 시퀀서 한 스텝 실행 (16분 음표 주기)
  private step() {
    if (!this.isRunning || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime + 0.05;
    const stepIdx = this.currentStep % 16;
    const barIdx = Math.floor(this.currentStep / 16) % 4;
    const stepDuration = 60 / this.bpm / 4;

    if (this.currentTheme === 'lobby') {
      // 🏰 대기실 테마: 여유롭고 따뜻한 롤플레잉 게임 마을/로비 스타일 (C Major 펜타토닉)
      // 킥 드럼: 0, 8 스텝
      if (stepIdx === 0 || stepIdx === 8) {
        this.playKick(now);
      }
      // 하이햇: 짝수 스텝
      if (stepIdx % 4 === 2) {
        this.playHiHat(now, false);
      }

      // 베이스라인 (C3 -> G2 -> A2 -> F2)
      const rootNotes = [48, 43, 45, 41]; // C3, G2, A2, F2
      const rootMidi = rootNotes[barIdx];
      if (stepIdx === 0 || stepIdx === 6 || stepIdx === 10) {
        this.playSynthNote(now, this.midiToFreq(rootMidi), stepDuration * 2, 'sine', 0.22);
      }

      // 경쾌한 마림바 스타일 아르페지오 멜로디
      const lobbyMelody: Record<number, number> = {
        0: 60, // C4
        2: 64, // E4
        4: 67, // G4
        6: 72, // C5
        8: 67, // G4
        10: 69, // A4
        12: 64, // E4
        14: 60, // C4
      };
      if (lobbyMelody[stepIdx] !== undefined) {
        this.playSynthNote(now, this.midiToFreq(lobbyMelody[stepIdx]), stepDuration * 1.5, 'triangle', 0.16);
      }
    } else if (this.currentTheme === 'quiz') {
      // ⚡ 퀴즈 진행 테마: 카훗/퀴즈앤 스타일의 긴장감 넘치는 리드미컬 128 BPM 일렉트로 비트
      // 4온더플로어 킥 드럼 (0, 4, 8, 12 스텝)
      if (stepIdx % 4 === 0) {
        this.playKick(now);
      }
      // 오프비트 하이햇 (2, 6, 10, 14 스텝)
      if (stepIdx % 4 === 2) {
        this.playHiHat(now, true);
      } else if (stepIdx % 2 === 1) {
        this.playHiHat(now, false);
      }

      // 긴장감 있는 베이스 펌핑 (F2 -> G2 -> A2 -> A2)
      const bassProg = [41, 43, 45, 45]; // F2, G2, A2, A2
      const curBass = bassProg[barIdx];
      if (stepIdx % 2 === 0) {
        this.playSynthNote(now, this.midiToFreq(curBass + (stepIdx % 4 === 2 ? 12 : 0)), stepDuration * 0.9, 'sawtooth', 0.12);
      }

      // 텐션을 올리는 아르페지오 리드 멜로디
      const quizArp = [69, 72, 76, 81, 76, 72, 69, 72]; // A4, C5, E5, A5...
      const arpNote = quizArp[stepIdx % 8];
      this.playSynthNote(now, this.midiToFreq(arpNote), stepDuration * 0.8, 'square', 0.08);
    } else if (this.currentTheme === 'victory') {
      // 🏆 시상식 테마: 웅장하고 신나는 승리 행진곡 팡파레
      if (stepIdx % 4 === 0) {
        this.playKick(now);
      }
      if (stepIdx % 2 === 0) {
        this.playHiHat(now, stepIdx % 4 === 0);
      }

      // 승리의 팡파레 멜로디
      const victoryNotes: Record<number, number> = {
        0: 60, // C4
        2: 60, // C4
        4: 64, // E4
        6: 67, // G4
        8: 72, // C5
        10: 72, // C5
        12: 76, // E5
        14: 79, // G5
      };
      if (victoryNotes[stepIdx] !== undefined) {
        this.playSynthNote(now, this.midiToFreq(victoryNotes[stepIdx]), stepDuration * 1.8, 'triangle', 0.25);
      }

      // 베이스
      if (stepIdx === 0 || stepIdx === 8) {
        this.playSynthNote(now, this.midiToFreq(48), stepDuration * 3, 'sine', 0.28); // C3
      }
    }

    this.currentStep = (this.currentStep + 1) % 64;
  }

  public play(theme: BgmTheme = 'lobby') {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.currentTheme === theme && this.isRunning) {
      return;
    }

    this.currentTheme = theme;
    this.bpm = theme === 'quiz' ? 126 : theme === 'victory' ? 120 : 108;
    this.currentStep = 0;
    this.isRunning = true;

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }

    const stepIntervalMs = (60 / this.bpm / 4) * 1000;
    this.timerId = window.setInterval(() => {
      this.step();
    }, stepIntervalMs);

    this.notify();
  }

  public stop() {
    this.isRunning = false;
    this.currentTheme = null;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('bgm_muted', String(this.isMuted));
    }
    this.notify();
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('bgm_volume', String(this.volume));
    }
    this.notify();
  }

  public getStatus() {
    return {
      isPlaying: this.isRunning,
      isMuted: this.isMuted,
      theme: this.currentTheme,
      volume: this.volume,
    };
  }

  public subscribe(listener: (state: { isPlaying: boolean; isMuted: boolean; theme: BgmTheme | null }) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = {
      isPlaying: this.isRunning,
      isMuted: this.isMuted,
      theme: this.currentTheme,
    };
    this.listeners.forEach((listener) => listener(state));
  }
}

// 싱글톤 인스턴스 내보내기
export const bgmEngine = new BgmSynthEngine();
