import { useEffect, useState, useRef, useCallback } from "react";
import { IFluidContainer } from "@fluidframework/fluid-static";
// Not intended for use outside of a Codebox Live sandbox
import { CodeboxLive } from "@codeboxlive/extensions-core";
// In production, import AzureClient from "@fluidframework/azure-client"
import { CodeboxLiveFluidClient } from "@codeboxlive/extensions-fluid";
import Header from "./Header";
import {
  EphemeralMediaSession,
  IMediaPlayerSynchronizerEvent,
  MediaPlayerSynchronizer,
  MediaPlayerSynchronizerEvents,
} from "@microsoft/live-share-media";

export default function App(): JSX.Element {
  const initRef = useRef<boolean>(false);
  const [synchronizer, setSynchronizer] = useState<MediaPlayerSynchronizer>();
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Setup media synchronizer
  useEffect(() => {
    if (initRef.current || !videoElementRef.current) return;
    videoElementRef.current.src =
      "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov";
    initRef.current = true;
    // Join container on app load
    async function start(): Promise<void> {
      // Initialize the CodeboxLiveClient so that this sandbox app can communicate
      // with the Codebox Live application using window post messages. This is used
      // to authenticate a Fluid container when testing this app in a sandbox.
      await CodeboxLive.initialize();
      // Define container schema
      const schema = {
        initialObjects: {
          mediaSession: EphemeralMediaSession,
        },
      };
      // Define container callback for when container is first created
      const onFirstInitialize = (container: IFluidContainer) => {
        // Setup any initial state here
      };
      const client = new CodeboxLiveFluidClient();
      const results = await client.joinContainer(schema, onFirstInitialize);
      const mediaSession = results.container.initialObjects
        .mediaSession as EphemeralMediaSession;
      const mediaSynchronizer = mediaSession.synchronize(
        videoElementRef.current!
      );
      // Start listening to group playback state changes
      await mediaSession.initialize();
      setSynchronizer(mediaSynchronizer);
    }
    start().catch((error: any) => console.error(error));
  });

  // Listen for player group actions for errors (e.g., play error)
  useEffect(() => {
    const onGroupAction = (evt: IMediaPlayerSynchronizerEvent) => {
      if (evt.error) {
        if (
          videoElementRef.current &&
          evt.details.action === "play" &&
          evt.error.name === "NotAllowedError"
        ) {
          // The user has not interacted with the document so the browser blocked the play action
          // mute the player and try again
          videoElementRef.current.muted = true;
          videoElementRef.current.play();
        } else {
          console.error(evt.error);
        }
      }
    };
    synchronizer?.addEventListener(
      MediaPlayerSynchronizerEvents.groupaction,
      onGroupAction
    );
    // On unmount, clean up event listeners
    return () => {
      synchronizer?.removeEventListener(
        MediaPlayerSynchronizerEvents.groupaction,
        onGroupAction
      );
    };
  }, [synchronizer]);

  // When a user clicks play, call play in synchronizer
  const play = useCallback(() => {
    synchronizer?.play();
  }, [synchronizer]);

  // When a user clicks pause, call pause in synchronizer
  const pause = useCallback(() => {
    synchronizer?.pause();
  }, [synchronizer]);

  // When a user seeks, call seekTo in synchronizer
  const startOver = useCallback(() => {
    synchronizer?.seekTo(0);
  }, [synchronizer]);

  return (
    <div>
      <Header />
      <video
        id="player"
        ref={videoElementRef}
        poster="https://images4.alphacoders.com/247/247356.jpg"
        height={9 * 40}
        width={16 * 40}
      />
      <button onClick={play}>{"Play"}</button>
      <button onClick={pause}>{"Pause"}</button>
      <button onClick={startOver}>{"Start Over"}</button>
      {!synchronizer && <div>{"Loading"}</div>}
    </div>
  );
}
