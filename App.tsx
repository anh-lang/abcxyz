import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ContractList } from './components/ContractList';
import { ContractForm } from './components/ContractForm';
import { Login } from './components/Login';
import { Contract, User, Role } from './types';
import { VEHICLE_DATA } from './constants';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";


// --- Components ---
const UserProfile: React.FC<{ user: User; onUpdateName: (newName: string) => void; onLogout: () => void; }> = ({ user, onUpdateName, onLogout }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.displayName);

    const handleSave = () => {
        if (name.trim()) {
            onUpdateName(name.trim());
        }
        setIsEditing(false);
    };
    
    return (
        <div className="absolute top-4 right-4 bg-white p-3 rounded-xl shadow-lg flex items-center space-x-4 border border-slate-200 z-10">
            {isEditing ? (
                <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    onBlur={handleSave}
                    className="px-2 py-1 border rounded-md text-sm"
                    autoFocus
                />
            ) : (
                <div>
                    <p className="font-semibold text-slate-800">{user.displayName}</p>
                    <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1 capitalize">{user.role}</p>
                </div>
            )}
            <div className="flex items-center space-x-1">
                {isEditing ? (
                    <button onClick={handleSave} className="text-sm text-green-600 hover:text-green-800 p-1">Lưu</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="text-sm text-indigo-600 hover:text-indigo-800 p-1">Sửa tên</button>
                )}
                 <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-800 p-1">Đăng xuất</button>
            </div>
        </div>
    );
}

