// Export Firebase configuration
export { auth, db, storage } from './config';

// Export Auth services
export {
  loginUser,
  registerUser,
  createUserWithoutSessionChange,
  registerClientByAdmin,
  registerTrainerByAdmin,
  deactivateTrainerByAdmin,
  reactivateTrainerByAdmin,
  registerNutriologoByAdmin,
  ensureUserClaim,
  updateSelfProfile,
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
  updateMemberByUserId,
  getMemberByAuthUid,
  getMemberByEmail,
  createMember,
  
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
  createTrainerPayment,
  getTrainerPayments,
  getSaleByFolio,
  getSales,
  
  // Health Profiles
  createHealthProfile,
  getHealthProfileByMemberId,
  
  // Trainer Notes
  searchExerciseCatalog,
  createOrUpdateTrainerRoutine,
  getTrainerRoutineByMember,
  subscribeTrainerRoutineByMember,
  getAllTrainerRoutines,
  deleteTrainerRoutineByMember,
  createTrainerNote,
  getTrainerNotesByMember,
  getAllTrainerNotes,
  getAllClientTrainerAssignments,
  updateTrainerNote,
  deleteTrainerNote
} from './firestore';

// Export Diet File services (re-export from firestore)
export {
  getAllDietFiles,
  getDietFilesByMember,
  createDietFileRecord,
  deleteDietFileRecord
} from './firestore';

// Export Nutritionist Assignment services
export {
  assignNutritionistToClient,
  getClientNutritionistAssignment,
  removeNutritionistFromClient
} from './firestore';

// Export Nutritionist Review services
export {
  addNutritionistReview,
  getNutritionistReviews
} from './firestore';

// Export Trainer Assignment services
export {
  createTrainerServiceSale,
  getTrainerServiceSales,
  completeTrainerServicePayment,
  assignTrainerToClient,
  getClientTrainerAssignment,
  removeTrainerFromClient,
  hasClientPaidTrainerService
} from './firestore';

// Export Trainer Review services
export {
  addTrainerReview,
  getTrainerReviews,
  waitForAuthReady
} from './firestore';

// Export Storage services
export {
  uploadImage,
  deleteImage,
  uploadProductImage,
  uploadMembershipImage,
  uploadMemberAvatar,
  uploadRoutineAttachment
} from './storage';

export {
  uploadDietDocument,
  downloadDietDocument
} from './storage';


