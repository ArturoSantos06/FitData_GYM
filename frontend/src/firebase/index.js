// Export Firebase configuration
export { auth, db, storage } from './config';

// Export Auth services
export {
  loginUser,
  registerUser,
  logoutUser,
  onAuthChanged,
  getCurrentUser
} from './auth';

// Export Firestore services
export {
  // Users
  createUser,
  getUser,
  updateUser,
  
  // Members
  getMembers,
  getMemberByUserId,
  createMember,
  
  // Memberships
  getUserMemberships,
  createMembership,
  
  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Attendance
  createAttendance,
  updateAttendanceCheckout,
  
  // Sales
  createSale,
  getSales
} from './firestore';

// Export Storage services
export {
  uploadImage,
  deleteImage,
  uploadProductImage,
  uploadMembershipImage,
  uploadMemberAvatar
} from './storage';
