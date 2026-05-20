import { create } from "zustand";
import type {
  ParsedSpec, ProjectSpec, ComponentSpec, ProjectCalcResult,
  BlockingQuestion, CalculationResult,
} from "@/types";
import { DEFAULT_COMPONENT } from "@/types";

export type ViewStep = "input" | "spec" | "results";

interface AppStore {
  // View navigation
  currentView: ViewStep;
  viewDirection: number;
  setView: (view: ViewStep) => void;

  // Input mode
  inputMode: "chat" | "upload";
  setInputMode: (mode: "chat" | "upload") => void;

  // ─── Project (NEW) ───
  project: ProjectSpec | null;
  setProject: (project: ProjectSpec | null) => void;

  activeComponentIndex: number;
  setActiveComponentIndex: (idx: number) => void;

  // Component CRUD
  addComponent: (comp?: Partial<ComponentSpec>) => void;
  updateComponent: (index: number, comp: ComponentSpec) => void;
  removeComponent: (index: number) => void;
  duplicateComponent: (index: number) => void;

  // Blocking questions
  blockingQuestions: BlockingQuestion[];
  setBlockingQuestions: (q: BlockingQuestion[]) => void;

  // Project calc result (NEW)
  projectCalcResult: ProjectCalcResult | null;
  setProjectCalcResult: (r: ProjectCalcResult | null) => void;

  // Legacy compat
  parsedSpec: ParsedSpec | null;
  setParsedSpec: (spec: ParsedSpec | null) => void;

  calcResult: CalculationResult | null;
  setCalcResult: (result: CalculationResult | null) => void;

  calcLoading: boolean;
  setCalcLoading: (loading: boolean) => void;

  calcError: string | null;
  setCalcError: (error: string | null) => void;

  resetAll: () => void;
}

const VIEW_ORDER: ViewStep[] = ["input", "spec", "results"];

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: "input",
  viewDirection: 1,
  setView: (view) => {
    const current = VIEW_ORDER.indexOf(get().currentView);
    const next = VIEW_ORDER.indexOf(view);
    set({ currentView: view, viewDirection: next >= current ? 1 : -1 });
  },

  inputMode: "chat",
  setInputMode: (mode) => set({ inputMode: mode }),

  // ─── Project ───
  project: null,
  setProject: (project) => set({ project, activeComponentIndex: 0 }),

  activeComponentIndex: 0,
  setActiveComponentIndex: (idx) => set({ activeComponentIndex: idx }),

  addComponent: (comp) => {
    const { project } = get();
    if (!project) return;
    const newComp: ComponentSpec = {
      ...DEFAULT_COMPONENT,
      component_name: `ชิ้นงาน ${project.components.length + 1}`,
      job_category: project.job_category,
      ...comp,
    };
    set({
      project: {
        ...project,
        components: [...project.components, newComp],
      },
      activeComponentIndex: project.components.length,
    });
  },

  updateComponent: (index, comp) => {
    const { project } = get();
    if (!project) return;
    const components = [...project.components];
    components[index] = comp;
    set({ project: { ...project, components } });
  },

  removeComponent: (index) => {
    const { project, activeComponentIndex } = get();
    if (!project || project.components.length <= 1) return;
    const components = project.components.filter((_, i) => i !== index);
    set({
      project: { ...project, components },
      activeComponentIndex: Math.min(activeComponentIndex, components.length - 1),
    });
  },

  duplicateComponent: (index) => {
    const { project } = get();
    if (!project) return;
    const orig = project.components[index];
    const copy: ComponentSpec = {
      ...JSON.parse(JSON.stringify(orig)),
      component_name: `${orig.component_name} (copy)`,
    };
    const components = [...project.components];
    components.splice(index + 1, 0, copy);
    set({
      project: { ...project, components },
      activeComponentIndex: index + 1,
    });
  },

  blockingQuestions: [],
  setBlockingQuestions: (q) => set({ blockingQuestions: q }),

  projectCalcResult: null,
  setProjectCalcResult: (r) => set({ projectCalcResult: r }),

  // Legacy compat
  parsedSpec: null,
  setParsedSpec: (spec) => set({ parsedSpec: spec }),

  calcResult: null,
  setCalcResult: (result) => set({ calcResult: result }),

  calcLoading: false,
  setCalcLoading: (loading) => set({ calcLoading: loading }),

  calcError: null,
  setCalcError: (error) => set({ calcError: error }),

  resetAll: () =>
    set({
      currentView: "input",
      viewDirection: 1,
      project: null,
      activeComponentIndex: 0,
      blockingQuestions: [],
      projectCalcResult: null,
      parsedSpec: null,
      calcResult: null,
      calcLoading: false,
      calcError: null,
    }),
}));
