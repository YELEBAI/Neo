import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  KeyRound,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Textarea,
} from "@neo-tavern/ui";
import { useWorldbookStore } from "@/features/settings/worldbook.store";
import type { WorldbookEntry } from "@neo-tavern/shared";

function toast(type: "success" | "error" | "info", message: string) {
  const fn = (window as any).__toast;
  if (fn) fn(type, message);
}

function keywordsFrom(keys: string) {
  return keys
    .split(/[,，、\n]/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function isLongEntry(entry: WorldbookEntry) {
  return entry.content.length > 420 || entry.content.split("\n").length > 8;
}

function entryModeLabel(entry: WorldbookEntry, t: (key: string) => string) {
  if (entry.type === "always") return t("entryForm.always");
  return entry.triggerMode === "and"
    ? `${t("entryForm.trigger")} AND`
    : `${t("entryForm.trigger")} OR`;
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card/50 px-3 py-2">
      <div className="text-base font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SwitchButton({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function WorldbookPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("worldbook");
  const { t: tc } = useTranslation("common");
  const {
    worldbooks,
    activeWorldbookId,
    loading,
    loadWorldbooks,
    createWorldbook,
    updateWorldbook,
    deleteWorldbook,
    setActiveWorldbook,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleEntry,
  } = useWorldbookStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wbName, setWbName] = useState("");
  const [wbDesc, setWbDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    (typeof worldbooks)[0] | null
  >(null);

  const [entryTitle, setEntryTitle] = useState("");
  const [entryKeys, setEntryKeys] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [entryPriority, setEntryPriority] = useState("100");
  const [entryType, setEntryType] = useState<"always" | "trigger">("trigger");
  const [entryTriggerMode, setEntryTriggerMode] = useState<"and" | "or">("or");
  const [entryEnabled, setEntryEnabled] = useState(true);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    loadWorldbooks();
  }, [loadWorldbooks]);

  useEffect(() => {
    if (!selectedId && worldbooks.length > 0) {
      handleSelect(worldbooks[0].id);
    }
  }, [worldbooks]);

  const selected =
    worldbooks.find((worldbook) => worldbook.id === selectedId) ?? null;
  const entries = useMemo(
    () =>
      selected
        ? [...selected.entries].sort((a, b) => b.priority - a.priority)
        : [],
    [selected],
  );
  const selectedEntry = editingEntryId
    ? entries.find((entry) => entry.id === editingEntryId)
    : null;
  const stats = useMemo(() => {
    const source = selected?.entries ?? [];
    return {
      total: source.length,
      enabled: source.filter((entry) => entry.enabled).length,
      always: source.filter((entry) => entry.enabled && entry.type === "always")
        .length,
      trigger: source.filter(
        (entry) => entry.enabled && entry.type === "trigger",
      ).length,
    };
  }, [selected]);

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryTitle("");
    setEntryKeys("");
    setEntryContent("");
    setEntryPriority("100");
    setEntryType("trigger");
    setEntryTriggerMode("or");
    setEntryEnabled(true);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const wb = worldbooks.find((worldbook) => worldbook.id === id);
    if (wb) {
      setWbName(wb.name);
      setWbDesc(wb.description);
    }
    setExpandedEntryIds(new Set());
    resetEntryForm();
  };

  const handleCreate = async () => {
    try {
      const wb = await createWorldbook({
        name: "New World Book",
        description: "",
      });
      setSelectedId(wb.id);
      setWbName(wb.name);
      setWbDesc("");
      setExpandedEntryIds(new Set());
      resetEntryForm();
    } catch {
      toast("error", t("toast.saveFailed"));
    }
  };

  const handleSaveMeta = async () => {
    if (!selectedId) return;
    try {
      await updateWorldbook(selectedId, { name: wbName, description: wbDesc });
      toast("success", t("toast.saved"));
    } catch {
      toast("error", t("toast.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorldbook(deleteTarget.id);
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setWbName("");
        setWbDesc("");
        resetEntryForm();
      }
      setDeleteTarget(null);
      toast("info", t("toast.deleted", { name: deleteTarget.name }));
    } catch {
      toast("error", t("toast.saveFailed"));
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    const newId = activeWorldbookId === selectedId ? null : selectedId;
    await setActiveWorldbook(newId);
    toast(
      "info",
      newId
        ? t("toast.activated", { name: selected?.name })
        : t("toast.deactivated"),
    );
  };

  const startEditEntry = (entry: WorldbookEntry) => {
    setEditingEntryId(entry.id);
    setEntryTitle(entry.title);
    setEntryKeys(entry.keys);
    setEntryContent(entry.content);
    setEntryPriority(String(entry.priority));
    setEntryType(entry.type);
    setEntryTriggerMode(entry.triggerMode);
    setEntryEnabled(entry.enabled);
  };

  const handleEntryCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    entry: WorldbookEntry,
  ) => {
    if (event.currentTarget !== event.target) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    startEditEntry(entry);
  };

  const handleSaveEntry = async () => {
    if (!selectedId || !entryTitle.trim()) {
      toast("error", t("toast.titleRequired"));
      return;
    }

    const parsedPriority = Number.parseInt(entryPriority, 10);
    const data = {
      title: entryTitle.trim(),
      keys: entryKeys,
      content: entryContent,
      priority: Number.isFinite(parsedPriority) ? parsedPriority : 100,
      type: entryType,
      triggerMode: entryTriggerMode,
      enabled: entryEnabled,
    };

    try {
      if (editingEntryId) {
        await updateEntry(selectedId, editingEntryId, data);
        toast("success", t("toast.entryUpdated", { title: entryTitle.trim() }));
      } else {
        await addEntry(selectedId, data);
        toast("success", t("toast.entryAdded", { title: entryTitle.trim() }));
      }
      resetEntryForm();
    } catch {
      toast("error", t("toast.saveFailed"));
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedId) return;
    const entry = entries.find((candidate) => candidate.id === entryId);
    deleteEntry(selectedId, entryId);
    if (editingEntryId === entryId) resetEntryForm();
    toast("info", t("toast.entryDeleted", { title: entry?.title || "Entry" }));
  };

  const handleToggleEntry = (entryId: string) => {
    if (!selectedId) return;
    toggleEntry(selectedId, entryId);
  };

  const toggleEntryExpanded = (entryId: string) => {
    setExpandedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r bg-card/30">
        <div className="shrink-0 space-y-4 border-b p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {tc("actions.back")}
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleCreate}
              title={t("newBook")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("title")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("booksAvailable", { count: worldbooks.length })}
            </p>
          </div>
        </div>

        <ScrollArea type="always" className="min-h-0 flex-1">
          <div className="space-y-2 p-3 pr-5">
            {loading && (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {t("loading")}
              </p>
            )}
            {!loading && worldbooks.length === 0 && (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {t("noBooks")}
              </p>
            )}
            {worldbooks.map((worldbook) => {
              const isSelected = selectedId === worldbook.id;
              const enabledCount = worldbook.entries.filter(
                (entry) => entry.enabled,
              ).length;

              return (
                <button
                  key={worldbook.id}
                  type="button"
                  onClick={() => handleSelect(worldbook.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary/40 bg-accent text-foreground"
                      : "border-border/70 bg-background/30 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {worldbook.name}
                    </span>
                    {activeWorldbookId === worldbook.id && (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                    {worldbook.description || t("noDescription")}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>
                      {t("entries", { count: worldbook.entries.length })}
                    </span>
                    <span>
                      {enabledCount} {t("enabledOn")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="space-y-3 text-center">
              <BookOpen className="mx-auto h-10 w-10 opacity-30" />
              <p className="text-sm">{t("selectOrCreate")}</p>
              <Button variant="outline" size="sm" onClick={handleCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("newBook")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t("worldBook")}
                  </div>
                  <Input
                    value={wbName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setWbName(event.target.value)
                    }
                    className="h-auto border-0 border-b bg-transparent px-0 pb-1 text-2xl font-bold shadow-none focus-visible:ring-0"
                    placeholder={t("bookNamePlaceholder")}
                  />
                  <Input
                    value={wbDesc}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setWbDesc(event.target.value)
                    }
                    className="mt-2 h-auto border-0 border-b bg-transparent px-0 pb-1 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    placeholder={t("descPlaceholder")}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleSaveMeta}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {tc("actions.save")}
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      activeWorldbookId === selectedId ? "default" : "outline"
                    }
                    onClick={handleActivate}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5" />
                    {activeWorldbookId === selectedId
                      ? t("active")
                      : t("activate")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(selected)}
                    title={t("deleteBook")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid w-full max-w-xl grid-cols-4 gap-2">
                <CountPill label={t("stats.entries")} value={stats.total} />
                <CountPill label={t("stats.enabled")} value={stats.enabled} />
                <CountPill label={t("stats.always")} value={stats.always} />
                <CountPill label={t("stats.trigger")} value={stats.trigger} />
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] overflow-hidden">
              <section className="flex min-w-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t("entriesSection.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("entriesSection.description")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={resetEntryForm}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("entriesSection.newEntry")}
                  </Button>
                </div>

                <ScrollArea type="always" className="min-h-0 flex-1">
                  <div className="space-y-3 p-5 pr-7">
                    {entries.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        <FileText className="mx-auto mb-2 h-7 w-7 opacity-35" />
                        {t("entriesSection.noEntries")}
                      </div>
                    )}
                    {entries.map((entry) => {
                      const keywords = keywordsFrom(entry.keys);
                      const isExpanded = expandedEntryIds.has(entry.id);
                      const isLong = isLongEntry(entry);
                      const isEditing = editingEntryId === entry.id;

                      return (
                        <article
                          key={entry.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => startEditEntry(entry)}
                          onKeyDown={(event) =>
                            handleEntryCardKeyDown(event, entry)
                          }
                          className={`rounded-lg border bg-card/40 p-4 transition-colors ${
                            isEditing
                              ? "border-primary/50 bg-accent/35"
                              : "border-border/80 hover:bg-accent/25"
                          } ${entry.enabled ? "" : "opacity-55"} cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                        >
                          <div className="flex items-start gap-3">
                            <SwitchButton
                              checked={entry.enabled}
                              onClick={() => handleToggleEntry(entry.id)}
                              label={`${entry.enabled ? "Disable" : "Enable"} ${entry.title}`}
                            />
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="min-w-0 truncate text-sm font-semibold">
                                  {entry.title || t("entry.untitled")}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    entry.type === "always"
                                      ? "bg-sky-500/10 text-sky-500"
                                      : entry.triggerMode === "and"
                                        ? "bg-blue-500/10 text-blue-500"
                                        : "bg-emerald-500/10 text-emerald-500"
                                  }`}
                                >
                                  {entryModeLabel(entry, t)}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  P{entry.priority}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {keywords.length === 0 ? (
                                  <span className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground">
                                    <KeyRound className="mr-1 h-3 w-3" />
                                    {t("entry.noKeywords")}
                                  </span>
                                ) : (
                                  <>
                                    {keywords.slice(0, 8).map((keyword) => (
                                      <span
                                        key={keyword}
                                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                    {keywords.length > 8 && (
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                        +{keywords.length - 8}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              <div
                                className={`relative rounded-md border bg-background/60 px-3 py-2 text-xs leading-6 text-muted-foreground ${
                                  isLong
                                    ? isExpanded
                                      ? "max-h-80 overflow-y-auto"
                                      : "max-h-36 overflow-hidden"
                                    : ""
                                }`}
                              >
                                <div className="whitespace-pre-wrap break-words">
                                  {entry.content || t("entry.noContent")}
                                </div>
                                {isLong && !isExpanded && (
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
                                )}
                              </div>

                              {isLong && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleEntryExpanded(entry.id);
                                  }}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  {isExpanded
                                    ? t("entry.collapse")
                                    : t("entry.expand")}
                                </button>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteEntry(entry.id);
                                }}
                                title={t("entry.delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </ScrollArea>
              </section>

              <aside className="flex min-h-0 flex-col overflow-hidden border-l bg-card/25">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {editingEntryId
                        ? t("entryForm.editEntry")
                        : t("entryForm.newEntry")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedEntry
                        ? t("entryForm.editHint", {
                            title: selectedEntry.title,
                          })
                        : t("entryForm.createHint")}
                    </p>
                  </div>
                  {editingEntryId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={resetEntryForm}
                      title={t("entryForm.cancelEdit")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <ScrollArea type="always" className="min-h-0 flex-1">
                  <div className="space-y-4 p-4 pr-6">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("entryForm.title")}
                      </span>
                      <Input
                        value={entryTitle}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setEntryTitle(event.target.value)
                        }
                        placeholder={t("entryForm.titlePlaceholder")}
                      />
                    </label>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("entryForm.injectionType")}
                      </span>
                      <div className="grid grid-cols-2 rounded-md border bg-background p-1">
                        <button
                          type="button"
                          onClick={() => setEntryType("always")}
                          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            entryType === "always"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {t("entryForm.always")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryType("trigger")}
                          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            entryType === "trigger"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {t("entryForm.trigger")}
                        </button>
                      </div>
                    </div>

                    {entryType === "trigger" && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("entryForm.triggerMode")}
                        </span>
                        <div className="grid grid-cols-2 rounded-md border bg-background p-1">
                          <button
                            type="button"
                            onClick={() => setEntryTriggerMode("and")}
                            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                              entryTriggerMode === "and"
                                ? "bg-blue-500 text-white"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {t("entryForm.andAll")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryTriggerMode("or")}
                            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                              entryTriggerMode === "or"
                                ? "bg-emerald-500 text-white"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {t("entryForm.orAny")}
                          </button>
                        </div>
                      </div>
                    )}

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("entryForm.keywords")}
                      </span>
                      <Input
                        value={entryKeys}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setEntryKeys(event.target.value)
                        }
                        placeholder={t("entryForm.keywordsPlaceholder")}
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("entryForm.content")}
                      </span>
                      <Textarea
                        value={entryContent}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          setEntryContent(event.target.value)
                        }
                        placeholder={t("entryForm.contentPlaceholder")}
                        className="min-h-[260px] resize-none text-sm leading-6"
                      />
                    </label>

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("entryForm.priority")}
                        </span>
                        <Input
                          value={entryPriority}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setEntryPriority(event.target.value)
                          }
                          type="number"
                          placeholder={t("entryForm.priorityPlaceholder")}
                        />
                      </label>
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-muted-foreground">
                          {t("entryForm.enabled")}
                        </span>
                        <div className="flex h-9 items-center">
                          <SwitchButton
                            checked={entryEnabled}
                            onClick={() => setEntryEnabled(!entryEnabled)}
                            label="Toggle entry enabled"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex shrink-0 items-center justify-between gap-2 border-t p-4">
                  <Button onClick={handleSaveEntry} className="flex-1">
                    {editingEntryId
                      ? t("entryForm.updateEntry")
                      : t("entryForm.addEntry")}
                  </Button>
                  {editingEntryId && (
                    <Button variant="outline" onClick={resetEntryForm}>
                      {tc("actions.cancel")}
                    </Button>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteDialog.description", { name: deleteTarget?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tc("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tc("actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
