import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STUN_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

interface VoicePeer {
    userId: string;
    displayName: string;
    stream: MediaStream;
    isMuted?: boolean;
}

export function useVoiceChat(roomId: string | undefined, userId: string | undefined, displayName: string | undefined) {
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [peers, setPeers] = useState<VoicePeer[]>([]);
    const peersRef = useRef<Map<string, { pc: RTCPeerConnection; stream?: MediaStream; displayName: string }>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Cleanup all peer connections
    const cleanup = useCallback(() => {
        peersRef.current.forEach(({ pc }) => {
            pc.close();
        });
        peersRef.current.clear();
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        setPeers([]);
        setIsJoined(false);
    }, []);

    // Create a peer connection to a remote user
    const createPeerConnection = useCallback(async (remoteUserId: string, remoteName: string, stream: MediaStream) => {
        if (peersRef.current.has(remoteUserId)) return;
        const pc = new RTCPeerConnection(STUN_SERVERS);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'voice-ice',
                    payload: { from: userId, to: remoteUserId, candidate: e.candidate },
                });
            }
        };

        pc.ontrack = (e) => {
            const existing = peersRef.current.get(remoteUserId);
            if (existing) {
                existing.stream = e.streams[0];
                setPeers(prev => prev.map(p => p.userId === remoteUserId ? { ...p, stream: e.streams[0] } : p));
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                peersRef.current.delete(remoteUserId);
                setPeers(prev => prev.filter(p => p.userId !== remoteUserId));
            }
        };

        peersRef.current.set(remoteUserId, { pc, displayName: remoteName });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
            type: 'broadcast',
            event: 'voice-offer',
            payload: { from: userId, to: remoteUserId, sdp: pc.localDescription },
        });

        return pc;
    }, [userId]);

    // Join voice chat
    const joinVoice = useCallback(async () => {
        if (!roomId || !userId || channelRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const channel = supabase.channel(`voice-${roomId}`, {
                config: { broadcast: { ack: false, self: false } },
            });

            channel
                .on('broadcast', { event: 'voice-join' }, async ({ payload }) => {
                    if (payload.from === userId) return;
                    await createPeerConnection(payload.from, payload.name, stream);
                })
                .on('broadcast', { event: 'voice-leave' }, ({ payload }) => {
                    if (payload.from === userId) return;
                    const peer = peersRef.current.get(payload.from);
                    if (peer) {
                        peer.pc.close();
                        peersRef.current.delete(payload.from);
                        setPeers(prev => prev.filter(p => p.userId !== payload.from));
                    }
                })
                .on('broadcast', { event: 'voice-offer' }, async ({ payload }) => {
                    if (payload.to !== userId) return;
                    const pc = new RTCPeerConnection(STUN_SERVERS);
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));

                    pc.onicecandidate = (e) => {
                        if (e.candidate) {
                            channel.send({
                                type: 'broadcast',
                                event: 'voice-ice',
                                payload: { from: userId, to: payload.from, candidate: e.candidate },
                            });
                        }
                    };

                    pc.ontrack = (e) => {
                        const existing = peersRef.current.get(payload.from);
                        if (existing) {
                            existing.stream = e.streams[0];
                            setPeers(prev => {
                                const next = prev.filter(p => p.userId !== payload.from);
                                return [...next, { userId: payload.from, displayName: existing.displayName, stream: e.streams[0] }];
                            });
                        }
                    };

                    pc.onconnectionstatechange = () => {
                        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                            peersRef.current.delete(payload.from);
                            setPeers(prev => prev.filter(p => p.userId !== payload.from));
                        }
                    };

                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    peersRef.current.set(payload.from, { pc, displayName: payload.from });

                    channel.send({
                        type: 'broadcast',
                        event: 'voice-answer',
                        payload: { from: userId, to: payload.from, sdp: pc.localDescription },
                    });
                })
                .on('broadcast', { event: 'voice-answer' }, async ({ payload }) => {
                    if (payload.to !== userId) return;
                    const peer = peersRef.current.get(payload.from);
                    if (peer && peer.pc.remoteDescription === null) {
                        await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        setPeers(prev => [...prev, { userId: payload.from, displayName: peer.displayName, stream: new MediaStream() }]);
                    }
                })
                .on('broadcast', { event: 'voice-ice' }, async ({ payload }) => {
                    if (payload.to !== userId) return;
                    const peer = peersRef.current.get(payload.from);
                    if (peer && payload.candidate) {
                        await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        channel.send({
                            type: 'broadcast',
                            event: 'voice-join',
                            payload: { from: userId, name: displayName || 'Anonymous' },
                        });
                        setIsJoined(true);
                    }
                });

            channelRef.current = channel;
        } catch (err) {
            console.error('Voice chat join failed:', err);
        }
    }, [roomId, userId, displayName, createPeerConnection]);

    // Leave voice chat
    const leaveVoice = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'voice-leave',
                payload: { from: userId },
            });
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        cleanup();
    }, [userId, cleanup]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            cleanup();
        };
    }, [cleanup]);

    return {
        isJoined,
        isMuted,
        peers,
        joinVoice,
        leaveVoice,
        toggleMute,
    };
}
