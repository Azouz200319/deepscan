import { createContext, useContext, useState, ReactNode } from 'react';

export interface StudentData {
  id: string;
  nom_prenom: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  type_diplome: string | null;
  domaine: string | null;
  filiere: string | null;
  specialite: string | null;
  etablissement: string | null;
  source?: string | null;
  verify_status?: string | null;
  verified_at?: string | null;
  extracted_fields?: Record<string, string | null> | null;
  verify_diff_json?: string | null;
}

interface StudentOverlayContextType {
  isOpen: boolean;
  student: StudentData | null;
  openOverlay: (studentData: StudentData) => void;
  closeOverlay: () => void;
}

const StudentOverlayContext = createContext<StudentOverlayContextType | undefined>(undefined);

export function StudentOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);

  const openOverlay = (studentData: StudentData) => {
    setStudent(studentData);
    setIsOpen(true);
  };

  const closeOverlay = () => {
    setIsOpen(false);
    setTimeout(() => setStudent(null), 500);
  };

  return (
    <StudentOverlayContext.Provider value={{ isOpen, student, openOverlay, closeOverlay }}>
      {children}
    </StudentOverlayContext.Provider>
  );
}

export function useStudentOverlay() {
  const context = useContext(StudentOverlayContext);
  if (!context) {
    throw new Error('useStudentOverlay must be used within StudentOverlayProvider');
  }
  return context;
}
