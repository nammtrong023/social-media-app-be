import { Comment, Message, Post, User } from '@prisma/client';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  id: string;
  email: string;
};

export type UserType = {
  email: string;
  name: string;
};

export type JwtPayloadWithRtToken = JwtPayload & { refreshToken: string };
export type JwtPayloadWithAtToken = JwtPayload & { accessToken: string };
export type JwtPayloadWithTokens = JwtPayload & Tokens;

export type FilterType = {
  itemsPerPage?: number;
  page?: number;
  search?: string;
};

type PaginationType = {
  total: number;
  currentPage?: number;
  itemsPerPage?: number;
};

export type PostPaginationType = PaginationType & {
  data: Post[];
};

export type UserPaginationType = PaginationType & {
  data: User[];
};

export type CommentPaginationType = PaginationType & {
  data: Comment[];
};

export type MessagePaginationType = {
  data: Message[];
  nextCursor: string | null;
};
