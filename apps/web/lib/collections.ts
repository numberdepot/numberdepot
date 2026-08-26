import { Collection } from 'mongodb';
import { getDb } from './db';
import type { UserDoc, NumberDoc, OrderDoc, PaymentDoc, UserNumberDoc, SettingsDoc, OfferDoc, NotificationDoc, FaqDoc, ContentPageDoc, BlogPostDoc } from './types/db';

export async function getNumbersCollection(): Promise<Collection<NumberDoc>> {
  const db = await getDb();
  return db.collection<NumberDoc>('numbers');
}

export async function getOrdersCollection(): Promise<Collection<OrderDoc>> {
  const db = await getDb();
  return db.collection<OrderDoc>('orders');
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  return db.collection<UserDoc>('users');
}

export async function getPaymentsCollection(): Promise<Collection<PaymentDoc>> {
  const db = await getDb();
  return db.collection<PaymentDoc>('payments');
}

export async function getUserNumbersCollection(): Promise<Collection<UserNumberDoc>> {
  const db = await getDb();
  return db.collection<UserNumberDoc>('user_numbers');
}

export async function getSettingsCollection(): Promise<Collection<SettingsDoc>> {
  const db = await getDb();
  return db.collection<SettingsDoc>('settings');
}

export async function getOffersCollection(): Promise<Collection<OfferDoc>> {
  const db = await getDb();
  return db.collection<OfferDoc>('offers');
}

export async function getNotificationsCollection(): Promise<Collection<NotificationDoc>> {
  const db = await getDb();
  return db.collection<NotificationDoc>('notifications');
}

export async function getFaqsCollection(): Promise<Collection<FaqDoc>> {
  const db = await getDb();
  return db.collection<FaqDoc>('faqs');
}

export async function getContentPagesCollection(): Promise<Collection<ContentPageDoc>> {
  const db = await getDb();
  return db.collection<ContentPageDoc>('content_pages');
}

export async function getBlogPostsCollection(): Promise<Collection<BlogPostDoc>> {
  const db = await getDb();
  return db.collection<BlogPostDoc>('blog_posts');
}
