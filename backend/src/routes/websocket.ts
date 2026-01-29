import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { wsAuthHook } from '../middleware/wsAuth.js';
import { messageService } from '../services/messageService.js';
import { friendService } from '../services/friendService.js';
import { handleTypingEvent } from '../services/typingService.js';

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

// Broadcast a message to specific users
export function broadcastToUsers(userIds: string[], message: object) {
  const msgStr = JSON.stringify(message);
  for (const userId of userIds) {
    const socket = activeConnections.get(userId);
    if (socket && socket.readyState === 1) {
      socket.send(msgStr);
    }
  }
}

// Message types for WebSocket communication
interface IncomingMessage {
  type: 'message' | 'group-message' | 'typing' | 'read' |
        'call-offer' | 'call-answer' | 'call-ice-candidate' |
        'call-accept' | 'call-reject' | 'call-hangup';
  recipientId?: string;
  groupId?: string;  // For group messages
  encryptedContent?: string;
  fileIds?: string[];  // Optional file attachment IDs

  // Typing indicator fields
  conversationId?: string;
  isTyping?: boolean;

  // Call signaling fields
  callId?: string;
  sdp?: string;                              // SDP offer/answer as string
  candidate?: RTCIceCandidateInit;           // ICE candidate
  senderUsername?: string;                   // Caller's username for call notifications
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
  conversationId: string;
  isTyping: boolean;
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
            msg.encryptedContent,
            msg.fileIds
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
        } else if (msg.type === 'group-message') {
          // Group message
          if (!msg.groupId || !msg.encryptedContent) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'groupId and encryptedContent are required',
            } as ErrorMessage));
            return;
          }

          try {
            // Save to database
            const saved = await messageService.saveGroupMessage(
              userId,
              msg.groupId,
              msg.encryptedContent,
              msg.fileIds
            );

            // Get sender email for broadcast
            const userResult = await (await import('../db/index.js')).pool.query(
              `SELECT email FROM users WHERE id = $1`,
              [userId]
            );
            const senderEmail = userResult.rows[0]?.email || '';

            // Acknowledge to sender
            socket.send(JSON.stringify({
              type: 'group-message_ack',
              id: saved.id,
              groupId: msg.groupId,
              timestamp: saved.createdAt.toISOString(),
            }));

            // Broadcast to all group members (including sender for other devices)
            const memberIds = await messageService.getGroupMemberIds(msg.groupId);
            for (const memberId of memberIds) {
              if (memberId === userId) continue; // Don't send back to sender
              const memberSocket = activeConnections.get(memberId);
              if (memberSocket && memberSocket.readyState === 1) {
                memberSocket.send(JSON.stringify({
                  type: 'group-message',
                  id: saved.id,
                  groupId: msg.groupId,
                  senderId: userId,
                  senderEmail,
                  encryptedContent: saved.encryptedContent,
                  timestamp: saved.createdAt.toISOString(),
                }));
              }
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Failed to send group message';
            socket.send(JSON.stringify({
              type: 'error',
              message: errMsg,
            } as ErrorMessage));
          }
        } else if (msg.type === 'typing') {
          // Handle typing indicator with service
          if (!msg.recipientId || msg.conversationId === undefined || msg.isTyping === undefined) {
            return;
          }

          // Track typing state in service
          handleTypingEvent(msg.conversationId, userId, msg.isTyping);

          // Broadcast to recipient (for 1:1 conversations)
          const recipientSocket = activeConnections.get(msg.recipientId);
          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'typing',
              senderId: userId,
              conversationId: msg.conversationId,
              isTyping: msg.isTyping,
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
          // Forward call offer to recipient (sdp is optional - sent later during negotiation)
          fastify.log.info(`[CALL] call-offer from ${userId} to ${msg.recipientId}, callId: ${msg.callId}, hasSdp: ${!!msg.sdp}`);

          if (!msg.recipientId || !msg.callId) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'call-offer requires recipientId and callId',
            } as ErrorMessage));
            return;
          }

          const recipientSocket = activeConnections.get(msg.recipientId);
          fastify.log.info(`[CALL] Recipient ${msg.recipientId} socket exists: ${!!recipientSocket}, readyState: ${recipientSocket?.readyState}`);
          fastify.log.info(`[CALL] Active connections: ${Array.from(activeConnections.keys()).join(', ')}`);

          if (recipientSocket && recipientSocket.readyState === 1) {
            recipientSocket.send(JSON.stringify({
              type: 'call-offer',
              senderId: userId,
              senderUsername: msg.senderUsername || 'Unknown',
              callId: msg.callId,
              sdp: msg.sdp,  // May be undefined for initial call notification
            }));
            fastify.log.info(`[CALL] call-offer forwarded to ${msg.recipientId}`);
          } else {
            // Recipient offline - caller should handle timeout
            fastify.log.info(`[CALL] Recipient ${msg.recipientId} offline, sending call-error`);
            socket.send(JSON.stringify({
              type: 'call-error',
              callId: msg.callId,
              error: 'recipient_offline',
            }));
          }
        } else if (msg.type === 'call-answer') {
          // Forward SDP answer to caller
          fastify.log.info(`[CALL] call-answer from ${userId} to ${msg.recipientId}, callId: ${msg.callId}`);

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
            fastify.log.info(`[CALL] call-answer forwarded to ${msg.recipientId}`);
          } else {
            fastify.log.info(`[CALL] call-answer: recipient ${msg.recipientId} offline`);
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
          fastify.log.info(`[CALL] call-accept from ${userId} to ${msg.recipientId}, callId: ${msg.callId}`);

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
            fastify.log.info(`[CALL] call-accept forwarded to ${msg.recipientId}`);
          } else {
            fastify.log.info(`[CALL] call-accept: recipient ${msg.recipientId} offline`);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorInfo = (msg as any).error;
          fastify.log.info(`[CALL] call-hangup from ${userId} to ${msg.recipientId}, callId: ${msg.callId}, error: ${errorInfo || 'none'}`);

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
