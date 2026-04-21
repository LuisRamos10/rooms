"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SettingsFormProps {
  org: {
    id: string;
    name: string;
    domain: string;
    hasServiceAccount: boolean;
    delegatedUser: string;
  };
}

export function SettingsForm({ org }: SettingsFormProps) {
  const [name, setName] = useState(org.name);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState("");
  const [syncProgress, setSyncProgress] = useState(0);
  const [hasKey, setHasKey] = useState(org.hasServiceAccount);
  const [delegatedUser, setDelegatedUser] = useState(org.delegatedUser);
  const [savingDelegate, setSavingDelegate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    setSyncProgress(0);

    const steps = [
      { label: "Connecting to Google Workspace...", pct: 5, delay: 400 },
      { label: "Fetching organization directory...", pct: 15, delay: 800 },
      { label: "Syncing user profiles & photos...", pct: 25, delay: 1200 },
      { label: "Scanning calendars for meetings...", pct: 40, delay: 2000 },
      { label: "Matching rooms with Meet links...", pct: 60, delay: 1500 },
      { label: "Detecting active participants...", pct: 75, delay: 1200 },
      { label: "Updating room presence data...", pct: 85, delay: 800 },
    ];

    const stepPromise = (async () => {
      for (const step of steps) {
        setSyncStep(step.label);
        setSyncProgress(step.pct);
        await new Promise((r) => setTimeout(r, step.delay));
      }
    })();

    const syncPromise = fetch(`/api/orgs/${org.id}/sync`, { method: "POST" })
      .then(async (res) => ({ res, data: await res.json() }));

    try {
      const [, { res, data }] = await Promise.all([stepPromise, syncPromise]);

      setSyncStep("Finishing up...");
      setSyncProgress(95);
      await new Promise((r) => setTimeout(r, 300));

      if (res.ok) {
        setSyncStep("Done!");
        setSyncProgress(100);
        setMessage("Sync completed successfully");
      } else if (res.status === 207) {
        const errors = Object.entries(data.results)
          .filter(([, v]) => v && typeof v === "object" && "error" in (v as Record<string, unknown>))
          .map(([k, v]) => `${k}: ${(v as Record<string, string>).error}`)
          .join("; ");
        setSyncStep("Completed with warnings");
        setSyncProgress(100);
        setMessage(`Sync partially failed: ${errors}`);
      } else {
        setSyncStep("Failed");
        setSyncProgress(100);
        setMessage(data.error ?? "Sync failed");
      }
    } catch {
      setSyncStep("Failed");
      setSyncProgress(100);
      setMessage("Failed to trigger sync");
    } finally {
      await new Promise((r) => setTimeout(r, 1500));
      setSyncing(false);
      setSyncStep("");
      setSyncProgress(0);
    }
  }

  async function handleSaveName() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orgs/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage("Organization name updated");
    } catch {
      setMessage("Failed to save organization name");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadKey(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      JSON.parse(text);

      const res = await fetch(`/api/orgs/${org.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAccountKey: text }),
      });
      if (!res.ok) throw new Error("Failed to upload");
      setHasKey(true);
      setMessage("Service account key uploaded successfully");
    } catch {
      setMessage("Invalid JSON file or upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Basic organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button onClick={handleSaveName} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Domain</Label>
            <p className="text-sm text-muted-foreground">{org.domain}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Workspace Integration</CardTitle>
              <CardDescription>
                Upload your Google service account key for calendar and meeting
                access
              </CardDescription>
            </div>
            <Badge variant={hasKey ? "default" : "secondary"}>
              {hasKey ? "Configured" : "Not configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delegatedUser">Workspace Admin Email</Label>
            <p className="text-xs text-muted-foreground">
              The admin email used to impersonate users for calendar and directory access
            </p>
            <div className="flex gap-2">
              <Input
                id="delegatedUser"
                type="email"
                placeholder="admin@yourcompany.com"
                value={delegatedUser}
                onChange={(e) => setDelegatedUser(e.target.value)}
              />
              <Button
                onClick={async () => {
                  setSavingDelegate(true);
                  setMessage(null);
                  try {
                    const res = await fetch(`/api/orgs/${org.id}/settings`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ delegatedUser }),
                    });
                    if (!res.ok) throw new Error();
                    setMessage("Delegated user updated");
                  } catch {
                    setMessage("Failed to update delegated user");
                  } finally {
                    setSavingDelegate(false);
                  }
                }}
                disabled={savingDelegate}
              >
                {savingDelegate ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceAccount">Service Account Key (JSON)</Label>
            <Input
              id="serviceAccount"
              type="file"
              accept=".json"
              onChange={handleUploadKey}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Upload the JSON key file for a Google service account with
              domain-wide delegation enabled. The key will be encrypted before
              storage.
            </p>
          </div>
        </CardContent>
      </Card>

      {hasKey && (
        <Card>
          <CardHeader>
            <CardTitle>Sync</CardTitle>
            <CardDescription>
              Manually trigger a calendar and meeting participant sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Force Sync Now"}
            </Button>

            {syncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{syncStep}</span>
                  <span className="font-medium tabular-nums">{syncProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}
