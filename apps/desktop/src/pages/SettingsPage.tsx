import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  Plug,
  Sun,
  Moon,
  Monitor,
  Palette,
  Trash2,
  Plus,
  Regex,
  SlidersHorizontal,
  CheckCircle2,
  Globe,
  Download,
  KeyRound,
  Server,
  Zap,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@neo-tavern/ui";
import { useSettingsStore } from "@/features/settings/settings.store";
import { getStorageItem, setStorageItem } from "@/db/storage";
import { useTranslation } from "react-i18next";
import { getLocale, type Locale } from "@/i18n";
import { SettingsSidebar } from "./settings/SettingsSidebar";
import { AppearanceSection } from "./settings/AppearanceSection";
import { ContextSection } from "./settings/ContextSection";
import { toast } from "@/utils/toast";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_LEGACY_MODELS = ["deepseek-chat", "deepseek-reasoner"];

type Section = "api" | "appearance" | "regex" | "context";

type SectionWithLabel = { key: Section; icon: typeof Plug; label: string };

type ThemeOption = {
  value: "light" | "dark" | "sepia" | "system";
  icon: typeof Sun;
  label: string;
};

function SwitchButton({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const [locale, setLocale] = useState<Locale>(getLocale);
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("api");

  const sections: SectionWithLabel[] = [
    { key: "api", icon: Plug, label: t("sections.api") },
    { key: "appearance", icon: Palette, label: t("sections.appearance") },
    { key: "context", icon: SlidersHorizontal, label: t("sections.context") },
    { key: "regex", icon: Regex, label: t("sections.regex") },
  ];

  const themes: ThemeOption[] = [
    { value: "light" as const, icon: Sun, label: t("appearance.light") },
    { value: "dark" as const, icon: Moon, label: t("appearance.dark") },
    { value: "sepia" as const, icon: BookOpen, label: t("appearance.eyeCare") },
    { value: "system" as const, icon: Monitor, label: t("appearance.system") },
  ];

  const modelConfigs = useSettingsStore((s) => s.modelConfigs);
  const activeConfigId = useSettingsStore((s) => s.activeConfigId);
  const saving = useSettingsStore((s) => s.saving);
  const testing = useSettingsStore((s) => s.testing);
  const error = useSettingsStore((s) => s.error);
  const loadAllConfigs = useSettingsStore((s) => s.loadAllConfigs);
  const selectConfig = useSettingsStore((s) => s.selectConfig);
  const saveModelConfig = useSettingsStore((s) => s.saveModelConfig);
  const updateModelConfig = useSettingsStore((s) => s.updateModelConfig);
  const deleteModelConfigFromStore = useSettingsStore((s) => s.deleteModelConfig);
  const testConnection = useSettingsStore((s) => s.testConnection);
  const regexPresets = useSettingsStore((s) => s.regexPresets);
  const activeRegexPresetId = useSettingsStore((s) => s.activeRegexPresetId);
  const loadRegexRules = useSettingsStore((s) => s.loadRegexRules);
  const createRegexPreset = useSettingsStore((s) => s.createRegexPreset);
  const updateRegexPreset = useSettingsStore((s) => s.updateRegexPreset);
  const deleteRegexPresetFromStore = useSettingsStore((s) => s.deleteRegexPreset);
  const setActiveRegexPreset = useSettingsStore((s) => s.setActiveRegexPreset);
  const addRegexRule = useSettingsStore((s) => s.addRegexRule);
  const updateRegexRuleFromStore = useSettingsStore((s) => s.updateRegexRule);
  const deleteRegexRuleFromStore = useSettingsStore((s) => s.deleteRegexRule);
  const toggleRegexRule = useSettingsStore((s) => s.toggleRegexRule);
  const contextTokens = useSettingsStore((s) => s.contextTokens);
  const setContextTokens = useSettingsStore((s) => s.setContextTokens);

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.8");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [reasoningEffort, setReasoningEffort] = useState("");
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("__new__");

  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [easterEggClicks, setEasterEggClicks] = useState(0);
  const [secretUnlocked, setSecretUnlocked] = useState(false);

  const fillForm = (cfg: {
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    reasoningEffort?: string;
    streamingEnabled?: boolean;
  }) => {
    setName(cfg.name);
    setBaseUrl(cfg.baseUrl);
    setApiKey(cfg.apiKey);
    setModel(cfg.model);
    setTemperature(String(cfg.temperature));
    setMaxTokens(String(cfg.maxTokens));
    setReasoningEffort(cfg.reasoningEffort || "");
    setStreamingEnabled(cfg.streamingEnabled !== false);
  };

  const [selectedRegexPresetId, setSelectedRegexPresetId] = useState<string | null>(null);
  const [regexPresetName, setRegexPresetName] = useState("");
  const [regexPresetDesc, setRegexPresetDesc] = useState("");
  const [regexDeleteTarget, setRegexDeleteTarget] = useState<(typeof regexPresets)[0] | null>(null);

  const [regexName, setRegexName] = useState("");
  const [regexPattern, setRegexPattern] = useState("");
  const [regexTemplate, setRegexTemplate] = useState("");
  const [regexStrip, setRegexStrip] = useState(true);
  const [regexEnabled, setRegexEnabled] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const resetDeepSeekForm = () => {
    setName(DEFAULT_DEEPSEEK_MODEL);
    setBaseUrl(DEEPSEEK_BASE_URL);
    setApiKey("");
    setModel(DEFAULT_DEEPSEEK_MODEL);
    setTemperature("0.8");
    setMaxTokens("4096");
    setReasoningEffort("");
    setStreamingEnabled(true);
    setAvailableModels([]);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await loadAllConfigs();
      if (cancelled) return;
      const state = useSettingsStore.getState();
      if (state.modelConfig) {
        const c = state.modelConfig;
        fillForm(c);
        setSelectedId(c.id);
      } else {
        setSelectedId("__new__");
        resetDeepSeekForm();
      }
      setLoaded(true);
    };
    load();
    loadRegexRules();
    getStorageItem("neotavern_secret_unlocked").then((value) => {
      if (!cancelled) setSecretUnlocked(value === "1");
    });
    return () => {
      cancelled = true;
    };
  }, [loadAllConfigs, loadRegexRules]);

  const applyConfigSelection = (id: string) => {
    setSelectedId(id);
    if (id === "__new__") {
      resetDeepSeekForm();
      return;
    }
    const cfg = modelConfigs.find((c) => c.id === id);
    if (cfg) {
      selectConfig(id);
      fillForm(cfg);
    }
  };

  const handleSave = async () => {
    try {
      const temp = parseFloat(temperature) || 0.8;
      const tokens = parseInt(maxTokens) || 4096;
      const re = reasoningEffort || undefined;
      const nextName = name.trim() || DEFAULT_DEEPSEEK_MODEL;
      const nextBaseUrl = baseUrl.trim() || DEEPSEEK_BASE_URL;
      const nextApiKey = apiKey.trim();
      const nextModel = model.trim() || DEFAULT_DEEPSEEK_MODEL;
      const nextStreamingEnabled = streamingEnabled;
      if (!nextApiKey) {
        toast("error", "Please enter your DeepSeek API key first.");
        return;
      }
      if (selectedId !== "__new__" && modelConfigs.some((c) => c.id === selectedId)) {
        await updateModelConfig(selectedId, {
          baseUrl: nextBaseUrl,
          apiKey: nextApiKey,
          model: nextModel,
          name: nextName,
          temperature: temp,
          maxTokens: tokens,
          reasoningEffort: re,
          streamingEnabled: nextStreamingEnabled,
        });
        setName(nextName);
        setBaseUrl(nextBaseUrl);
        setApiKey(nextApiKey);
        setModel(nextModel);
        toast("success", `"${nextName}" updated.`);
      } else {
        const cfg = await saveModelConfig({
          provider: "openai-compatible",
          baseUrl: nextBaseUrl,
          apiKey: nextApiKey,
          model: nextModel,
          name: nextName,
          temperature: temp,
          maxTokens: tokens,
          reasoningEffort: re,
          streamingEnabled: nextStreamingEnabled,
        });
        setName(nextName);
        setBaseUrl(nextBaseUrl);
        setApiKey(nextApiKey);
        setModel(nextModel);
        setSelectedId(cfg.id);
        toast("success", `"${nextName}" saved.`);
      }
    } catch {
      toast("error", error || "Failed to save configuration.");
    }
  };

  const handleDelete = async () => {
    if (selectedId === "__new__") return;
    const cfg = modelConfigs.find((c) => c.id === selectedId);
    if (!cfg) return;
    try {
      await deleteModelConfigFromStore(selectedId);
      const state = useSettingsStore.getState();
      if (state.modelConfig) {
        fillForm(state.modelConfig);
        setSelectedId(state.modelConfig.id);
      } else {
        resetDeepSeekForm();
        setSelectedId("__new__");
      }
      toast("info", `"${cfg.name || "Configuration"}" deleted.`);
    } catch {
      toast("error", error || "Failed to delete.");
    }
  };

  const handleTestConnection = async () => {
    const nextBaseUrl = baseUrl.trim() || DEEPSEEK_BASE_URL;
    const nextApiKey = apiKey.trim();
    const nextModel = model.trim() || DEFAULT_DEEPSEEK_MODEL;
    if (!nextApiKey) {
      toast("error", "Please enter your DeepSeek API key first.");
      return;
    }
    setBaseUrl(nextBaseUrl);
    setModel(nextModel);
    const result = await testConnection(nextBaseUrl, nextApiKey, nextModel);
    if (result.ok) toast("success", result.message);
    else toast("error", result.message);
  };

  const handleFetchModels = async () => {
    const nextBaseUrl = baseUrl.trim() || DEEPSEEK_BASE_URL;
    const nextApiKey = apiKey.trim();
    if (!nextApiKey) {
      toast("error", "Please enter your DeepSeek API key first.");
      return;
    }
    setBaseUrl(nextBaseUrl);
    setFetchingModels(true);
    try {
      const response = await fetch(`${nextBaseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${nextApiKey}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((m) => m.id).sort((a, b) => a.localeCompare(b));
      if (models.length === 0) {
        toast("error", "No DeepSeek models returned from API");
        return;
      }
      setAvailableModels(models);
      if (!model || !models.includes(model)) {
        setModel(models.includes(DEFAULT_DEEPSEEK_MODEL) ? DEFAULT_DEEPSEEK_MODEL : models[0]);
      }
      toast("success", t("api.toast.modelsLoaded", { count: models.length }));
    } catch (err) {
      toast("error", t("api.toast.modelsFetchFailed", { message: (err as Error).message }));
    } finally {
      setFetchingModels(false);
    }
  };

  const handleContextEasterEgg = () => {
    if (secretUnlocked) {
      setSection("context");
      return;
    }
    const next = easterEggClicks + 1;
    setEasterEggClicks(next);
    if (next >= 10) {
      void setStorageItem("neotavern_secret_unlocked", "1");
      setSecretUnlocked(true);
      window.dispatchEvent(new Event("neotavern-secret-changed"));
      toast("success", t("toast.secretUnlocked"));
    }
    setSection("context");
  };

  const selectedRegexPreset = regexPresets.find((p) => p.id === selectedRegexPresetId) ?? null;
  const selectedRules = selectedRegexPreset ? [...selectedRegexPreset.rules] : [];
  const fetchedModelOptions = availableModels.map((id) => ({
    id,
    label: id,
    badge: t("api.fetchedBadge"),
    description: t("api.fetchedDescription"),
  }));
  const baseModelOptions =
    availableModels.length > 0
      ? fetchedModelOptions
      : [
          {
            id: "deepseek-v4-flash",
            label: t("api.models.deepseek-v4-flash.label"),
            badge: t("api.models.deepseek-v4-flash.badge"),
            description: t("api.models.deepseek-v4-flash.description"),
          },
          {
            id: "deepseek-v4-pro",
            label: t("api.models.deepseek-v4-pro.label"),
            badge: t("api.models.deepseek-v4-pro.badge"),
            description: t("api.models.deepseek-v4-pro.description"),
          },
        ];
  const modelSelectOptions =
    model && !baseModelOptions.some((option) => option.id === model)
      ? [
          {
            id: model,
            label: model,
            badge: t("api.savedBadge"),
            description: t("api.savedDescription"),
          },
          ...baseModelOptions,
        ]
      : baseModelOptions;
  const selectedModelMeta = baseModelOptions.find((option) => option.id === model);
  const isLegacyDeepSeekModel = DEEPSEEK_LEGACY_MODELS.includes(model);

  const handleSelectRegexPreset = (id: string) => {
    setSelectedRegexPresetId(id);
    const preset = regexPresets.find((p) => p.id === id);
    if (preset) {
      setRegexPresetName(preset.name);
      setRegexPresetDesc(preset.description);
    }
    resetRuleForm();
  };

  const handleCreateRegexPreset = async () => {
    try {
      const p = await createRegexPreset({
        name: "New Regex Preset",
        description: "",
      });
      setSelectedRegexPresetId(p.id);
    } catch {
      toast("error", t("regex.failed"));
    }
  };

  const handleSaveRegexPresetMeta = async () => {
    if (!selectedRegexPresetId) return;
    try {
      await updateRegexPreset(selectedRegexPresetId, {
        name: regexPresetName,
        description: regexPresetDesc,
      });
      toast("success", t("regex.saved"));
    } catch {
      toast("error", t("regex.failed"));
    }
  };

  const handleDeleteRegexPreset = async () => {
    if (!regexDeleteTarget) return;
    try {
      await deleteRegexPresetFromStore(regexDeleteTarget.id);
      if (selectedRegexPresetId === regexDeleteTarget.id) {
        setSelectedRegexPresetId(null);
        setRegexPresetName("");
        setRegexPresetDesc("");
      }
      setRegexDeleteTarget(null);
      toast("info", t("regex.deleted", { name: regexDeleteTarget.name }));
    } catch {
      toast("error", t("regex.failed"));
    }
  };

  const handleActivateRegexPreset = async () => {
    if (!selectedRegexPresetId) return;
    const newId = activeRegexPresetId === selectedRegexPresetId ? null : selectedRegexPresetId;
    await setActiveRegexPreset(newId);
    toast("info", newId ? `Activated "${selectedRegexPreset?.name}"` : "Deactivated");
  };

  const handleToggleGlobalRegex = async () => {
    if (!selectedRegexPresetId || !selectedRegexPreset) return;
    await updateRegexPreset(selectedRegexPresetId, {
      isGlobal: !selectedRegexPreset.isGlobal,
    });
    toast("info", selectedRegexPreset.isGlobal ? "Removed global flag" : "Set as global regex");
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRegexName("");
    setRegexPattern("");
    setRegexTemplate("");
    setRegexStrip(true);
    setRegexEnabled(true);
  };

  const startEditRule = (rule: {
    id: string;
    name: string;
    pattern: string;
    displayTemplate: string;
    stripFromPrompt: boolean;
    enabled: boolean;
  }) => {
    setEditingRuleId(rule.id);
    setRegexName(rule.name);
    setRegexPattern(rule.pattern);
    setRegexTemplate(rule.displayTemplate);
    setRegexStrip(rule.stripFromPrompt);
    setRegexEnabled(rule.enabled);
  };

  const handleSaveRule = () => {
    if (!selectedRegexPresetId || !regexName.trim() || !regexPattern.trim()) {
      toast("error", "Name and Pattern are required");
      return;
    }
    try {
      new RegExp(regexPattern, "gs");
    } catch {
      toast("error", "Invalid regex pattern");
      return;
    }
    try {
      if (editingRuleId) {
        updateRegexRuleFromStore(selectedRegexPresetId, editingRuleId, {
          name: regexName.trim(),
          pattern: regexPattern.trim(),
          displayTemplate: regexTemplate,
          stripFromPrompt: regexStrip,
          enabled: regexEnabled,
        });
        toast("success", `"${regexName}" updated`);
      } else {
        addRegexRule(selectedRegexPresetId, {
          name: regexName.trim(),
          pattern: regexPattern.trim(),
          displayTemplate: regexTemplate,
          stripFromPrompt: regexStrip,
          enabled: regexEnabled,
        });
        toast("success", `"${regexName}" added`);
      }
      resetRuleForm();
    } catch {
      toast("error", "Failed");
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!selectedRegexPresetId) return;
    const rule = selectedRules.find((r) => r.id === ruleId);
    deleteRegexRuleFromStore(selectedRegexPresetId, ruleId);
    if (editingRuleId === ruleId) resetRuleForm();
    toast("info", `"${rule?.name || "Rule"}" deleted`);
  };

  const handleToggleRule = (ruleId: string) => {
    if (!selectedRegexPresetId) return;
    toggleRegexRule(selectedRegexPresetId, ruleId);
  };

  return (
    <div className="flex h-full">
      <SettingsSidebar
        section={section}
        sections={sections}
        onSelect={setSection}
        onBack={() => navigate("/")}
        onContextClick={handleContextEasterEgg}
        t={t}
      />

      <div className="flex-1 p-6 overflow-auto">
        {section === "api" && (
          <div className="max-w-5xl space-y-4">
            <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {t("api.deepseekDedicated")}
                </div>
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold tracking-normal">
                    <Plug className="h-6 w-6" />
                    {t("api.deepseekConnection")}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t("api.description")}</p>
                </div>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2 lg:min-w-[340px]">
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground">{t("api.officialBase")}</p>
                  <p className="mt-1 truncate font-mono text-foreground">{DEEPSEEK_BASE_URL}</p>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground">{t("api.currentDefault")}</p>
                  <p className="mt-1 truncate font-mono text-foreground">{DEFAULT_DEEPSEEK_MODEL}</p>
                </div>
              </div>
            </div>

            {!loaded && <p className="text-sm text-muted-foreground animate-pulse">{t("api.loading")}</p>}

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    {t("api.connectionProfile")}
                  </CardTitle>
                  <CardDescription>{t("api.profileDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="config-select">{t("api.profiles")}</Label>
                    <div className="flex gap-2">
                      <select
                        id="config-select"
                        value={selectedId}
                        onChange={(e) => applyConfigSelection(e.target.value)}
                        className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="__new__">{t("api.newProfile")}</option>
                        {modelConfigs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.model || c.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      {selectedId !== "__new__" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDelete}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {selectedId !== "__new__" && activeConfigId === selectedId && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t("api.active")}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="config-name">{t("api.profileName")}</Label>
                      <Input
                        id="config-name"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        placeholder={DEFAULT_DEEPSEEK_MODEL}
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-key">{t("api.apiKey")}</Label>
                      <Input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                        placeholder={t("api.apiKeyPlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="base-url">{t("api.baseUrl")}</Label>
                      <Button variant="ghost" size="sm" onClick={() => setBaseUrl(DEEPSEEK_BASE_URL)}>
                        {t("api.useOfficial")}
                      </Button>
                    </div>
                    <div className="relative">
                      <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="base-url"
                        value={baseUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
                        placeholder={DEEPSEEK_BASE_URL}
                        className="pl-9 font-mono text-xs"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t("api.baseUrlHint")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {t("api.model")}
                  </CardTitle>
                  <CardDescription>{t("api.modelDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    {baseModelOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setModel(option.id);
                          if (!name.trim() || name.startsWith("DeepSeek")) setName(option.label);
                        }}
                        className={`rounded-md border p-3 text-left transition-colors ${model === option.id ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-accent/50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${model === option.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {option.badge}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{option.id}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="model">{t("api.modelId")}</Label>
                    <div className="flex gap-2">
                      <select
                        id="model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="min-w-0 flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {modelSelectOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.id}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFetchModels}
                        disabled={fetchingModels}
                        className="shrink-0"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {fetchingModels ? t("api.fetching") : t("api.fetch")}
                      </Button>
                    </div>
                    {selectedModelMeta && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedModelMeta.description}</p>
                    )}
                    {availableModels.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("api.modelsAvailable", {
                          count: availableModels.length,
                        })}
                      </p>
                    )}
                    {isLegacyDeepSeekModel && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t("api.legacyWarning")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  {t("api.generationDefaults")}
                </CardTitle>
                <CardDescription>{t("api.generationDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="relative group inline-flex items-center gap-1 mb-1.5">
                      <Label htmlFor="temperature" className="mb-0">
                        {t("api.temperature")}
                      </Label>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 max-w-64">
                        {t("api.temperatureHint")}
                      </div>
                    </div>
                    <Input
                      id="temperature"
                      value={temperature}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(e.target.value)}
                      placeholder={t("api.temperaturePlaceholder")}
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                    />
                  </div>
                  <div>
                    <div className="relative group inline-flex items-center gap-1 mb-1.5">
                      <Label htmlFor="max-tokens" className="mb-0">
                        {t("api.maxTokens")}
                      </Label>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 max-w-64">
                        {t("api.maxTokensHint")}
                      </div>
                    </div>
                    <Input
                      id="max-tokens"
                      value={maxTokens}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTokens(e.target.value)}
                      placeholder={t("api.maxTokensPlaceholder")}
                      type="number"
                      min="1"
                      max="384000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reasoning-effort">{t("api.reasoningEffort")}</Label>
                    <select
                      id="reasoning-effort"
                      value={reasoningEffort}
                      onChange={(e) => setReasoningEffort(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">{t("api.reasoningOff")}</option>
                      <option value="high">{t("api.reasoningHigh")}</option>
                      <option value="max">{t("api.reasoningMax")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2 text-xs md:grid-cols-3">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">{t("api.contextLength")}</p>
                    <p className="mt-1 text-sm font-semibold">1M tokens</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">{t("api.maxOutput")}</p>
                    <p className="mt-1 text-sm font-semibold">384K tokens</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">{t("api.format")}</p>
                    <p className="mt-1 text-sm font-semibold">OpenAI Chat</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t("api.streaming")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("api.streamingHint")}</p>
                  </div>
                  <SwitchButton
                    checked={streamingEnabled}
                    onClick={() => setStreamingEnabled(!streamingEnabled)}
                    label={t("api.toggleStreaming")}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t("api.saving") : t("api.saveProfile")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="sm:min-w-[160px]"
                  >
                    <Plug className="h-4 w-4 mr-2" />
                    {testing ? t("api.testing") : t("api.testConnection")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {section === "appearance" && <AppearanceSection themes={themes} locale={locale} setLocale={setLocale} t={t} />}

        {section === "context" && (
          <ContextSection contextTokens={contextTokens} setContextTokens={setContextTokens} t={t} />
        )}

        {section === "regex" && (
          <div className="flex h-full -m-6">
            <div className="w-52 border-r p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("regex.presets")}
                </h2>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCreateRegexPreset}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="flex flex-col gap-0.5">
                  {regexPresets.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">{t("regex.noPresets")}</p>
                  )}
                  {regexPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectRegexPreset(p.id)}
                      className={`text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between gap-1
                        ${selectedRegexPresetId === p.id ? "bg-accent text-foreground font-medium" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"}`}
                    >
                      <span className="truncate text-xs">{p.name}</span>
                      {activeRegexPresetId === p.id && <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedRegexPreset ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <p>{t("regex.selectOrCreate")}</p>
                    <Button variant="outline" size="sm" onClick={handleCreateRegexPreset}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t("regex.newPreset")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 pb-2 shrink-0 border-b">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={regexPresetName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegexPresetName(e.target.value)}
                          className="border-0 border-b rounded-none px-0 h-auto text-lg font-bold focus-visible:ring-0"
                          placeholder={t("regex.namePlaceholder")}
                        />
                        <Input
                          value={regexPresetDesc}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegexPresetDesc(e.target.value)}
                          className="border-0 border-b rounded-none px-0 h-auto text-xs text-muted-foreground focus-visible:ring-0"
                          placeholder={t("regex.descPlaceholder")}
                        />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={handleSaveRegexPresetMeta}>
                          {t("regex.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedRegexPreset?.isGlobal ? "default" : "outline"}
                          onClick={handleToggleGlobalRegex}
                          title={t("regex.toggleGlobal")}
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={activeRegexPresetId === selectedRegexPresetId ? "default" : "outline"}
                          onClick={handleActivateRegexPreset}
                        >
                          {activeRegexPresetId === selectedRegexPresetId ? t("regex.active") : t("regex.activate")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setRegexDeleteTarget(selectedRegexPreset)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 shrink-0 border-b">
                    <h3 className="text-sm font-semibold mb-3">
                      {editingRuleId ? t("regex.editRule") : t("regex.addRule")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Input
                        value={regexName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegexName(e.target.value)}
                        placeholder={t("regex.ruleNamePlaceholder")}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={regexEnabled}
                            onClick={() => setRegexEnabled(!regexEnabled)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${regexEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${regexEnabled ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                            />
                          </button>
                          <span className="text-[10px]">{t("regex.on")}</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={regexStrip}
                            onClick={() => setRegexStrip(!regexStrip)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${regexStrip ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${regexStrip ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                            />
                          </button>
                          <span className="text-[10px]">{t("regex.strip")}</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Input
                        value={regexPattern}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegexPattern(e.target.value)}
                        placeholder={t("regex.patternPlaceholder")}
                        className="font-mono text-[10px]"
                      />
                      <Input
                        value={regexTemplate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegexTemplate(e.target.value)}
                        placeholder={t("regex.templatePlaceholder")}
                        className="font-mono text-[10px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveRule}>
                        {editingRuleId ? t("regex.update") : t("regex.add")} Rule
                      </Button>
                      {editingRuleId && (
                        <Button size="sm" variant="outline" onClick={resetRuleForm}>
                          {t("regex.cancel")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto text-[10px]"
                        onClick={() => {
                          resetRuleForm();
                          setRegexName("Summary");
                          setRegexPattern("<summary>([\\s\\S]*?)<\\/summary>");
                          setRegexTemplate("$1");
                          setRegexStrip(true);
                          setRegexEnabled(true);
                        }}
                      >
                        {t("regex.quickSummary")}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-1.5">
                      {selectedRules.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">{t("regex.noRules")}</p>
                      )}
                      {selectedRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${!rule.enabled ? "opacity-40" : "hover:bg-accent/50"}`}
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.enabled}
                            onClick={() => handleToggleRule(rule.id)}
                            className={`shrink-0 relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${rule.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-[14px]" : "translate-x-[2px]"}`}
                            />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium truncate">{rule.name}</span>
                              {rule.stripFromPrompt && (
                                <span className="text-[8px] bg-muted px-1 py-0.5 rounded font-mono shrink-0">
                                  {t("regex.strip")}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{rule.pattern}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditRule(rule)}>
                            <span className="text-[10px]">✎</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        )}

        <Dialog open={!!regexDeleteTarget} onOpenChange={() => setRegexDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Regex Preset</DialogTitle>
              <DialogDescription>
                Delete "{regexDeleteTarget?.name}" and all its rules? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegexDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteRegexPreset}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
