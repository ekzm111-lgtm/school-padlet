import React, { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { Volume2, Square, AlertCircle } from 'lucide-react';

interface ScoreViewerProps {
  abcNotation: string;
  id?: string;
  scale?: number;
  showAudioControls?: boolean;
  className?: string;
}

export const ScoreViewer: React.FC<ScoreViewerProps> = ({
  abcNotation,
  id = 'paper-score',
  scale = 1.0,
  showAudioControls = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const synthRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !abcNotation.trim()) return;

    try {
      setError(null);
      abcjs.renderAbc(containerRef.current, abcNotation.trim(), {
        responsive: 'resize',
        scale: scale,
        paddingtop: 5,
        paddingbottom: 5,
        paddingright: 10,
        paddingleft: 10,
        staffwidth: 500,
        add_classes: true,
      });
    } catch (err) {
      console.error('Failed to render ABC notation:', err);
      setError('악보 렌더링 중 오류가 발생했습니다.');
    }
  }, [abcNotation, scale]);

  const handlePlayAudio = async () => {
    if (!abcNotation.trim()) return;

    if (isPlaying) {
      if (synthRef.current) {
        try {
          synthRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsPlaying(false);
      return;
    }

    try {
      if (!abcjs.synth.supportsAudio()) {
        alert('현재 브라우저 환경에서는 오디오 재생을 지원하지 않습니다.');
        return;
      }

      setIsPlaying(true);
      const visualObj = abcjs.renderAbc(document.createElement('div'), abcNotation.trim());
      if (!visualObj || !visualObj[0]) {
        setIsPlaying(false);
        return;
      }

      const synth = new abcjs.synth.CreateSynth();
      synthRef.current = synth;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await synth.init({
        visualObj: visualObj[0],
        audioContext: audioContext,
      });

      await synth.prime();
      synth.start();

      // 재생 완료 감지 (타이머 또는 대략적인 길이)
      const duration = (visualObj[0] as any).getTotalTime ? (visualObj[0] as any).getTotalTime() * 1000 : 4000;
      setTimeout(() => {
        setIsPlaying(false);
      }, duration + 500);

    } catch (err) {
      console.warn('ABCjs synth error, fallback:', err);
      setIsPlaying(false);
    }
  };

  if (!abcNotation.trim()) return null;

  return (
    <div className={`abcjs-container relative border border-slate-200 rounded-md bg-white p-2 my-2 shadow-sm ${className}`}>
      {error ? (
        <div className="flex items-center gap-2 text-rose-500 text-xs p-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : (
        <div ref={containerRef} id={`abc-render-${id}`} className="flex justify-center" />
      )}

      {showAudioControls && (
        <div className="no-print mt-2 flex justify-end items-center gap-2 border-t border-slate-100 pt-1">
          <button
            type="button"
            onClick={handlePlayAudio}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition ${
              isPlaying
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {isPlaying ? (
              <>
                <Square size={13} className="fill-rose-500" />
                <span>정지</span>
              </>
            ) : (
              <>
                <Volume2 size={13} />
                <span>소리 듣기</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
