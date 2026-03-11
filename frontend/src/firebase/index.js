// Export Firebase configuration
export { auth, db, storage } from './config';

// Export Auth services
export {
  loginUser,
  registerUser,
  createUserWithoutSessionChange,
  registerClientByAdmin,
  updateClientEmailInAuth,
  logoutUser,
  onAuthChanged,
  getCurrentUser
} from './auth';

// Export Firestore services
export {
  // Users
  createUser,
  getUser,
  getUserByEmail,
  getUserByAuthUid,
  getUsers,
  updateUser,
  
  // Members
  getMembers,
  getAllMembers,
  getMemberByUserId,
  getMemberByAuthUid,
  getMemberByEmail,
  createMember,
  updateMemberPhoneByUserId,
  updateMemberEmailByUserId,
  updateMembershipEmailByUserId,
  
  // Memberships
  getUserMemberships,
  getUserMembershipsByAuthUid,
  createMembership,
  assignMembership,
  
  // Membership Types
  getMembershipTypes,
  createMembershipType,
  updateMembershipType,
  deleteMembershipType,
  
  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Inventory
  getInventoryEntries,
  createInventoryEntry,
  
  // Attendance
  createAttendance,
  updateAttendanceCheckout,
  getMemberByQRCode,
  checkInMember,
  checkOutMember,
  getAttendances,
  
  // Sales
  createSale,
  createMembershipSale,
  getSaleByFolio,
  getSales,
  
  // Health Profiles
  createHealthProfile,
  getHealthProfileByMemberId,
  
  // Trainer Notes
  createTrainerNote,
  getTrainerNotesByMember,
  getAllTrainerNotes,
  updateTrainerNote,
  deleteTrainerNote
} from './firestore';

// Export Storage services
export {
  uploadImage,
  deleteImage,
  uploadProductImage,
  uploadMembershipImage,
  uploadMemberAvatar
} from './storage';
