import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface University {
  id: string;
  name: string;
  country?: string;
  city?: string;
}

interface Domain {
  id: string;
  name: string;
}

interface Filiere {
  id: string;
  name: string;
}

interface Student {
  id: string;
  nom_prenom: string;
  email?: string;
  student_id?: string;
}

interface User {
  user_id: string;
  email: string;
  university_id: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  universities: University[];
  domains: Domain[];
  filieres: Filiere[];
  students: Student[];
  selectedUniversity: University | null;
  selectedDomain: Domain | null;
  selectedFiliere: Filiere | null;
  selectedStudent: Student | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, birthdate?: string) => Promise<void>;
  logout: () => void;
  loadDomains: () => Promise<void>;
  loadFilieres: (domainId: string) => Promise<void>;
  loadStudents: (filiereId: string) => Promise<void>;
  setSelectedUniversity: (university: University | null) => void;
  setSelectedDomain: (domain: Domain | null) => void;
  setSelectedFiliere: (filiere: Filiere | null) => void;
  setSelectedStudent: (student: Student | null) => void;
  loadUniversities: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<Filiere | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const userData: User = {
        user_id: data.user_id,
        email,
        university_id: data.university_id,
      };

      setUser(userData);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
      localStorage.setItem('password', password);
      await loadDomains();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, birthdate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, birthdate }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
      }

      localStorage.setItem('password', password);
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('password');
    setDomains([]);
    setFilieres([]);
    setStudents([]);
    setSelectedUniversity(null);
    setSelectedDomain(null);
    setSelectedFiliere(null);
    setSelectedStudent(null);
  };

  const loadUniversities = async () => {
    try {
      const response = await fetch(`${API_URL}/api/universities`);
      if (response.ok) {
        const data = await response.json();
        setUniversities(data);
      }
    } catch (err) {
      console.error('Failed to load universities:', err);
    }
  };

  const loadDomains = async () => {
    if (!token || !user) return;
    try {
      const response = await fetch(`${API_URL}/api/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      } else if (response.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  };

  const loadFilieres = async (domainId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/domains/${domainId}/filieres`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFilieres(data);
        setSelectedFiliere(null);
        setStudents([]);
        setSelectedStudent(null);
      } else if (response.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Failed to load filieres:', err);
    }
  };

  const loadStudents = async (filiereId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/filieres/${filiereId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data);
        setSelectedStudent(null);
      } else if (response.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleSetSelectedUniversity = (university: University | null) => {
    setSelectedUniversity(university);
    if (!university) {
      setSelectedDomain(null);
      setSelectedFiliere(null);
      setSelectedStudent(null);
    }
  };

  const handleSetSelectedDomain = (domain: Domain | null) => {
    setSelectedDomain(domain);
    if (domain) {
      loadFilieres(domain.id);
    } else {
      setFilieres([]);
      setSelectedFiliere(null);
    }
  };

  const handleSetSelectedFiliere = (filiere: Filiere | null) => {
    setSelectedFiliere(filiere);
    if (filiere) {
      loadStudents(filiere.id);
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  };

  useEffect(() => {
    // On mount, restore token and user from localStorage
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
        // Load domains with the restored token
        (async () => {
          try {
            const response = await fetch(`${API_URL}/api/domains`, {
              headers: { Authorization: `Bearer ${savedToken}` },
            });
            if (response.ok) {
              const data = await response.json();
              setDomains(data);
            } else if (response.status === 401) {
              // Token is invalid, clear it
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              setUser(null);
              setToken(null);
            }
          } catch (err) {
            console.error('Failed to load domains:', err);
          }
        })();
      } catch (err) {
        console.error('Failed to restore auth state:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    loadUniversities().finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        universities,
        domains,
        filieres,
        students,
        selectedUniversity,
        selectedDomain,
        selectedFiliere,
        selectedStudent,
        login,
        register,
        logout,
        loadDomains,
        loadFilieres,
        loadStudents,
        loadUniversities,
        setSelectedUniversity: handleSetSelectedUniversity,
        setSelectedDomain: handleSetSelectedDomain,
        setSelectedFiliere: handleSetSelectedFiliere,
        setSelectedStudent: setSelectedStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
