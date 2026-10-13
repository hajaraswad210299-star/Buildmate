"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequirePermission } from "@/components/admin/PermissionGate";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  Crown1,
  UserAdd,
  AddCircle,
  More,
  TickCircle,
  CloseCircle,
  Refresh,
  Edit2,
  Trash,
  SearchNormal1,
  ShieldTick,
  ShieldCross,
  Lock,
  ArrowRight,
} from "@/lib/icons";
import {
  MODULE_PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSION_IMPLICATIONS,
  normalizePermissions,
  getAccessibleModulesSummary,
  Permission,
} from "@/lib/auth/permissions";
import { TeamMember } from "@/lib/data/team";
import { Role } from "@/lib/data/roles";
import { FilterDropdown } from "@/components/shared/FilterDropdown";

export default function AdminTeamPage() {
  const [activeTab, setActiveTab] = useState<"members" | "roles">("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Invite Drawer
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Edit Role Drawer (Create / Edit)
  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submittingRole, setSubmittingRole] = useState(false);

  // Change Role Modal
  const [changingMember, setChangingMember] = useState<TeamMember | null>(null);
  const [newSelectedRoleId, setNewSelectedRoleId] = useState("");
  const [submittingChangeRole, setSubmittingChangeRole] = useState(false);

  // Confirm Status Dialog
  const [confirmStatusMember, setConfirmStatusMember] = useState<TeamMember | null>(null);
  const [pendingNewStatus, setPendingNewStatus] = useState<"active" | "disabled">("disabled");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Delete Role Confirm
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [submittingDeleteRole, setSubmittingDeleteRole] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        fetch("/api/admin/team").then((r) => r.json()),
        fetch("/api/admin/roles").then((r) => r.json()),
      ]);

      if (membersRes.success) setMembers(membersRes.members || []);
      if (rolesRes.success) setRoles(rolesRes.roles || []);
    } catch {
      toast.error("Gagal memuat data tim dan peran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const staffCount = members.filter((m) => !m.is_super_admin).length;

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.role_name.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "all" && m.staff_status !== statusFilter) return false;
      if (roleFilter !== "all" && m.role_id !== roleFilter) return false;
      return true;
    });
  }, [members, search, statusFilter, roleFilter]);

  // Handle Invite Staff
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRoleId) {
      toast.error("Semua field undangan wajib diisi.");
      return;
    }

    if (staffCount >= 10) {
      toast.error("Batas maksimal 10 anggota staf telah tercapai.");
      return;
    }

    setSubmittingInvite(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: inviteName.trim(),
          email: inviteEmail.trim(),
          roleId: inviteRoleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim undangan");

      toast.success(data.message || `Undangan berhasil dikirim ke ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRoleId("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim undangan");
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Handle Change Role
  const handleChangeRole = async () => {
    if (!changingMember || !newSelectedRoleId) return;
    setSubmittingChangeRole(true);
    try {
      const res = await fetch(`/api/admin/team/${changingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_role",
          roleId: newSelectedRoleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah peran");

      toast.success("Peran staf berhasil diperbarui.");
      setChangingMember(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah peran");
    } finally {
      setSubmittingChangeRole(false);
    }
  };

  // Handle Toggle Status (Active / Disabled) with 5s Undo Toast
  const handleExecuteToggleStatus = async (member: TeamMember, status: "active" | "disabled") => {
    setSubmittingStatus(true);
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          newStatus: status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");

      setConfirmStatusMember(null);
      loadData();

      if (status === "disabled") {
        toast("Akun staf telah dinonaktifkan.", {
          action: {
            label: "Urungkan",
            onClick: () => handleExecuteToggleStatus(member, "active"),
          },
          duration: 5000,
        });
      } else {
        toast.success("Akun staf berhasil diaktifkan kembali.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Handle Resend Invite
  const handleResendInvite = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_invite" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim ulang");
      toast.success(`Undangan berhasil dikirim ulang ke ${member.email}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim ulang undangan");
    }
  };

  // Handle Cancel Invite
  const handleCancelInvite = async (member: TeamMember) => {
    if (!confirm(`Batalkan undangan untuk ${member.full_name} (${member.email})?`)) return;
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_invite" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan undangan");
      toast.success("Undangan berhasil dibatalkan.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan undangan");
    }
  };

  // Permission Checklist Logic (Kelola otomatis mencentang Lihat)
  const handleTogglePermission = (perm: string) => {
    setSelectedPermissions((prev) => {
      const exists = prev.includes(perm);
      let next: string[];

      if (exists) {
        next = prev.filter((p) => p !== perm);
        // If unchecking view permission, also uncheck any manage permissions in that module
        const mod = MODULE_PERMISSIONS.find((m) => m.viewPermission === perm);
        if (mod) {
          const manageKeys = mod.managePermissions.map((mp) => mp.permission);
          next = next.filter((p) => !manageKeys.includes(p as Permission));
        }
      } else {
        next = [...prev, perm];
        // Implication rule: checking manage automatically checks view
        const implied = PERMISSION_IMPLICATIONS[perm];
        if (implied) {
          implied.forEach((imp) => {
            if (!next.includes(imp)) next.push(imp);
          });
        }
      }

      return normalizePermissions(next);
    });
  };

  // Open Create Role Drawer
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPermissions([]);
    setIsRoleDrawerOpen(true);
  };

  // Open Edit Role Drawer
  const handleOpenEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setSelectedPermissions([...role.permissions]);
    setIsRoleDrawerOpen(true);
  };

  // Save Role (Create or Update)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Nama peran wajib diisi.");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error("Pilih minimal satu hak akses.");
      return;
    }

    setSubmittingRole(true);
    try {
      const url = editingRoleId ? `/api/admin/roles/${editingRoleId}` : "/api/admin/roles";
      const method = editingRoleId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: selectedPermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan peran");

      toast.success(data.message || "Peran berhasil disimpan.");
      setIsRoleDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan peran");
    } finally {
      setSubmittingRole(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setSubmittingDeleteRole(true);
    try {
      const res = await fetch(`/api/admin/roles/${roleToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus peran");

      toast.success(data.message || "Peran berhasil dihapus.");
      setRoleToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus peran");
    } finally {
      setSubmittingDeleteRole(false);
    }
  };

  const selectedSummary = useMemo(() => {
    return getAccessibleModulesSummary(selectedPermissions);
  }, [selectedPermissions]);

  return (
    <AdminShell>
      <RequirePermission adminOnly>
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-serif text-neutral-900 tracking-tight">
                  Tim & Hak Akses Staf
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lavender-100 text-lavender-700 border border-lavender-200">
                  Khusus Admin Utama
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Atur anggota staf operasional, buat peran kustom, dan kelola izin akses modul platform.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-1.5"
              >
                <Refresh size={14} className={loading ? "animate-spin" : ""} />
                <span>Segarkan</span>
              </Button>

              {activeTab === "members" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsInviteOpen(true)}
                  disabled={staffCount >= 10}
                  className="gap-1.5"
                >
                  <UserAdd size={16} />
                  <span>Undang Anggota ({staffCount}/10)</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateRole}
                  className="gap-1.5"
                >
                  <AddCircle size={16} />
                  <span>Buat Peran Baru</span>
                </Button>
              )}
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`pb-3 px-1 text-sm font-semibold transition-all relative ${
                activeTab === "members"
                  ? "text-lavender-600 border-b-2 border-lavender-600"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>Anggota Tim ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`pb-3 px-1 text-sm font-semibold transition-all relative ${
                activeTab === "roles"
                  ? "text-lavender-600 border-b-2 border-lavender-600"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>Peran & Izin Akses ({roles.length})</span>
            </button>
          </div>

          {/* TAB CONTENT: MEMBERS */}
          {activeTab === "members" && (
            <div className="space-y-4">
              {/* SEARCH & FILTERS BAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative w-full max-w-xs">
                    <SearchNormal1
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari anggota atau peran..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300 bg-white"
                    />
                  </div>

                  <FilterDropdown
                    value={statusFilter}
                    options={[
                      { value: "all", label: "Semua Status" },
                      { value: "active", label: "Aktif" },
                      { value: "invited", label: "Diundang" },
                      { value: "disabled", label: "Dinonaktifkan" },
                    ]}
                    onChange={(val) => setStatusFilter(val)}
                  />

                  <FilterDropdown
                    value={roleFilter}
                    options={[
                      { value: "all", label: "Semua Peran" },
                      ...roles.map((r) => ({ value: r.id, label: r.name })),
                    ]}
                    onChange={(val) => setRoleFilter(val)}
                  />
                </div>

                <div className="text-xs text-neutral-500 whitespace-nowrap">
                  Maksimal <strong className="text-neutral-800">10 staf</strong> pembantu (MVP).
                </div>
              </div>

              {/* MEMBERS TABLE */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                        <th className="py-3 px-4">Nama & Email</th>
                        <th className="py-3 px-4">Peran</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Terakhir Aktif</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredMembers.map((member, index) => {
                        const isSuperAdmin = member.is_super_admin;

                        return (
                          <tr
                            key={member.id}
                            className={`transition-colors ${
                              isSuperAdmin
                                ? "bg-lavender-50/20 hover:bg-lavender-50/40"
                                : "hover:bg-neutral-50/60"
                            }`}
                          >
                            {/* Avatar & Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.full_name}
                                    className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-200"
                                  />
                                ) : (
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-1 ${
                                      isSuperAdmin
                                        ? "bg-lavender-600 text-white ring-lavender-300"
                                        : "bg-neutral-100 text-neutral-700 ring-neutral-200"
                                    }`}
                                  >
                                    {member.full_name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-neutral-900">
                                      {member.full_name}
                                    </span>
                                    {isSuperAdmin && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        <Crown1 size={11} variant="Bold" />
                                        <span>Admin Utama</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-neutral-400 font-mono">
                                    {member.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                  isSuperAdmin
                                    ? "bg-lavender-100 text-lavender-800 border-lavender-200"
                                    : "bg-neutral-100 text-neutral-700 border-neutral-200"
                                }`}
                              >
                                {member.role_name}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isSuperAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700">
                                  <TickCircle size={13} variant="Bold" />
                                  <span>Aktif Permanen</span>
                                </span>
                              ) : member.staff_status === "active" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200 transition-all duration-300">
                                  <TickCircle size={12} variant="Bold" />
                                  <span>Aktif</span>
                                </span>
                              ) : member.staff_status === "invited" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 transition-all duration-300">
                                  <span>Undangan terkirim</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 transition-all duration-300">
                                  <Lock size={12} />
                                  <span>Nonaktif</span>
                                </span>
                              )}
                            </td>

                            {/* Last Active */}
                            <td className="py-3.5 px-4 text-neutral-500">
                              {member.last_sign_in_at
                                ? new Date(member.last_sign_in_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Belum pernah masuk"}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {isSuperAdmin ? (
                                <span
                                  className="text-[11px] text-neutral-400 italic"
                                  title="Admin Utama tidak bisa diubah dari sini"
                                >
                                  Terkunci
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setChangingMember(member);
                                      setNewSelectedRoleId(member.role_id || "");
                                    }}
                                    className="px-2 py-1 rounded-lg text-neutral-600 hover:text-lavender-700 hover:bg-neutral-100 font-medium transition-colors"
                                  >
                                    Ubah peran
                                  </button>

                                  {member.staff_status === "invited" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleResendInvite(member)}
                                        className="px-2 py-1 rounded-lg text-neutral-600 hover:text-lavender-700 hover:bg-neutral-100 font-medium transition-colors"
                                      >
                                        Kirim ulang
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelInvite(member)}
                                        className="px-2 py-1 rounded-lg text-danger-600 hover:bg-danger-50 font-medium transition-colors"
                                      >
                                        Batalkan
                                      </button>
                                    </>
                                  )}

                                  {member.staff_status === "active" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmStatusMember(member);
                                        setPendingNewStatus("disabled");
                                      }}
                                      className="px-2 py-1 rounded-lg text-danger-600 hover:bg-danger-50 font-medium transition-colors"
                                    >
                                      Nonaktifkan
                                    </button>
                                  )}

                                  {member.staff_status === "disabled" && (
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteToggleStatus(member, "active")}
                                      className="px-2 py-1 rounded-lg text-success-600 hover:bg-success-50 font-medium transition-colors"
                                    >
                                      Aktifkan
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ROLES */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => {
                  const summary = getAccessibleModulesSummary(role.permissions);

                  return (
                    <div
                      key={role.id}
                      className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-lavender-300 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-neutral-900">{role.name}</h3>
                              {role.is_preset && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                                  Bawaan
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                              {role.description || "Tidak ada deskripsi"}
                            </p>
                          </div>
                        </div>

                        {/* Badges / Stats */}
                        <div className="flex items-center gap-3 text-xs text-neutral-600 pt-1">
                          <span className="font-medium text-lavender-700 bg-lavender-50 px-2 py-0.5 rounded-md border border-lavender-100">
                            {role.permissions.length} hak akses
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span>{role.member_count || 0} anggota aktif</span>
                        </div>

                        {/* Modules summary */}
                        <div className="pt-2 border-t border-neutral-100">
                          <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5 uppercase tracking-wider">
                            Modul yang dapat dibuka:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {summary.map((mod) => (
                              <span
                                key={mod}
                                className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-50 text-neutral-700 border border-neutral-200"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditRole(role)}
                          className="flex-1"
                        >
                          <Edit2 size={13} className="mr-1" />
                          <span>Ubah Peran</span>
                        </Button>

                        {!role.is_preset && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRoleToDelete(role)}
                            disabled={(role.member_count || 0) > 0}
                            title={
                              (role.member_count || 0) > 0
                                ? `Pindahkan ${role.member_count} anggota ke peran lain dulu`
                                : "Hapus peran kustom"
                            }
                          >
                            <Trash size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* DRAWER: UNDANG ANGGOTA */}
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Undang Anggota Staf</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Kirim link aktivasi via email untuk bergabung ke tim
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Nama Lengkap <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Alamat Email <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Email undangan Supabase berbahasa Indonesia akan dikirim lewat SMTP Gmail.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Pilih Peran <span className="text-danger-500">*</span>
                  </label>
                  <FilterDropdown
                    value={inviteRoleId}
                    options={roles.map((r) => ({
                      value: r.id,
                      label: `${r.name} (${r.permissions.length} hak akses)`,
                    }))}
                    onChange={(val) => setInviteRoleId(val)}
                    fullWidth
                    size="md"
                    placeholder="-- Pilih Peran Staf --"
                  />
                </div>

                {inviteRoleId && (
                  <div className="p-3.5 rounded-xl bg-lavender-50/60 border border-lavender-200/80 space-y-2 text-xs">
                    <span className="font-semibold text-lavender-900 block">
                      Ringkasan Hak Akses:
                    </span>
                    <p className="text-lavender-700 text-[11px]">
                      {roles.find((r) => r.id === inviteRoleId)?.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {roles
                        .find((r) => r.id === inviteRoleId)
                        ?.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-white text-lavender-800 font-medium border border-lavender-200"
                          >
                            {p}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </form>

              <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-25">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={submittingInvite}
                  onClick={handleSendInvite}
                >
                  {submittingInvite ? "Mengirim..." : "Kirim Undangan"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* DRAWER: BUAT / EDIT PERAN DENGAN CHECKLIST IZIN */}
        {isRoleDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {editingRoleId ? "Ubah Peran & Hak Akses" : "Buat Peran Baru"}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Tentukan modul yang dapat dilihat dan dikelola oleh staf
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRoleDrawerOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Nama Peran <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Contoh: Supervisor Operasional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Deskripsi Peran
                  </label>
                  <textarea
                    rows={2}
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="Tuliskan tugas utama peran ini..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                  />
                </div>

                {/* CHECKLIST HAK AKSES PER MODUL */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                      Checklist Hak Akses per Modul
                    </label>
                    <span className="text-[11px] text-lavender-700 font-medium">
                      {selectedPermissions.length} dipilih
                    </span>
                  </div>

                  <div className="space-y-3">
                    {MODULE_PERMISSIONS.map((mod) => {
                      const hasView = mod.viewPermission
                        ? selectedPermissions.includes(mod.viewPermission)
                        : true;

                      return (
                        <div
                          key={mod.moduleKey}
                          className="p-3.5 rounded-xl border border-neutral-200/90 bg-neutral-50/40 space-y-2.5 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">
                              {mod.moduleName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {mod.description}
                            </span>
                          </div>

                          <div className="space-y-1.5 pl-1">
                            {/* View permission */}
                            {mod.viewPermission && (
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(mod.viewPermission)}
                                  onChange={() => handleTogglePermission(mod.viewPermission!)}
                                  className="w-4 h-4 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-400"
                                />
                                <span>Lihat ({mod.viewPermission})</span>
                              </label>
                            )}

                            {/* Manage permissions */}
                            {mod.managePermissions.map((mp) => (
                              <label
                                key={mp.permission}
                                className="flex items-start gap-2 cursor-pointer text-xs text-neutral-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(mp.permission)}
                                  onChange={() => handleTogglePermission(mp.permission)}
                                  className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-lavender-600 focus:ring-lavender-400"
                                />
                                <div>
                                  <span className="font-medium text-neutral-900">
                                    {mp.label}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 block">
                                    {mp.description}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RINGKASAN AKSES */}
                <div className="p-3.5 rounded-xl bg-lavender-50/70 border border-lavender-200/80 space-y-1.5 text-xs">
                  <span className="font-semibold text-lavender-900 block">
                    Ringkasan Modul yang Terbuka:
                  </span>
                  <p className="text-lavender-700 text-[11px] leading-relaxed">
                    Peran ini dapat membuka:{" "}
                    <strong>{selectedSummary.join(", ") || "Belum ada modul dipilih"}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-25">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsRoleDrawerOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={submittingRole}
                  onClick={handleSaveRole}
                >
                  {submittingRole ? "Menyimpan..." : "Simpan Peran"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: UBAH PERAN ANGGOTA */}
        {changingMember && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-sm w-full p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">Ubah Peran Staf</h3>
                <p className="text-xs text-neutral-500">
                  Ubah peran untuk <strong>{changingMember.full_name}</strong> ({changingMember.email}).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Pilih Peran Baru:
                </label>
                <FilterDropdown
                  value={newSelectedRoleId}
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.permissions.length} izin)`,
                  }))}
                  onChange={(val) => setNewSelectedRoleId(val)}
                  fullWidth
                  size="md"
                  placeholder="Pilih Peran Staf..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setChangingMember(null)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={submittingChangeRole}
                  onClick={handleChangeRole}
                >
                  {submittingChangeRole ? "Menyimpan..." : "Simpan Peran"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG KONFIRMASI: NONAKTIFKAN STAF */}
        {confirmStatusMember && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-sm w-full p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center">
                  <ShieldCross size={24} variant="Bulk" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Nonaktifkan Akun Staf?
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Akun <strong>{confirmStatusMember.full_name}</strong> akan langsung diblokir dan sesinya tidak dapat diperpanjang. Kamu dapat mengaktifkannya kembali kapan saja.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmStatusMember(null)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={submittingStatus}
                  onClick={() => handleExecuteToggleStatus(confirmStatusMember, "disabled")}
                >
                  {submittingStatus ? "Memproses..." : "Ya, Nonaktifkan"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG KONFIRMASI: HAPUS PERAN KUSTOM */}
        {roleToDelete && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-sm w-full p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center">
                  <Trash size={22} />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Hapus Peran &quot;{roleToDelete.name}&quot;?
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Peran ini akan dihapus secara permanen dari daftar peran staf platform.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRoleToDelete(null)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={submittingDeleteRole}
                  onClick={handleDeleteRole}
                >
                  {submittingDeleteRole ? "Menghapus..." : "Ya, Hapus Peran"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </RequirePermission>
    </AdminShell>
  );
}
