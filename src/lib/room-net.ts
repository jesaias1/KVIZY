import type { PeerOptions } from "peerjs";

// Netværksindstillinger til rum. Som standard bruges den gratis PeerJS-
// mødeserver, Googles STUN-servere og en åben TURN-relæ som sidste udvej, når
// to enheder ikke kan nå hinanden direkte (fx Wi-Fi mod mobildata).
// Alt kan skiftes ud med egne servere via miljøvariabler:
//   NEXT_PUBLIC_PEER_HOST / _PORT / _PATH   egen PeerJS-server
//   NEXT_PUBLIC_TURN_URL / _USER / _CREDENTIAL   egen TURN-server
//     (flere adresser adskilles med komma)

export function peerOptions(): PeerOptions {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const iceServers: RTCIceServer[] = [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
    turnUrl
      ? {
          urls: turnUrl.split(",").map((url) => url.trim()),
          username: process.env.NEXT_PUBLIC_TURN_USER,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        }
      : {
          urls: [
            "turn:openrelay.metered.ca:80",
            "turn:openrelay.metered.ca:443",
            "turns:openrelay.metered.ca:443?transport=tcp",
          ],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
  ];
  return {
    ...(host
      ? {
          host,
          port: Number(process.env.NEXT_PUBLIC_PEER_PORT ?? 443),
          path: process.env.NEXT_PUBLIC_PEER_PATH ?? "/",
          secure: true,
        }
      : {}),
    config: { iceServers },
    debug: 0,
  };
}
