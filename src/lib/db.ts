import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data.json");

export interface User {
  id: string;
  phone: string;
  displayName: string;
  createdAt: string;
}

export interface IOU {
  id: string;
  fromUserId: string;
  toPhone: string;
  toUserId: string | null;
  description: string;
  photoUrl: string | null;
  status: "pending" | "repaid";
  shareToken: string;
  createdAt: string;
  repaidAt: string | null;
}

interface Database {
  users: User[];
  ious: IOU[];
}

function getDb(): Database {
  if (!existsSync(DB_PATH)) {
    return { users: [], ious: [] };
  }
  const data = readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
}

function saveDb(db: Database): void {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// User operations
export function createUser(phone: string, displayName: string): User {
  const db = getDb();
  const existing = db.users.find((u) => u.phone === phone);
  if (existing) {
    // Update name if different
    existing.displayName = displayName;
    saveDb(db);
    return existing;
  }
  
  const user: User = {
    id: generateId(),
    phone,
    displayName,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export function getUserByPhone(phone: string): User | null {
  const db = getDb();
  return db.users.find((u) => u.phone === phone) || null;
}

export function getUserById(id: string): User | null {
  const db = getDb();
  return db.users.find((u) => u.id === id) || null;
}

// IOU operations
export function createIOU(
  fromUserId: string,
  toPhone: string,
  description: string,
  photoUrl?: string
): IOU {
  const db = getDb();
  
  // Check if toPhone matches an existing user
  const toUser = db.users.find((u) => u.phone === toPhone);
  
  const iou: IOU = {
    id: generateId(),
    fromUserId,
    toPhone,
    toUserId: toUser?.id || null,
    description,
    photoUrl: photoUrl || null,
    status: "pending",
    shareToken: generateId(),
    createdAt: new Date().toISOString(),
    repaidAt: null,
  };
  db.ious.push(iou);
  saveDb(db);
  return iou;
}

export function getIOUsByUser(userId: string): { owed: IOU[]; owing: IOU[] } {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { owed: [], owing: [] };
  
  // IOUs where this user owes someone
  const owed = db.ious.filter((i) => i.fromUserId === userId);
  
  // IOUs where this user is owed (by phone or userId)
  const owing = db.ious.filter(
    (i) => i.toUserId === userId || i.toPhone === user.phone
  );
  
  return { owed, owing };
}

export function getIOUById(id: string): IOU | null {
  const db = getDb();
  return db.ious.find((i) => i.id === id) || null;
}

export function getIOUByShareToken(token: string): IOU | null {
  const db = getDb();
  return db.ious.find((i) => i.shareToken === token) || null;
}

export function markIOURepaid(id: string): IOU | null {
  const db = getDb();
  const iou = db.ious.find((i) => i.id === id);
  if (!iou) return null;
  
  iou.status = "repaid";
  iou.repaidAt = new Date().toISOString();
  saveDb(db);
  return iou;
}

export function linkIOUToUser(iouId: string, userId: string): void {
  const db = getDb();
  const iou = db.ious.find((i) => i.id === iouId);
  if (iou && !iou.toUserId) {
    iou.toUserId = userId;
    saveDb(db);
  }
}

// Helper to get user info for display
export function enrichIOU(iou: IOU): IOU & { fromUser?: User; toUser?: User } {
  const db = getDb();
  const fromUser = db.users.find((u) => u.id === iou.fromUserId);
  const toUser = iou.toUserId 
    ? db.users.find((u) => u.id === iou.toUserId) 
    : db.users.find((u) => u.phone === iou.toPhone);
  
  return { ...iou, fromUser, toUser };
}

