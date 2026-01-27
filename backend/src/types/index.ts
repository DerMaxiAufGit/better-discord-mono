export interface User {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  username: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

export interface PublicKeyResponse {
  userId: string;
  publicKey: string | null;
}

export interface Message {
  id: number;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface MessageHistoryResponse {
  messages: Message[];
  hasMore: boolean;
}
