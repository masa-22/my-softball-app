import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, Timestamp } from 'firebase/firestore';

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface UserApproval {
  userId: string;
  email: string;
  approved: boolean;
  role?: UserRole; // 役割: viewer（閲覧者）、editor（編集者）、admin（管理者）
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

const USERS_COLLECTION = 'userApprovals';

/**
 * 新規登録時にユーザー情報をFirestoreに保存（承認待ち状態）
 */
export const createPendingUser = async (userId: string, email: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userData: UserApproval = {
      userId,
      email,
      approved: false,
      createdAt: Timestamp.now(),
    };
    await setDoc(userRef, userData);
  } catch (error) {
    console.error('Error creating pending user:', error);
    throw error;
  }
};

/**
 * ユーザーの承認状態を取得
 */
export const getUserApprovalStatus = async (userId: string): Promise<UserApproval | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserApproval;
    }
    return null;
  } catch (error) {
    console.error('Error getting user approval status:', error);
    return null;
  }
};

/**
 * 承認待ちユーザー一覧を取得
 */
export const getPendingUsers = async (): Promise<UserApproval[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('approved', '==', false)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      userId: doc.id,
    })) as UserApproval[];
  } catch (error) {
    console.error('Error getting pending users:', error);
    return [];
  }
};

/**
 * すべてのユーザー一覧を取得（管理者用）
 */
export const getAllUsers = async (): Promise<UserApproval[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      userId: doc.id,
    })) as UserApproval[];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

/**
 * ユーザーを承認する
 */
export const approveUser = async (userId: string, approvedBy: string, role: UserRole = 'viewer'): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      approved: true,
      role,
      approvedAt: Timestamp.now(),
      approvedBy,
    });
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  }
};

/**
 * ユーザーの役割を更新する（管理者用）
 */
export const updateUserRole = async (userId: string, role: UserRole, updatedBy: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      role,
      approvedAt: Timestamp.now(),
      approvedBy: updatedBy,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * ユーザーが管理者かどうかを確認する
 */
export const isAdmin = (userApproval: UserApproval | null): boolean => {
  return userApproval !== null && userApproval.approved === true && userApproval.role === 'admin';
};

/**
 * ユーザーが編集者または管理者かどうかを確認する
 */
export const canEdit = (userApproval: UserApproval | null): boolean => {
  if (!userApproval || !userApproval.approved) return false;
  return userApproval.role === 'editor' || userApproval.role === 'admin';
};

/**
 * ユーザーが閲覧可能かどうかを確認する
 */
export const canView = (userApproval: UserApproval | null): boolean => {
  return userApproval !== null && userApproval.approved === true;
};

/**
 * ユーザーの承認を取り消す（管理者用）
 */
export const rejectUser = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      approved: false,
      approvedAt: null,
      approvedBy: null,
    });
  } catch (error) {
    console.error('Error rejecting user:', error);
    throw error;
  }
};

/**
 * Firebase Consoleで作成されたユーザー用の承認レコードを作成または取得する
 * 承認レコードが存在しない場合は作成し、存在する場合は取得する
 */
export const createOrGetUserApproval = async (userId: string, email: string): Promise<UserApproval> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserApproval;
    }
    
    // 承認レコードが存在しない場合は作成
    const userData: UserApproval = {
      userId,
      email,
      approved: false,
      createdAt: Timestamp.now(),
    };
    await setDoc(userRef, userData);
    return userData;
  } catch (error) {
    console.error('Error creating or getting user approval:', error);
    throw error;
  }
};

