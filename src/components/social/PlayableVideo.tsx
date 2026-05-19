import { forwardRef, type VideoHTMLAttributes } from "react";
import { usePlayableVideoSource } from "@/hooks/usePlayableVideoSource";

type PlayableVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src?: string;
};

const PlayableVideo = forwardRef<HTMLVideoElement, PlayableVideoProps>(
  ({ src, preload = "metadata", playsInline = true, ...props }, ref) => {
    const playableSrc = usePlayableVideoSource(src);

    return (
      <video
        {...props}
        ref={ref}
        src={playableSrc}
        preload={preload}
        playsInline={playsInline}
        {...({ "webkit-playsinline": "true" } as Record<string, string>)}
      />
    );
  },
);

PlayableVideo.displayName = "PlayableVideo";

export default PlayableVideo;