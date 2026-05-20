import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export default api;

// ===== Chat =====
export const chatMessage = (message: string, context?: Array<{ role: string; content: string }>) =>
  api.post("/chat/message", { message, context });

export const parseInput = (message: string) =>
  api.post("/chat/parse", { message });

export const parseFile = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/chat/parse-file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===== RFQ =====
export const listRFQs = (status?: string) =>
  api.get("/rfq/", { params: { status } });

export const getRFQ = (id: number) => api.get(`/rfq/${id}`);

export const createRFQ = (data: { input_type: string; raw_input?: string }) =>
  api.post("/rfq/", data);

export const parseRFQ = (id: number) => api.post(`/rfq/${id}/parse`);

export const calculateRFQ = (id: number) => api.post(`/rfq/${id}/calculate`);

export const quickEstimate = (item: Record<string, unknown>) =>
  api.post("/rfq/quick-estimate", item);

// ===== Project (NEW — multi-component) =====
export const calculateProject = (project: Record<string, unknown>) =>
  api.post("/projects/calculate", project);

export const calculateSingleComponent = (component: Record<string, unknown>) =>
  api.post("/projects/calculate-component", component);

export const quickEstimateProject = (project: Record<string, unknown>) =>
  api.post("/projects/quick-estimate", project);

// ===== Master Data =====
export const listPapers = () => api.get("/master-data/papers");
export const listMachines = () => api.get("/master-data/machines");
export const listFinishing = () => api.get("/master-data/finishing");

export const importMasterData = (file: File, dataType: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("data_type", dataType);
  return api.post("/master-data/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===== Quotation =====
export const listQuotations = () => api.get("/quotations/");
export const getQuotation = (id: number) => api.get(`/quotations/${id}`);
export const createQuotation = (data: Record<string, unknown>) =>
  api.post("/quotations/", data);
export const generatePDF = (id: number) =>
  api.post(`/quotations/${id}/generate-pdf`);
