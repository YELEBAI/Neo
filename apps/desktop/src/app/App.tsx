import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import {
  seedTestCharacter,
  seedBuiltinRegex,
  seedLunaWorldbook,
  seedWritingPreset,
  seedSeraphina,
  seedEldoriaWorldbook,
} from "./seed";
import { ToastContainer, useToast } from "@neo-tavern/ui";
import { useSettingsStore } from "@/features/settings/settings.store";
import { useWorldbookStore } from "@/features/settings/worldbook.store";
import { migrateLocalStorageToAppStore } from "@/db/storage";
import { LoginGate } from "@/components/LoginGate";
import { useThemeStore } from "./theme.store";

let seeded = false;

function AppContent() {
  const { toasts, addToast, removeToast } = useToast();
  const themeInit = useThemeStore((s) => s.init);
  window.__toast = addToast;

  useEffect(() => {
    themeInit();

    if (seeded) return;
    seeded = true;

    void (async () => {
      await migrateLocalStorageToAppStore();
      await seedTestCharacter();
      await seedBuiltinRegex();
      await seedLunaWorldbook();
      await seedWritingPreset();
      await seedSeraphina();
      await seedEldoriaWorldbook();
      await useSettingsStore.getState().loadAllConfigs();
      await useSettingsStore.getState().loadContextTokens();
      await useSettingsStore.getState().loadRegexRules();
      await useSettingsStore.getState().loadPersona();
      await useWorldbookStore.getState().loadWorldbooks();
    })();
  }, [themeInit]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export function App() {
  return (
    <LoginGate>
      <AppContent />
    </LoginGate>
  );
}
