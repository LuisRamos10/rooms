"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  memberCount: number;
  roomCount: number;
  hasServiceAccount: boolean;
  orgName: string;
  domain: string;
}

interface SyncLogEntry {
  id: string;
  syncType: string;
  status: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface AdminDashboardProps {
  stats: AdminStats;
  recentSyncs: SyncLogEntry[];
}

export function AdminDashboard({ stats, recentSyncs }: AdminDashboardProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Organization overview and sync health
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{stats.orgName}</p>
            <p className="text-xs text-muted-foreground">{stats.domain}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.memberCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rooms Today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.roomCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Google Integration</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={stats.hasServiceAccount ? "default" : "secondary"}>
              {stats.hasServiceAccount ? "Connected" : "Not configured"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>Last 20 sync operations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSyncs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentSyncs.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">
                      {sync.syncType}
                    </Badge>
                    <span className="text-sm">
                      {new Date(sync.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sync.errorMessage && (
                      <span className="max-w-[200px] truncate text-xs text-destructive">
                        {sync.errorMessage}
                      </span>
                    )}
                    <Badge
                      variant={
                        sync.status === "SUCCESS"
                          ? "default"
                          : sync.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {sync.status}
                    </Badge>
                    {sync.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(
                          (new Date(sync.completedAt).getTime() -
                            new Date(sync.startedAt).getTime()) /
                            1000
                        )}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
