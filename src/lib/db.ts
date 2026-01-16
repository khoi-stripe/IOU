import { getSupabase } from "./supabase";
import bcrypt from "bcryptjs";
import { normalizePhone } from "./utils";

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
  to_phone: string | null;
  to_user_id: string | null;
  to_name: string | null; // Recipient name (shown until claimed)
  description: string | null;
  photo_url: string | null;
  status: "pending" | "repaid";
  share_token: string;
  created_at: string;
  repaid_at: string | null;
  // Joined data
  from_user?: User;
  to_user?: User;
}

export interface Contact {
  id: string | null; // User ID for pre-linking (null if not registered)
  phone: string;
  displayName: string | null;
  isRegistered: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  iou_id: string;
  type: "repaid" | "new_iou";
  message: string;
  created_at: string;
  acknowledged_at: string | null;
}

export interface Archive {
  id: string;
  user_id: string;
  iou_id: string;
  archived_at: string;
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
  const { exists } = await checkPhoneExists(phone);
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

// Upgrade user's PIN (verify old PIN, set new PIN)
export async function upgradeUserPin(
  userId: string,
  currentPin: string,
  newPin: string
): Promise<boolean> {
  const supabase = getSupabase();

  // Get user's current PIN hash
  const { data: user } = await supabase
    .from("iou_users")
    .select("pin_hash")
    .eq("id", userId)
    .single();

  if (!user || !user.pin_hash) {
    return false;
  }

  // Verify current PIN
  const isValid = await bcrypt.compare(currentPin, user.pin_hash);
  if (!isValid) {
    return false;
  }

  // Hash and set new PIN
  const newPinHash = await bcrypt.hash(newPin, 10);
  const { error } = await supabase
    .from("iou_users")
    .update({ pin_hash: newPinHash })
    .eq("id", userId);

  return !error;
}

// Link IOUs by phone to a user ID
async function linkIOUsToUser(phone: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const normalizedPhone = normalizePhone(phone);
  
  // Link IOUs matching the normalized phone
  if (normalizedPhone) {
    await supabase
      .from("iou_ious")
      .update({ to_user_id: userId })
      .eq("to_phone", normalizedPhone)
      .is("to_user_id", null);
  }
  
  // Also try with country code prefix in case old IOUs weren't normalized
  if (normalizedPhone && normalizedPhone.length === 10) {
    await supabase
      .from("iou_ious")
      .update({ to_user_id: userId })
      .eq("to_phone", "1" + normalizedPhone)
      .is("to_user_id", null);
  }
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
  options: {
    toUserId?: string | null;  // Pre-linked to known user
    toName?: string | null;    // Name for unclaimed IOUs
    toPhone?: string | null;   // Legacy: phone-based linking
    description: string | null;
    photoUrl?: string;
  }
): Promise<IOU> {
  const supabase = getSupabase();
  
  let finalToUserId: string | null = options.toUserId || null;
  
  // Legacy: Check if toPhone matches an existing user
  if (!finalToUserId && options.toPhone) {
    const { data: toUser } = await supabase
      .from("iou_users")
      .select("id")
      .eq("phone", options.toPhone)
      .single();
    finalToUserId = toUser?.id || null;
  }

  const { data, error } = await supabase
    .from("iou_ious")
    .insert({
      from_user_id: fromUserId,
      to_phone: options.toPhone || null,
      to_user_id: finalToUserId,
      to_name: options.toName || null,
      description: options.description,
      photo_url: options.photoUrl || null,
    })
    .select()
    .single();

  if (error) throw error;
  
  const iou = data as IOU;
  
  // Create notification for the person who is owed (if they're a registered user)
  if (finalToUserId) {
    const fromUser = await getUserById(fromUserId);
    const fromName = fromUser?.display_name || "Someone";
    const descText = options.description ? `: ${options.description}` : "";
    const message = `${fromName} owes you${descText}`;
    
    try {
      await createNotification(finalToUserId, iou.id, "new_iou", message);
    } catch (e) {
      // Don't fail the IOU creation if notification fails
      console.error("Failed to create notification:", e);
    }
  }
  
  return iou;
}

// Helper to enrich IOUs that have to_phone but no to_user with user data if the user now exists
async function enrichIOUsWithMissingUsers(ious: IOU[], supabase: ReturnType<typeof getSupabase>): Promise<IOU[]> {
  // Find IOUs that have to_phone but no to_user
  const phonesToLookup = ious
    .filter(iou => iou.to_phone && !iou.to_user)
    .map(iou => normalizePhone(iou.to_phone))
    .filter((phone): phone is string => phone !== null);
  
  if (phonesToLookup.length === 0) return ious;
  
  // Look up users by phone
  const { data: users } = await supabase
    .from("iou_users")
    .select("id, phone, display_name")
    .in("phone", [...new Set(phonesToLookup)]);
  
  if (!users || users.length === 0) return ious;
  
  // Create a map of normalized phone -> user
  const userByPhone = new Map(users.map(u => [u.phone, u]));
  
  // Enrich IOUs with user data
  return ious.map(iou => {
    if (iou.to_phone && !iou.to_user) {
      const normalizedPhone = normalizePhone(iou.to_phone);
      const user = normalizedPhone ? userByPhone.get(normalizedPhone) : null;
      if (user) {
        return {
          ...iou,
          to_user: { id: user.id, phone: user.phone, display_name: user.display_name } as User,
          to_user_id: user.id, // Also set this so it gets linked
        };
      }
    }
    return iou;
  });
}

export async function getIOUsByUser(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ owed: IOU[]; owing: IOU[]; hasMoreOwed: boolean; hasMoreOwing: boolean }> {
  const supabase = getSupabase();
  const user = await getUserById(userId);
  if (!user) return { owed: [], owing: [], hasMoreOwed: false, hasMoreOwing: false };

  const limit = options?.limit ?? 1000; // Default to large number if no limit
  const offset = options?.offset ?? 0;

  // IOUs where this user owes someone
  const { data: owed, count: owedCount } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `, { count: "exact" })
    .eq("from_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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

  // Combine and deduplicate owing, then apply pagination
  const owingMap = new Map<string, IOU>();
  [...(owingByUserId || []), ...(owingByPhone || [])].forEach((iou) => {
    owingMap.set(iou.id, iou as IOU);
  });
  
  const allOwing = Array.from(owingMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const paginatedOwing = allOwing.slice(offset, offset + limit);

  // Post-process: for IOUs with to_phone but no to_user, try to find the user
  const owedWithUsers = await enrichIOUsWithMissingUsers(owed || [], supabase);
  const owingWithUsers = await enrichIOUsWithMissingUsers(paginatedOwing, supabase);

  return {
    owed: owedWithUsers as IOU[],
    owing: owingWithUsers,
    hasMoreOwed: (owedCount ?? 0) > offset + limit,
    hasMoreOwing: allOwing.length > offset + limit,
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

export async function markIOURepaid(id: string, markedByUserId: string): Promise<IOU | null> {
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
  
  const iou = data as IOU;
  
  // Determine who marked it and notify the other party
  const isMarkedByOwer = iou.from_user_id === markedByUserId;
  const description = iou.description ? `: ${iou.description}` : "";
  
  try {
    if (isMarkedByOwer && iou.to_user_id) {
      // Ower marked it → notify owee
      const fromName = iou.from_user?.display_name || "Someone";
      const message = `${fromName} repaid you${description}`;
      await createNotification(iou.to_user_id, iou.id, "repaid", message);
    } else if (!isMarkedByOwer && iou.from_user_id) {
      // Owee marked it → notify ower
      const toName = iou.to_user?.display_name || "Someone";
      const message = `${toName} marked your IOU as repaid${description}`;
      await createNotification(iou.from_user_id, iou.id, "repaid", message);
    }
  } catch (e) {
    // Don't fail the repayment if notification fails
    console.error("Failed to create notification:", e);
  }
  
  return iou;
}

export async function linkIOUToUser(iouId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("iou_ious")
    .update({ to_user_id: userId })
    .eq("id", iouId)
    .is("to_user_id", null);
}

// Claim an IOU (for unclaimed IOUs shared via link)
export async function claimIOU(
  iouId: string, 
  claimingUserId: string
): Promise<{ success: boolean; error?: string; iou?: IOU }> {
  const supabase = getSupabase();
  
  // Get the IOU first to validate
  const { data: iou, error: fetchError } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .eq("id", iouId)
    .single();
  
  if (fetchError || !iou) {
    return { success: false, error: "IOU not found" };
  }
  
  // Can't claim your own IOU
  if (iou.from_user_id === claimingUserId) {
    return { success: false, error: "Cannot claim your own IOU" };
  }
  
  // Can't claim if already claimed
  if (iou.to_user_id) {
    return { success: false, error: "IOU has already been claimed" };
  }
  
  // Claim it
  const { data: updatedIOU, error: updateError } = await supabase
    .from("iou_ious")
    .update({ to_user_id: claimingUserId })
    .eq("id", iouId)
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .single();
  
  if (updateError) {
    return { success: false, error: "Failed to claim IOU" };
  }
  
  // Create notification for the creator
  const claimingUser = await getUserById(claimingUserId);
  const claimingName = claimingUser?.display_name || "Someone";
  const descText = iou.description ? `: ${iou.description}` : "";
  const message = `${claimingName} claimed your IOU${descText}`;
  
  try {
    await createNotification(iou.from_user_id, iouId, "new_iou", message);
  } catch (e) {
    console.error("Failed to create claim notification:", e);
  }
  
  return { success: true, iou: updatedIOU as IOU };
}

// Helper to enrich IOU (already done via joins, but kept for compatibility)
export function enrichIOU(iou: IOU): IOU {
  return iou;
}

// Get contacts for a user (people they've interacted with via IOUs)
export async function getContactsForUser(userId: string): Promise<Contact[]> {
  const supabase = getSupabase();
  const user = await getUserById(userId);
  if (!user) return [];

  // Get IOUs where this user owes someone (to get to_phone/to_user)
  const { data: owedIOUs } = await supabase
    .from("iou_ious")
    .select(`
      to_phone,
      to_user:iou_users!iou_ious_to_user_id_fkey(id, phone, display_name)
    `)
    .eq("from_user_id", userId);

  // Get IOUs where this user is owed (to get from_user)
  const { data: owingByUserId } = await supabase
    .from("iou_ious")
    .select(`
      from_user:iou_users!iou_ious_from_user_id_fkey(id, phone, display_name)
    `)
    .eq("to_user_id", userId);

  const { data: owingByPhone } = await supabase
    .from("iou_ious")
    .select(`
      from_user:iou_users!iou_ious_from_user_id_fkey(id, phone, display_name)
    `)
    .eq("to_phone", user.phone);

  // Helper to extract user from Supabase join (could be object or array)
  type JoinedUser = { id: string; phone: string; display_name: string } | { id: string; phone: string; display_name: string }[] | null;
  function extractUser(joined: JoinedUser): { id: string; phone: string; display_name: string } | null {
    if (!joined) return null;
    if (Array.isArray(joined)) return joined[0] || null;
    return joined;
  }

  // Build contacts map (keyed by normalized phone)
  const contactsMap = new Map<string, Contact>();
  const userPhoneNormalized = normalizePhone(user.phone);

  // From IOUs where user owes someone
  for (const iou of owedIOUs || []) {
    const rawPhone = iou.to_phone;
    const toUser = extractUser(iou.to_user as JoinedUser);
    const phone = normalizePhone(rawPhone) || normalizePhone(toUser?.phone);
    
    // Skip if no phone or self
    if (!phone || phone === userPhoneNormalized) continue;

    if (!contactsMap.has(phone)) {
      contactsMap.set(phone, {
        id: toUser?.id || null,
        phone,
        displayName: toUser?.display_name || null,
        isRegistered: !!toUser,
      });
    } else if (toUser && !contactsMap.get(phone)!.displayName) {
      // Update with name if we now have it
      contactsMap.set(phone, {
        id: toUser.id,
        phone,
        displayName: toUser.display_name,
        isRegistered: true,
      });
    }
  }

  // From IOUs where user is owed
  const owingIOUs = [...(owingByUserId || []), ...(owingByPhone || [])];
  for (const iou of owingIOUs) {
    const fromUser = extractUser(iou.from_user as JoinedUser);
    if (!fromUser) continue;
    
    const phone = normalizePhone(fromUser.phone);
    
    // Skip self or invalid
    if (!phone || phone === userPhoneNormalized) continue;

    if (!contactsMap.has(phone)) {
      contactsMap.set(phone, {
        id: fromUser.id,
        phone,
        displayName: fromUser.display_name,
        isRegistered: true,
      });
    }
  }

  // Enrich contacts that show as not registered - they may have registered since
  const unregisteredPhones = Array.from(contactsMap.values())
    .filter(c => !c.isRegistered)
    .map(c => c.phone);
  
  if (unregisteredPhones.length > 0) {
    // Look up users by phone number
    const { data: registeredUsers } = await supabase
      .from("iou_users")
      .select("id, phone, display_name")
      .in("phone", unregisteredPhones);
    
    if (registeredUsers && registeredUsers.length > 0) {
      for (const regUser of registeredUsers) {
        const normalizedPhone = normalizePhone(regUser.phone);
        if (normalizedPhone && contactsMap.has(normalizedPhone)) {
          contactsMap.set(normalizedPhone, {
            id: regUser.id,
            phone: normalizedPhone,
            displayName: regUser.display_name,
            isRegistered: true,
          });
        }
      }
    }
  }

  return Array.from(contactsMap.values());
}

// Notification operations
export async function createNotification(
  userId: string,
  iouId: string,
  type: "repaid" | "new_iou",
  message: string
): Promise<Notification> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("iou_notifications")
    .insert({
      user_id: userId,
      iou_id: iouId,
      type,
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function getUnacknowledgedNotifications(userId: string): Promise<Notification[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("iou_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false });

  return (data || []) as Notification[];
}

export async function acknowledgeNotification(id: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  // Only acknowledge if the notification belongs to this user (prevents IDOR)
  await supabase
    .from("iou_notifications")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function acknowledgeAllNotifications(userId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("iou_notifications")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("acknowledged_at", null);
}

// Archive operations

export async function archiveIOU(userId: string, iouId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  // Check if already archived
  const { data: existing } = await supabase
    .from("iou_archives")
    .select("id")
    .eq("user_id", userId)
    .eq("iou_id", iouId)
    .single();
  
  if (existing) {
    return true; // Already archived
  }
  
  const { error } = await supabase
    .from("iou_archives")
    .insert({
      user_id: userId,
      iou_id: iouId,
    });
  
  return !error;
}

export async function unarchiveIOU(userId: string, iouId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from("iou_archives")
    .delete()
    .eq("user_id", userId)
    .eq("iou_id", iouId);
  
  return !error;
}

export async function getArchivedIOUs(userId: string): Promise<IOU[]> {
  const supabase = getSupabase();
  
  // Get archived IOU IDs for this user
  const { data: archives } = await supabase
    .from("iou_archives")
    .select("iou_id")
    .eq("user_id", userId)
    .order("archived_at", { ascending: false });
  
  if (!archives || archives.length === 0) {
    return [];
  }
  
  const iouIds = archives.map(a => a.iou_id);
  
  // Fetch the actual IOUs
  const { data: ious } = await supabase
    .from("iou_ious")
    .select(`
      *,
      from_user:iou_users!iou_ious_from_user_id_fkey(*),
      to_user:iou_users!iou_ious_to_user_id_fkey(*)
    `)
    .in("id", iouIds);
  
  // Sort by archive order (reverse chron)
  const iouMap = new Map((ious || []).map(iou => [iou.id, iou]));
  return iouIds.map(id => iouMap.get(id)).filter(Boolean) as IOU[];
}

export async function getArchivedIOUIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from("iou_archives")
    .select("iou_id")
    .eq("user_id", userId);
  
  return new Set((data || []).map(a => a.iou_id));
}
