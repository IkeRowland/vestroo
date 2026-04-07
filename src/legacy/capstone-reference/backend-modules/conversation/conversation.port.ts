// Reference module (legacy import path removed).
import {
  ICreateConversation,
  IUpdateConversation,
} from 'src/modules/conversation/conversation.dto';
import { ConversationDocument } from 'src/modules/conversation/conversation.schema';

export interface IConversationRepository {
  create(data: ICreateConversation): Promise<ConversationDocument>;
  getConversation(query: any, select: string[]): Promise<ConversationDocument>;
  getListConversation(query: any, select: string[]): Promise<ConversationDocument[]>;
  getConversationById(id: string): Promise<ConversationDocument>;
  getUserConversations(userId: string): Promise<ConversationDocument[]>;
  updateConversation(id: string, data: IUpdateConversation): Promise<ConversationDocument>;
  openConversation(id: string): Promise<boolean>;
  closeConversation(id: string): Promise<boolean>;
  cancelConversation(id: string): Promise<boolean>;
  addMessage(id: string, senderId: string, content: string): Promise<ConversationDocument>;
}

export interface IConversationService {
  createConversation(data: ICreateConversation): Promise<ConversationDocument>;
  getConversationByTripId(tripId: string): Promise<ConversationDocument>;
  getConversationById(id: string, userId: string): Promise<ConversationDocument>;
  getPersonalConversations(userId: string): Promise<ConversationDocument[]>;
  closeConversation(id: string): Promise<boolean>;
  addMessage(id: string, senderId: string, content: string): Promise<ConversationDocument>;
}
