declare module 'abcjs' {
  export interface VisualOptions {
    responsive?: 'resize' | string;
    scale?: number;
    staffwidth?: number;
    paddingtop?: number;
    paddingbottom?: number;
    paddingright?: number;
    paddingleft?: number;
    add_classes?: boolean;
    visualTranspose?: number;
    selectionColor?: string;
  }

  export function renderAbc(
    output: HTMLElement | string,
    abcString: string,
    options?: VisualOptions
  ): any[];

  export const synth: {
    CreateSynth: new () => {
      init: (options: { visualObj: any; audioContext?: AudioContext }) => Promise<any>;
      prime: () => Promise<any>;
      start: () => void;
      pause: () => void;
      stop: () => void;
      seek: (position: number) => void;
    };
    playEvent: any;
    supportsAudio: () => boolean;
  };
}
