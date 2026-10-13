import { getRoles } from "../lib/data/roles";
import { inviteStaffMember, acceptStaffInvite, getTeamMembers } from "../lib/data/team";
import { getFirstAllowedRoute } from "../lib/auth/permissions";
import { getAdminAuditLogs } from "../lib/data/audit";
import { createAdminClient } from "../lib/supabase/admin";

async function runAcceptInviteE2ETest() {
  console.log("=================================================");
  console.log("   TESTING END-TO-END STAFF ACCEPT INVITE FLOW   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  const roles = await getRoles();
  const editorRole = roles.find((r) => r.name === "Editor Konten");
  if (!editorRole) throw new Error("Editor Konten role not found");

  const testEmail = `experimentspace12+invite_e2e_${Date.now()}@gmail.com`;
  const initialName = "Staff Uji Coba";

  // 1. Admin invites staff
  console.log("Step 1: Admin invites new staff...");
  const inviteRes = await inviteStaffMember({
    email: testEmail,
    fullName: initialName,
    roleId: editorRole.id,
    actorId: "admin-actor",
    actorName: "Admin Utama",
  });

  assert(Boolean(inviteRes.member), "Invite successfully generated");
  if (!inviteRes.member) throw new Error("Invite member undefined");
  const staff = inviteRes.member;
  assert(staff.staff_status === "invited", "Initial staff_status is 'invited'");
  assert(staff.role_name === "Editor Konten", "Assigned role is 'Editor Konten'");

  const staffId = staff.id;

  // 2. Verify state before acceptance
  console.log("\nStep 2: Verify state before accept...");
  const membersBefore = await getTeamMembers();
  const staffBefore = membersBefore.find((m) => m.id === staffId);
  assert(staffBefore?.role === "staff", "Profile role is 'staff'");
  assert(staffBefore?.staff_status === "invited", "Profile staff_status is 'invited'");

  // 3. Staff accepts invite and sets up password + name
  console.log("\nStep 3: Staff accepts invite & sets up password (acceptStaffInvite)...");
  const updatedFullName = "Staff Uji Coba Terverifikasi";
  const newPassword = "PasswordBaru123!";

  const acceptRes = await acceptStaffInvite({
    userId: staffId,
    fullName: updatedFullName,
    password: newPassword,
  });

  assert(acceptRes.success === true, "acceptStaffInvite returned success");
  assert(acceptRes.roleName === "Editor Konten", "Returned roleName is 'Editor Konten'");
  assert(Boolean(acceptRes.permissions?.includes("content.manage")), "Has content.manage permission");

  const nextRoute = getFirstAllowedRoute(acceptRes.permissions || [], false);
  assert(nextRoute === "/admin", `First allowed route is '${nextRoute}'`);

  // 4. Verify state after acceptance
  console.log("\nStep 4: Verify state after accept...");
  const membersAfter = await getTeamMembers();
  const staffAfter = membersAfter.find((m) => m.id === staffId);
  assert(staffAfter?.staff_status === "active", "Staff status updated to 'active'");
  assert(staffAfter?.full_name === updatedFullName, `Staff full_name updated to '${updatedFullName}'`);

  // 5. Verify Team listing
  console.log("\nStep 5: Verify team members list reflects active status...");
  const members = await getTeamMembers();
  const activeStaff = members.find((m) => m.id === staffId);
  assert(activeStaff?.staff_status === "active", "Team members list reflects active status");
  assert(activeStaff?.full_name === updatedFullName, "Team members list reflects updated name");

  // 6. Verify Audit Log
  console.log("\nStep 6: Verify admin audit trail...");
  const auditLogs = await getAdminAuditLogs();
  const acceptedAudit = auditLogs.find(
    (l) => l.event_type === "staff_invite_accepted" && (l.details as any)?.staff_id === staffId
  );
  assert(Boolean(acceptedAudit), "Audit event 'staff_invite_accepted' was recorded");

  console.log(`\n=================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================`);

  if (failed > 0) process.exit(1);
}

runAcceptInviteE2ETest().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
