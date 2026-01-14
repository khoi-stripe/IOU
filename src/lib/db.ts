import { getSupabase } from "./supabase";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  phone: string;
  display_name: string;
  pin_hash?: string;
  created_at: string;
}

export interface IOU {
  id: string;
  from_user_id: string;
  to_phone: string;
  to_user_id: string | null;
  description: string;
  photo_url: string | null;
  status: "pending" | "repaid";
  share_token: string;
  created_at: string;
  repaid_at: string | null;
  // Joined data
  from_user?: User;
  to_user?: User;
}

// User operations

// Check if a phone number is already registered and if it has a PIN
export async function checkPhoneExists(phone: string): Promise<{ exists: boolean; hasPin: boolean }> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_users")
    .select("id, pin_hash")
    .eq("phone", phone)
    .single();
  
  return {
    exists: !!data,
    hasPin: !!data?.pin_hash,
  };
}

// Create a new user with PIN (signup)
export async function createUser(phone: string, displayName: string, pin: string): Promise<User> {
  const supabase = getSupabase();
  
  // Check if phone already exists
  const exists = await checkPhoneExists(phone);
  if (exists) {
    throw new Error("Phone number already registered");
  }

  // Hash the PIN
  const pinHash = await bcrypt.hash(pin, 10);

  // Create new user
  const { data, error } = await supabase
    .from("iou_users")
    .insert({ phone, display_name: displayName, pin_hash: pinHash })
    .select()
    .single();

  if (error) throw error;
  const user = data as User;

  // Link any existing IOUs that reference this phone number
  await linkIOUsToUser(phone, user.id);

  return user;
}

// Verify user PIN and return user (login)
export async function verifyUser(phone: string, pin: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!data || !data.pin_hash) {
    return null;
  }

  const valid = await bcrypt.compare(pin, data.pin_hash);
  if (!valid) {
    return null;
  }

  // Link any existing IOUs that reference this phone number
  await linkIOUsToUser(phone, data.id);

  return data as User;
}

// Set PIN for existing user who doesn't have one
export async function setUserPin(phone: string, pin: string): Promise<User | null> {
  const supabase = getSupabase();
  
  // Hash the PIN
  const pinHash = await bcrypt.hash(pin, 10);

  const { data, error } = await supabase
    .from("iou_users")
    .update({ pin_hash: pinHash })
    .eq("phone", phone)
    .is("pin_hash", null)
    .select()
    .single();

  if (error || !data) return null;

  // Link any existing IOUs that reference this phone number
  await linkIOUsToUser(phone, data.id);

  return data as User;
}

// Link IOUs by phone to a user ID
async function linkIOUsToUser(phone: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("iou_ious")
    .update({ to_user_id: userId })
    .eq("to_phone", phone)
    .is("to_user_id", null);
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_users")
    .select("*")
    .eq("phone", phone)
    .single();

  return data as User | null;
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_users")
    .select("*")
    .eq("id", id)
    .single();

  return data as User | null;
}

// IOU operations
export async function createIOU(
  fromUserId: string,
  toPhone: string,
  description: string,
  photoUrl?: string
): Promise<IOU> {
  const supabase = getSupabase();
  // Check if toPhone matches an existing user
  const { data: toUser } = await supabase
    .from("iou_users")
    .select("id")
    .eq("phone", toPhone)
    .single();

  const { data, error } = await supabase
    .from("iou_ious")
    .insert({
      from_user_id: fromUserId,
      to_phone: toPhone,
      to_user_id: toUser?.id || null,
      description,
      photo_url: photoUrl || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as IOU;
}

export async function getIOUsByUser(userId: string): Promise<{ owed: IOU[]; owing: IOU[] }> {
  const supabase = getSupabase();
  const user = await getUserById(userId);
  if (!user) return { owed: [], owing: [] };

  // IOUs where this user owes someone
  const { data: owed } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("from_user_id", userId)
    .order("created_at", { ascending: false });

  // IOUs where this user is owed (by phone or userId)
  const { data: owingByUserId } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false });

  const { data: owingByPhone } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("to_phone", user.phone)
    .is("to_user_id", null)
    .order("created_at", { ascending: false });

  // Combine and deduplicate owing
  const owingMap = new Map<string, IOU>();
  [...(owingByUserId || []), ...(owingByPhone || [])].forEach((iou) => {
    owingMap.set(iou.id, iou as IOU);
  });

  return {
    owed: (owed || []) as IOU[],
    owing: Array.from(owingMap.values()),
  };
}

export async function getIOUById(id: string): Promise<IOU | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("id", id)
    .single();

  return data as IOU | null;
}

export async function getIOUByShareToken(token: string): Promise<IOU | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("share_token", token)
    .single();

  return data as IOU | null;
}

export async function markIOURepaid(id: string): Promise<IOU | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("iou_ious")
    .update({
      status: "repaid",
      repaid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .single();

  if (error) return null;
  return data as IOU;
}

export async function linkIOUToUser(iouId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("iou_ious")
    .update({ to_user_id: userId })
    .eq("id", iouId)
    .is("to_user_id", null);
}

// Helper to enrich IOU (already done via joins, but kept for compatibility)
export function enrichIOU(iou: IOU): IOU {
  return iou;
}
