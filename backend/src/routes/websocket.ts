import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { wsAuthHook } from '../middleware/wsAuth.js';
import { messageService } from '../services/messageService.js';
import { friendService } from '../services/friendService.js';

// WebRTC ICE candidate type (browser built-in, define for Node)
interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// Store active WebSocket connections by userId
// Exported so message service can access it for message delivery
export const activeConnections = new Map<string, WebSocket>();

// Message types for WebSocket communication
interface IncomingMessage {
  type: 'message' | 'typing' | 'read' |
        'call-offer' | 'call-answer' | 'call-ice-candidate' |
        'call-accept' | 'call-reject' | 'call-hangup';
  recipientId?: string;
  encryptedContent?: string;

  // Call signaling fields
  callId?: string;
  sdp?: string;                              // SDP offer/answer as string
  candidate?: RTCIceCandidateInit;           // ICE candidate
}

interface OutgoingMessage {
  type: 'message';
  id: number;
  senderId: string;
  encryptedContent: string;
  timestamp: string;
}

interface MessageAck {
  type: 'message_ack';
  id: number;
  timestamp: string;
}

interface TypingIndicator {
  type: 'typing';
  senderId: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes in this plugin
  fastify.addHook('preValidation', wsAuthHook);

  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const userId = request.user?.userId;

    if (!userId) {
      fastify.log.error('WebSocket connection without userId - should not happen after auth');
      socket.close(1008, 'Unauthorized');
      return;
    }

    // Store connection
    activeConnections.set(userId, socket);
    fastify.log.info(`User ${userId} connected via WebSocket`);

    // Handle incoming messages
    socket.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg: IncomingMessage = JSON.parse(data.toString());

        if (msg.type === 'message') {
          // Validate required fields
          if (!msg.recipientId || !msg.encryptedContent) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'recipientId and encryptedContent are required',
            } as ErrorMessage));
            return;
          }

          // Check if users are friends
          const areFriends = await friendService.areFriends(userId, msg.recipientId);
          if (!areFriends) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'You can only message friends',
            } as ErrorMessage));
            return;
          }

          // Save to database
          const saved = await messageService.saveMessage(
            userId,
            msg.recipientId,
            msg.encryptedContent
          );

          // Acknowledge to sender (include recipientId so client can match pending message)
          socket.send(JSON.stringify({
            type: 'message_ack',
            id: saved.id,
            recipientId: msg.recipientId,
            timestamp: saved.createdAt.toISOString(),
          }));

          // Forward to recipient if online
          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'message',
              id: saved.id,
              senderId: userId,
              encryptedContent: saved.encryptedContent,
              timestamp: saved.createdAt.toISOString(),
            } as OutgoingMessage));
            await messageService.markDelivered(saved.id);

            // Notify sender that message was delivered
            socket.send(JSON.stringify({
              type: 'delivered',
              messageId: saved.id,
              recipientId: msg.recipientId,
            }));
          }
        } else if (msg.type === 'typing') {
          // Forward typing indicator to recipient
          if (!msg.recipientId) {
            return;
          }
          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'typing',
              senderId: userId,
            } as TypingIndicator));
          }
        } else if (msg.type === 'read') {
          // Mark messages as read and notify sender
          if (!msg.recipientId) {
            return;
          }
          await messageService.markRead(userId, msg.recipientId);
          // Optionally notify the other user that their messages were read
          const senderSocket = activeConnections.get(msg.recipientId);
          if (senderSocket && senderSocket.readyState === 1) {
            senderSocket.send(JSON.stringify({
              type: 'read_receipt',
              readerId: userId,
            }));
          }
        }
        // ===== CALL SIGNALING HANDLERS =====
        else if (msg.type === 'call-offer') {
          // Forward SDP offer to recipient
          if (!msg.recipientId || !msg.callId || !msg.sdp) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-offer requires recipientId, callId, and sdp',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-offer',
              senderId: userId,
              callId: msg.callId,
              sdp: msg.sdp,
            }));
          } else {
            // Recipient offline - caller should handle timeout
            socket.send(JSON.stringify({
              type: 'call-error',
              callId: msg.callId,
              error: 'recipient_offline',
            }));
          }
        } else if (msg.type === 'call-answer') {
          // Forward SDP answer to caller
          if (!msg.recipientId || !msg.callId || !msg.sdp) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-answer requires recipientId, callId, and sdp',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-answer',
              senderId: userId,
              callId: msg.callId,
              sdp: msg.sdp,
            }));
          } else {
            socket.send(JSON.stringify({
              type: 'call-error',
              callId: msg.callId,
              error: 'recipient_offline',
            }));
          }
        } else if (msg.type === 'call-ice-candidate') {
          // Forward ICE candidate to peer
          if (!msg.recipientId || !msg.callId || !msg.candidate) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-ice-candidate requires recipientId, callId, and candidate',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-ice-candidate',
              senderId: userId,
              callId: msg.callId,
              candidate: msg.candidate,
            }));
          }
          // ICE candidates can be dropped silently if recipient offline
        } else if (msg.type === 'call-accept') {
          // Forward call acceptance to caller
          if (!msg.recipientId || !msg.callId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-accept requires recipientId and callId',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-accept',
              senderId: userId,
              callId: msg.callId,
            }));
          } else {
            socket.send(JSON.stringify({
              type: 'call-error',
              callId: msg.callId,
              error: 'recipient_offline',
            }));
          }
        } else if (msg.type === 'call-reject') {
          // Forward call rejection to caller
          if (!msg.recipientId || !msg.callId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-reject requires recipientId and callId',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-reject',
              senderId: userId,
              callId: msg.callId,
            }));
          }
          // If caller offline, rejection doesn't matter
        } else if (msg.type === 'call-hangup') {
          // Forward hangup to peer
          if (!msg.recipientId || !msg.callId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-hangup requires recipientId and callId',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-hangup',
              senderId: userId,
              callId: msg.callId,
            }));
          }
          // If peer offline, hangup doesn't matter
        }
      } catch (err) {
        fastify.log.error(err, 'WebSocket message handling error');
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        } as ErrorMessage));
      }
    });

    // Handle connection close
    socket.on('close', () => {
      activeConnections.delete(userId);
      fastify.log.info(`User ${userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      fastify.log.error(`WebSocket error for user ${userId}: ${error.message}`);
      activeConnections.delete(userId);
    });
  });
};

export default websocketRoutes;
