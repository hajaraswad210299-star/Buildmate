import { getRoles, createRole, updateRole, deleteRole } from "../lib/data/roles";
import {
  getTeamMembers,
  inviteStaffMember,
  updateStaffRole,
  toggleStaffStatus,
  resendInvite,
  cancelInvite,
} from "../lib/data/team";
import {
  hasPermission,
  getFirstAllowedRoute,
  normalizePermissions,
  PERMISSION_IMPLICATIONS,
} from "../lib/auth/permissions";
import {
  getSiteContent,
  saveSiteContentSection,
  getFaqItems,
  saveFaqItem,
} from "../lib/data/content";
import { getAdminAuditLogs } from "../lib/data/audit";

async function runTests() {
  console.log("=================================================");
  console.log("       STARTING SPEC_ADMIN PHASE 4 TESTS         ");
  console.log("=================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
    }
  }

  // TEST 1: Preset Roles Verification
  console.log("\n--- TEST 1: Verifying Preset Roles ---");
  const roles = await getRoles();
  const editorRole = roles.find((r) => r.name === "Editor Konten");
  const pemantauRole = roles.find((r) => r.name === "Pemantau Tukang");

  assert(Boolean(editorRole), "Preset role 'Editor Konten' exists");
  assert(
    Boolean(
      editorRole &&
        editorRole.permissions.includes("content.manage") &&
        editorRole.permissions.includes("dashboard.view")
    ),
    "Editor Konten has dashboard.view and content.manage permissions"
  );

  assert(Boolean(pemantauRole), "Preset role 'Pemantau Tukang' exists");
  assert(
    Boolean(
      pemantauRole &&
        pemantauRole.permissions.includes("workers.view") &&
        pemantauRole.permissions.includes("workers.review") &&
        pemantauRole.permissions.includes("orders.view")
    ),
    "Pemantau Tukang has workers.view, workers.review, orders.view permissions"
  );

  // TEST 2: Permission Implication Rule
  console.log("\n--- TEST 2: Permission Implication & Normalization ---");
  const normalized = normalizePermissions(["orders.manage"]);
  assert(
    normalized.includes("orders.manage") && normalized.includes("orders.view"),
    "Checking 'orders.manage' automatically implies 'orders.view'"
  );

  const workersNormalized = normalizePermissions(["workers.manage"]);
  assert(
    workersNormalized.includes("workers.manage") &&
      workersNormalized.includes("workers.view"),
    "Checking 'workers.manage' automatically implies 'workers.view'"
  );

  // TEST 3: Staff Invites (A10 & A00e)
  console.log("\n--- TEST 3: Inviting 2 Staff Members ---");
  if (!editorRole || !pemantauRole) {
    throw new Error("Missing preset roles");
  }

  const testEmailEditor = `experimentspace12+editor_${Date.now()}@gmail.com`;
  const testEmailPemantau = `experimentspace12+pemantau_${Date.now()}@gmail.com`;

  const inviteResult1 = await inviteStaffMember({
    fullName: "Ahmad Editor (Staf)",
    email: testEmailEditor,
    roleId: editorRole.id,
    invitedBy: "admin-super",
  });

  assert(!inviteResult1.error, `Invited Editor Konten staff successfully: ${inviteResult1.member?.email}`);

  const inviteResult2 = await inviteStaffMember({
    fullName: "Budi Pemantau (Staf)",
    email: testEmailPemantau,
    roleId: pemantauRole.id,
    invitedBy: "admin-super",
  });

  assert(!inviteResult2.error, `Invited Pemantau Tukang staff successfully: ${inviteResult2.member?.email}`);

  const team = await getTeamMembers();
  assert(team.length >= 3, `Team contains at least 3 members (actual: ${team.length})`);
  assert(Boolean(team[0]?.is_super_admin), "First team member is strictly Admin Utama (Crown1)");

  // TEST 4: Role-Based Access Isolation
  console.log("\n--- TEST 4: Verifying Permission Gates for Each Role ---");
  // Editor Konten checks
  assert(
    hasPermission(editorRole.permissions, "content.manage"),
    "Editor Konten CAN access content.manage"
  );
  assert(
    !hasPermission(editorRole.permissions, "workers.manage"),
    "Editor Konten CANNOT access workers.manage (403 forbidden)"
  );
  assert(
    !hasPermission(editorRole.permissions, "payouts.manage"),
    "Editor Konten CANNOT access payouts.manage (403 forbidden)"
  );
  assert(
    getFirstAllowedRoute(editorRole.permissions) === "/admin",
    "Editor Konten first allowed route is /admin"
  );

  // Pemantau Tukang checks
  assert(
    hasPermission(pemantauRole.permissions, "workers.view") &&
      hasPermission(pemantauRole.permissions, "workers.review"),
    "Pemantau Tukang CAN access workers.view and workers.review"
  );
  assert(
    !hasPermission(pemantauRole.permissions, "content.manage"),
    "Pemantau Tukang CANNOT access content.manage (403 forbidden)"
  );
  assert(
    !hasPermission(pemantauRole.permissions, "payouts.manage"),
    "Pemantau Tukang CANNOT access payouts.manage (403 forbidden)"
  );

  // TEST 5: Deactivate Staff (Ban + staff_status='disabled')
  console.log("\n--- TEST 5: Deactivating and Re-activating Staff Member ---");
  const memberToDisable = inviteResult1.member;
  if (memberToDisable) {
    const toggleRes1 = await toggleStaffStatus({
      userId: memberToDisable.id,
      newStatus: "disabled",
      actorId: "admin-super",
    });
    assert(toggleRes1.success, "Staff deactivated (ban applied, status='disabled')");

    const teamAfterDisable = await getTeamMembers();
    const updatedMember = teamAfterDisable.find((m) => m.id === memberToDisable.id);
    assert(updatedMember?.staff_status === "disabled", "Deactivated staff status reflected in team list");

    const toggleRes2 = await toggleStaffStatus({
      userId: memberToDisable.id,
      newStatus: "active",
      actorId: "admin-super",
    });
    assert(toggleRes2.success, "Staff re-activated (ban removed, status='active')");
  }

  // TEST 6: Custom Role CRUD & Immediate Propagation
  console.log("\n--- TEST 6: Custom Role Creation & Propagation ---");
  const uniqueRoleName = `Finance Supervisor ${Date.now()}`;
  const customRoleRes = await createRole({
    name: uniqueRoleName,
    description: "Khusus memantau mutasi transaksi dan pencairan dana mitra",
    permissions: ["dashboard.view", "transactions.view", "payouts.view", "payouts.manage"],
    createdBy: "admin-super",
  });

  assert(!customRoleRes.error && Boolean(customRoleRes.role?.id), `Created custom role: ${customRoleRes.role?.name}`);

  if (customRoleRes.role && inviteResult2.member) {
    // Assign member to custom role
    await updateStaffRole({
      userId: inviteResult2.member.id,
      roleId: customRoleRes.role.id,
      actorId: "admin-super",
    });
    const teamAfterUpdate = await getTeamMembers();
    const memberWithCustom = teamAfterUpdate.find((m) => m.id === inviteResult2.member.id);
    assert(
      memberWithCustom?.role_name === uniqueRoleName,
      `Staff member role changed to ${uniqueRoleName}`
    );

    // Update role permissions and verify propagation
    await updateRole(customRoleRes.role.id, {
      name: uniqueRoleName,
      description: "Updated description",
      permissions: ["dashboard.view", "transactions.view"],
    });

    const refreshedRoles = await getRoles();
    const updatedRole = refreshedRoles.find((r) => r.id === customRoleRes.role.id);
    assert(
      Boolean(updatedRole && !updatedRole.permissions.includes("payouts.manage")),
      "Role permissions update propagated immediately"
    );
  }

  // TEST 7: A11 CMS Content & FAQ Sync
  console.log("\n--- TEST 7: Updating Hero & FAQ in CMS -> Verify Read Back ---");
  await saveSiteContentSection(
    "hero",
    {
      title: "Solusi Perbaikan Rumah, Kualitas *Artisan*",
      subtitle: "Mitra tukang terverifikasi siap menyelesaikan masalah rumahmu dengan garansi pengerjaan 14 hari.",
      photo_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&auto=format&fit=crop&q=85",
      photo_alt: "Hunian nyaman dan terawat",
    },
    "admin-super"
  );

  const updatedContent = await getSiteContent();
  assert(
    updatedContent.hero.title === "Solusi Perbaikan Rumah, Kualitas *Artisan*",
    "CMS Hero section updated and synchronized"
  );

  const newFaq = await saveFaqItem({
    question: "Berapa lama estimasi tukang tiba di lokasi?",
    answer: "Tukang akan tiba sesuai jadwal slot waktu yang kamu tentukan saat pemesanan.",
    sort_order: 5,
    is_active: true,
  });

  assert(Boolean(newFaq.id), "New FAQ item saved to CMS");

  const activeFaqs = await getFaqItems(true);
  const foundFaq = activeFaqs.find((f) => f.question === "Berapa lama estimasi tukang tiba di lokasi?");
  assert(Boolean(foundFaq), "New FAQ item is active and readable for customer homepage");

  // TEST 8: Admin Audit Trail
  console.log("\n--- TEST 8: Verifying Admin Audit Trail ---");
  const auditLogs = await getAdminAuditLogs();
  assert(auditLogs.length > 0, `Audit trail contains ${auditLogs.length} logged events`);
  const hasStaffInvite = auditLogs.some((l) => l.event_type === "staff_invited");
  const hasRoleCreate = auditLogs.some((l) => l.event_type === "role_created");
  const hasContentUpdate = auditLogs.some((l) => l.event_type === "content_updated");

  assert(hasStaffInvite, "Audit trail logged 'staff_invited'");
  assert(hasRoleCreate, "Audit trail logged 'role_created'");
  assert(hasContentUpdate, "Audit trail logged 'content_updated'");

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
