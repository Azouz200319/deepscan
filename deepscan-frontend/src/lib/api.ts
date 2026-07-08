const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
}

function getAuthHeadersWithContentType(): HeadersInit {
  return {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
  };
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText || 'Request failed');
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export async function scanDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/scan`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function ocrOnly(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/ocr-only`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function extractFields(ocrText: string) {
  const formData = new FormData();
  formData.append('ocr_text', ocrText);
  const res = await fetch(`${API_URL}/api/extract`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function getRecords(params: { search?: string; status?: string; domain_id?: string; filiere_id?: string; student_id?: string; university_id?: string; page?: number; per_page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.domain_id) query.set('domain_id', params.domain_id);
  if (params.filiere_id) query.set('filiere_id', params.filiere_id);
  if (params.student_id) query.set('student_id', params.student_id);
  if (params.university_id) query.set('university_id', params.university_id);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  const res = await fetch(`${API_URL}/api/records?${query}`, {
    headers: getAuthHeadersWithContentType(),
    cache: 'no-store',
  });
  return readJsonResponse<{ records: any[]; total: number; page: number; per_page: number; pages: number; stats: any }>(res);
}

export async function createRecord(record: Record<string, string | null>) {
  const res = await fetch(`${API_URL}/api/records`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function updateRecord(id: string, record: Record<string, string | null>) {
  const res = await fetch(`${API_URL}/api/records/${id}`, {
    method: 'PUT',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(record),
  });
  return res.json();
}

export async function deleteRecord(id: string) {
  const res = await fetch(`${API_URL}/api/records/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function saveExtraction(fields: Record<string, string | null>, ocrText: string, source: string = 'OCR') {
  const formData = new FormData();
  formData.append('fields', JSON.stringify(fields));
  formData.append('ocr_text', ocrText);
  formData.append('source', source);
  const res = await fetch(`${API_URL}/api/records/save-extraction`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function manualOcr(file: File, regions: Record<string, number[]>) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('regions', JSON.stringify(regions));
  const res = await fetch(`${API_URL}/api/manual-ocr`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function verifyRecords(recordId?: string) {
  const formData = new FormData();
  if (recordId) formData.append('record_id', recordId);
  const res = await fetch(`${API_URL}/api/verify`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function verifySingleFields(fields: Record<string, string | null>) {
  const formData = new FormData();
  formData.append('fields', JSON.stringify(fields));
  const res = await fetch(`${API_URL}/api/verify/single`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function getDashboardStats() {
  const res = await fetch(`${API_URL}/api/dashboard/stats`, {
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

// --- Staging (Results Before Verification) ---
export async function getStaging(page: number = 1, perPage: number = 50) {
  const res = await fetch(`${API_URL}/api/staging?page=${page}&per_page=${perPage}`, {
    headers: getAuthHeadersWithContentType(),
    cache: 'no-store',
  });
  return readJsonResponse<{ records: any[]; total: number; page: number; pages: number }>(res);
}

export async function saveStagingVerification(
  stagingId: string,
  payload: { verify_status: string; name_score?: number | null; diff?: string[] },
) {
  const res = await fetch(`${API_URL}/api/staging/${stagingId}/verification`, {
    method: 'PATCH',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify({
      verify_status: payload.verify_status,
      name_score: payload.name_score ?? null,
      diff: payload.diff ?? [],
    }),
  });
  return readJsonResponse<{ success: boolean; id: string }>(res);
}

export async function saveToStaging(
  fields: Record<string, string | null>,
  ocrText: string = '',
  source: string = 'OCR',
  options: { filiereId?: string | null; studentId?: string | null } = {},
) {
  const formData = new FormData();
  formData.append('fields', JSON.stringify(fields));
  formData.append('ocr_text', ocrText);
  formData.append('source', source);
  if (options.filiereId) formData.append('filiere_id', options.filiereId);
  if (options.studentId) formData.append('student_id', options.studentId);
  const res = await fetch(`${API_URL}/api/staging`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return readJsonResponse<{ id: string; message: string }>(res);
}

export async function promoteStaging(stagingId: string) {
  const res = await fetch(`${API_URL}/api/staging/${stagingId}/promote`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
  });
  return readJsonResponse<{ id: string; message: string }>(res);
}

export async function deleteStaging(stagingId: string) {
  const res = await fetch(`${API_URL}/api/staging/${stagingId}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return readJsonResponse<{ message: string }>(res);
}

// --- History (Deletion Archive) ---
export async function getHistory(params: { status?: string; page?: number; per_page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  const res = await fetch(`${API_URL}/api/history?${query}`, {
    headers: getAuthHeadersWithContentType(),
    cache: 'no-store',
  });
  return readJsonResponse<{ records: any[]; total: number; page: number; pages: number }>(res);
}

export async function restoreFromHistory(historyId: string) {
  const res = await fetch(`${API_URL}/api/history/${historyId}/restore`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

// --- Organization Structure ---
export async function createUniversity(name: string, country: string = '', city: string = '') {
  const res = await fetch(`${API_URL}/api/universities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, country, city }),
  });
  return res.json();
}

export async function createDomain(name: string) {
  const res = await fetch(`${API_URL}/api/domains`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function createFiliere(domainId: string, name: string) {
  const res = await fetch(`${API_URL}/api/domains/${domainId}/filieres`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function createStudent(filiereId: string, nomPrenom: string, email?: string) {
  const res = await fetch(`${API_URL}/api/filieres/${filiereId}/students`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify({ nom_prenom: nomPrenom, email }),
  });
  return res.json();
}

export async function deleteUniversity(id: string) {
  const res = await fetch(`${API_URL}/api/universities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function deleteDomain(id: string) {
  const res = await fetch(`${API_URL}/api/domains/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function deleteFiliere(domainId: string, id: string) {
  const res = await fetch(`${API_URL}/api/domains/${domainId}/filieres/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

// --- LLM Configuration ---
export async function getLlmConfig() {
  const res = await fetch(`${API_URL}/api/llm/config`);
  return res.json();
}

export async function updateLlmConfig(config: {
  provider?: string;
  ollama_url?: string;
  ollama_model?: string;
  groq_api_key?: string;
  groq_model?: string;
}) {
  const formData = new FormData();
  if (config.provider) formData.append('provider', config.provider);
  if (config.ollama_url) formData.append('ollama_url', config.ollama_url);
  if (config.ollama_model) formData.append('ollama_model', config.ollama_model);
  if (config.groq_api_key) formData.append('groq_api_key', config.groq_api_key);
  if (config.groq_model) formData.append('groq_model', config.groq_model);
  const res = await fetch(`${API_URL}/api/llm/config`, { method: 'POST', body: formData });
  return res.json();
}

// --- Forgery Detection ---
export async function analyzeForensics(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/forensics/analyze`, {
    method: 'POST',
    headers: getAuthHeaders() as any,
    body: formData,
  });
  return res.json();
}

export async function saveForgeryReport(report: {
  filename: string;
  verdict: string;
  score: number;
  results_json: string;
}) {
  const res = await fetch(`${API_URL}/api/forensics/report`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(report),
  });
  return res.json();
}

export async function getForgeryReports() {
  const res = await fetch(`${API_URL}/api/forensics/reports`, {
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function deleteForgeryReport(reportId: string) {
  const res = await fetch(`${API_URL}/api/forensics/reports/${reportId}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}

// --- Audit Sessions ---
export async function saveAuditSession(data: { name?: string; results: any[] }) {
  const res = await fetch(`${API_URL}/api/audit/session`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getAuditSessions() {
  const res = await fetch(`${API_URL}/api/audit/sessions`, {
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function getAuditSessionDetails(sessionId: string) {
  const res = await fetch(`${API_URL}/api/audit/sessions/${sessionId}`, {
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function deleteAuditSession(sessionId: string) {
  const res = await fetch(`${API_URL}/api/audit/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}


// --- JSON Import ---
export async function importJsonFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/records/import-json`, { method: 'POST', body: formData });
  return res.json();
}

// --- Blacklist ---
export async function getBlacklist(params: { search?: string; page?: number; per_page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  const res = await fetch(`${API_URL}/api/blacklist?${query}`, {
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function addToBlacklist(data: { nom_prenom: string; date_naissance?: string; email?: string; student_id?: string; reason: string }) {
  const res = await fetch(`${API_URL}/api/blacklist`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function removeFromBlacklist(id: string) {
  const res = await fetch(`${API_URL}/api/blacklist/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersWithContentType(),
  });
  return res.json();
}

export async function checkBlacklist(data: { nom_prenom?: string; date_naissance?: string; email?: string; student_id?: string }) {
  const res = await fetch(`${API_URL}/api/blacklist/check`, {
    method: 'POST',
    headers: getAuthHeadersWithContentType(),
    body: JSON.stringify(data),
  });
  return res.json();
}
