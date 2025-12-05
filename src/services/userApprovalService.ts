import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, Timestamp } from 'firebase/firestore';

export interface UserApproval {
  userId: string;
  email: string;
  approved: boolean;
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
export const approveUser = async (userId: string, approvedBy: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      approved: true,
      approvedAt: Timestamp.now(),
      approvedBy,
    });
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  }
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