const LoadingSpinner: React.FC = () => (
    <div className="min-h-screen flex justify-center items-center bg-slate-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);


// --- Main App Logic ---

type View = 'list' | 'add' | 'edit';
type ValidationError = { id: string; field: keyof Contract };

const calculateAndUpdateContract = (contract: Omit<Contract, 'id'>): Omit<Contract, 'id'> => {
    const basePrice = contract.sellingPrice;
    let currentDiscount = 0;

    if (contract.promo4percent) currentDiscount += basePrice * 0.04;
    if (contract.promo3percent) currentDiscount += basePrice * 0.03;
    if (contract.promoVf3Social && ['VF3', 'VF3 nâng cao'].includes(contract.vehicleType)) {
        currentDiscount += 3000000;
    }
    if (contract.promoVf3Fixed) currentDiscount += 6500000;
    if (contract.promoVf5Fixed) currentDiscount += 12000000;
    currentDiscount += contract.salespersonDiscount || 0;
    currentDiscount += contract.companyDiscount || 0;
    
    const finalCalculatedPrice = basePrice - currentDiscount;

    return {
        ...contract,
        totalDiscount: currentDiscount,
        finalPrice: finalCalculatedPrice,
    };
};


function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [view, setView] = useState<View>('list');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            let appUser: User;

            if (userSnap.exists()) {
                const userData = userSnap.data();
                appUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email!,
                    displayName: firebaseUser.displayName || userData.displayName,
                    role: userData.role
                };
            } else {
                // New user (likely via Google Sign-In)
                const newUserData = {
                    email: firebaseUser.email!,
                    displayName: firebaseUser.displayName || "New User",
                    role: Role.SALESPERSON
                };
                await setDoc(userRef, newUserData);
                appUser = { id: firebaseUser.uid, ...newUserData };
            }
            setCurrentUser(appUser);
        } else {
            setCurrentUser(null);
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchContracts(currentUser);
    } else {
      setContracts([]);
    }
  }, [currentUser]);

  const fetchContracts = async (user: User) => {
    setLoading(true);
    const contractsCollection = collection(db, "contracts");
    let q;
    if (user.role === Role.MANAGER) {
      q = query(contractsCollection);
    } else {
      q = query(contractsCollection, where("salespersonId", "==", user.id));
    }

    try {
        const querySnapshot = await getDocs(q);
        const fetchedContracts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Contract[];
        setContracts(fetchedContracts);
    } catch (error) {
        console.error("Error fetching contracts:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
      setAuthError(null);
      try {
          await signInWithEmailAndPassword(auth, email, pass);
      } catch (error: any) {
          setAuthError(error.message);
      }
  };

  const handleRegister = async (email: string, pass: string) => {
      setAuthError(null);
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const { user } = userCredential;
          
          const displayName = email.split('@')[0];
          await updateProfile(user, { displayName });

          const newUserDoc = {
              email: user.email,
              displayName: displayName,
              role: Role.SALESPERSON
          };
          await setDoc(doc(db, "users", user.uid), newUserDoc);

      } catch (error: any) {
          setAuthError(error.message);
      }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
  };

  const handleUpdateName = async (newName: string) => {
      if (!currentUser || !auth.currentUser) return;
      
      const userRef = doc(db, "users", currentUser.id);

      try {
          await updateProfile(auth.currentUser, { displayName: newName });
          await updateDoc(userRef, { displayName: newName });
          
          setCurrentUser(prev => prev ? { ...prev, displayName: newName } : null);

          // Optional: Update salespersonName in all their contracts for consistency
          const batch = writeBatch(db);
          const userContracts = contracts.filter(c => c.salespersonId === currentUser.id);
          userContracts.forEach(contract => {
              const contractRef = doc(db, "contracts", contract.id);
              batch.update(contractRef, { salespersonName: newName });
          });
          await batch.commit();

          // Refresh local state to reflect changes
          setContracts(prev => prev.map(c => c.salespersonId === currentUser.id ? { ...c, salespersonName: newName } : c));

      } catch (error) {
          console.error("Error updating name:", error);
      }
  };

  const handleSaveContract = async (contractToSave: Contract): Promise<boolean> => {
    if (!currentUser) return false;

    const isNew = !contracts.some(c => c.id === contractToSave.id);
    const currentErrors: ValidationError[] = [];

    const fieldsToValidate: (keyof Contract)[] = ['contractNumber', 'vehicleVin', 'vehicleEngineNumber'];
    
    fieldsToValidate.forEach(field => {
        const value = contractToSave[field];
        const trimmedValue = String(value || '').trim().toLowerCase();
        if (!trimmedValue) return;

        const isDuplicate = contracts.some(c => {
            const isDifferentContract = c.id !== contractToSave.id;
            return isDifferentContract && String(c[field] || '').trim().toLowerCase() === trimmedValue;
        });

        if (isDuplicate) {
            currentErrors.push({ id: contractToSave.id, field });
        }
    });

    setValidationErrors(prev => [
        ...prev.filter(e => e.id !== contractToSave.id),
        ...currentErrors
    ]);

    if (currentErrors.length > 0) {
      console.log("Validation failed:", currentErrors);
      return false;
    }
    
    // remove temporary id if it exists
    const { id, ...data } = contractToSave;
    let finalContractData = calculateAndUpdateContract(data);

    try {
      if (isNew) {
          if (currentUser.role === Role.SALESPERSON) {
              finalContractData = {
                  ...finalContractData,
                  salespersonId: currentUser.id,
                  salespersonName: currentUser.displayName,
              };
          }
          await addDoc(collection(db, "contracts"), finalContractData);
      } else {
          const contractRef = doc(db, "contracts", id);
          await updateDoc(contractRef, finalContractData);
      }
    } catch(error) {
      console.error("Error saving contract:", error);
      return false;
    }
    
    await fetchContracts(currentUser); // Re-fetch to get latest data
    setView('list');
    setEditingContract(null);
    return true;
  };
  
  const handleUpdateContractField = async (contractId: string, field: keyof Contract, value: any) => {
    // ... validation logic is the same ...
    const existingContract = contracts.find(c => c.id === contractId);
    if (!existingContract) return;

    const numberFields: (keyof Contract)[] = [
        'sellingPrice', 'vehicleProductionYear', 'salespersonDiscount', 
        'companyDiscount', 'totalDiscount', 'finalPrice', 
        'payment1', 'payment2', 'payment3'
    ];
    const processedValue = numberFields.includes(field) ? parseFloat(String(value)) || 0 : value;

    let updatedData: Partial<Contract> = { [field]: processedValue };

    if (field === 'vehicleType') {
      const vehicle = VEHICLE_DATA.find(v => v.name === value);
      if (vehicle) {
        updatedData.sellingPrice = vehicle.price;
      }
    }
    
    const tempUpdatedContract = { ...existingContract, ...updatedData };
    // FIX: Destructure id before calculation, as calculateAndUpdateContract returns an object without an id.
    const { id, ...dataToRecalculate } = tempUpdatedContract;
    const recalculatedData = calculateAndUpdateContract(dataToRecalculate);


    try {
      const contractRef = doc(db, "contracts", contractId);
      await updateDoc(contractRef, { ...updatedData, ...recalculatedData });
      await fetchContracts(currentUser!);
    } catch (error) {
      console.error("Error updating field: ", error);
    }
  };

  const handleClearValidationError = useCallback((id: string, field: keyof Contract) => {
    setValidationErrors(prev => prev.filter(e => !(e.id === id && e.field === field)));
  }, []);


  const handleShowAddForm = () => {
    if (currentUser?.role !== Role.SALESPERSON) return;
    setEditingContract(null);
    setValidationErrors([]);
    setView('add');
  };

  const handleShowEditForm = (contract: Contract) => {
    setEditingContract(contract);
    setValidationErrors([]);
    setView('edit');
  }

  const handleDeleteContract = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này không?')) {
        try {
            await deleteDoc(doc(db, "contracts", id));
            setContracts(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting contract: ", error);
        }
    }
  };
  
  const handleCancel = () => {
    setView('list');
    setEditingContract(null);
    setValidationErrors([]);
  };

  if (loading) {
      return <LoadingSpinner />;
  }

  if (!currentUser) {
      return <Login onLogin={handleLogin} onRegister={handleRegister} onGoogleSignIn={handleGoogleSignIn} authError={authError} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <UserProfile user={currentUser} onUpdateName={handleUpdateName} onLogout={handleLogout} />
      <div
        className={`transition-opacity duration-300 ease-in-out ${view !== 'list' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <ContractList 
            contracts={contracts} 
            currentUser={currentUser}
            onAddNew={handleShowAddForm} 
            onEdit={handleShowEditForm}
            onDelete={handleDeleteContract}
            onSaveNew={handleSaveContract}
            onUpdateField={handleUpdateContractField}
            validationErrors={validationErrors}
            onClearValidationError={handleClearValidationError}
        />
      </div>
      <div
        className={`transition-opacity duration-300 ease-in-out absolute top-0 left-0 w-full h-full overflow-y-auto ${view === 'list' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {(view === 'add' || view === 'edit') && (
          <ContractForm 
            onSave={handleSaveContract} 
            onCancel={handleCancel} 
            existingContract={editingContract}
            validationErrors={validationErrors}
            onClearValidationError={handleClearValidationError}
          />
        )}
      </div>
    </main>
  );
}

export default App;
