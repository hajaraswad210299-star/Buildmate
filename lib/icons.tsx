import React from "react";
export {
  Home2,
  SearchNormal1,
  Filter,
  Sort,
  ReceiptText,
  ProfileCircle,
  User,
  Element3,
  UserOctagon,
  Profile2User,
  Category2,
  Card,
  WalletMoney,
  Wallet3,
  Briefcase,
  Setting2,
  LogoutCurve,
  Notification,
  Calendar1,
  Clock,
  Location,
  Routing2,
  Setting4,
  Camera,
  Gallery,
  GalleryAdd,
  GalleryTick,
  Verify,
  ShieldTick,
  Crown1,
  Sms,
  SmsTracking,
  Lock,
  Eye,
  EyeSlash,
  TickCircle,
  CloseCircle,
  InfoCircle,
  Warning2,
  AddCircle,
  Edit2,
  Trash,
  Copy,
  ArrowLeft2,
  ArrowRight,
  ArrowDown2,
  ArrowRight3,
  More,
  Flash,
  ShieldCross,
  Like1,
  MoneyRecive,
  Chart,
  Lock1,
  UserTick,
  UserEdit,
  DocumentDownload,
  Menu,
  Drop,
  Brush2,
  Ruler,
  Wind2 as Wind,
} from "iconsax-react";

/**
 * WhatsApp SVG Icon (since standard Iconsax may vary or lack WhatsApp branding)
 */
export function WhatsappIcon({
  size = 20,
  className = "",
  color = "currentColor",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.46-.3z" />
    </svg>
  );
}
