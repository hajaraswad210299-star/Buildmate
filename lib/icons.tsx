"use client";

import React from "react";
import * as Iconsax from "iconsax-react";

export type IconVariant = "Linear" | "Bold" | "Bulk" | "Outline" | "TwoTone" | "Broken";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  variant?: IconVariant;
  className?: string;
}

/**
 * Higher-order component wrapping Iconsax icons.
 * Crucial fix for React 19:
 * React 19 no longer applies Component.defaultProps on function/forwardRef components.
 * This wrapper guarantees that `color="currentColor"`, `size=20`, and `variant="Linear"`
 * are explicitly passed down to Iconsax so SVG paths render stroke and fill correctly.
 * In development, if an icon is undefined/missing, it renders a visible placeholder + console.warn.
 */
export function createIcon(name: string, Component?: React.ComponentType<IconProps>) {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>(function IconComponent(
    {
      size = 20,
      color = "currentColor",
      variant = "Linear",
      className = "",
      ...rest
    },
    ref
  ) {
    if (!Component) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[BuildMate Icons] Icon "${name}" tidak ditemukan di iconsax-react.`);
      }
      return (
        <span
          className={`inline-block border border-dashed border-neutral-400 bg-neutral-100/90 rounded text-[9px] text-neutral-500 font-mono text-center leading-none ${className}`}
          style={{ width: size, height: size }}
          title={`[Missing Icon: ${name}]`}
        />
      );
    }

    return (
      <Component
        ref={ref}
        size={size}
        color={color}
        variant={variant}
        className={className}
        {...rest}
      />
    );
  });

  IconComponent.displayName = name;
  return IconComponent;
}

// Map and wrap all Iconsax icons required by BuildMate (B7.6)
export const Home2 = createIcon("Home2", Iconsax.Home2);
export const SearchNormal1 = createIcon("SearchNormal1", Iconsax.SearchNormal1);
export const Filter = createIcon("Filter", Iconsax.Filter);
export const Sort = createIcon("Sort", Iconsax.Sort);
export const ReceiptText = createIcon("ReceiptText", Iconsax.ReceiptText);
export const ProfileCircle = createIcon("ProfileCircle", Iconsax.ProfileCircle);
export const User = createIcon("User", Iconsax.User);
export const Element3 = createIcon("Element3", Iconsax.Element3);
export const UserOctagon = createIcon("UserOctagon", Iconsax.UserOctagon);
export const Profile2User = createIcon("Profile2User", Iconsax.Profile2User);
export const Category2 = createIcon("Category2", Iconsax.Category2);
export const Card = createIcon("Card", Iconsax.Card);
export const WalletMoney = createIcon("WalletMoney", Iconsax.WalletMoney);
export const Wallet3 = createIcon("Wallet3", Iconsax.Wallet3);
export const Briefcase = createIcon("Briefcase", Iconsax.Briefcase);
export const Setting2 = createIcon("Setting2", Iconsax.Setting2);
export const LogoutCurve = createIcon("LogoutCurve", Iconsax.LogoutCurve);
export const Notification = createIcon("Notification", Iconsax.Notification);
export const Calendar1 = createIcon("Calendar1", Iconsax.Calendar1);
export const Clock = createIcon("Clock", Iconsax.Clock);
export const Location = createIcon("Location", Iconsax.Location);
export const Map1 = createIcon("Map1", Iconsax.Map1);
export const Routing2 = createIcon("Routing2", Iconsax.Routing2);
export const Setting4 = createIcon("Setting4", Iconsax.Setting4);
export const Camera = createIcon("Camera", Iconsax.Camera);
export const Gallery = createIcon("Gallery", Iconsax.Gallery);
export const GalleryAdd = createIcon("GalleryAdd", Iconsax.GalleryAdd);
export const GalleryTick = createIcon("GalleryTick", Iconsax.GalleryTick);
export const Verify = createIcon("Verify", Iconsax.Verify);
export const ShieldTick = createIcon("ShieldTick", Iconsax.ShieldTick);
export const Crown1 = createIcon("Crown1", Iconsax.Crown1);
export const Sms = createIcon("Sms", Iconsax.Sms);
export const SmsTracking = createIcon("SmsTracking", Iconsax.SmsTracking);
export const Lock = createIcon("Lock", Iconsax.Lock);
export const Eye = createIcon("Eye", Iconsax.Eye);
export const EyeSlash = createIcon("EyeSlash", Iconsax.EyeSlash);
export const TickCircle = createIcon("TickCircle", Iconsax.TickCircle);
export const CloseCircle = createIcon("CloseCircle", Iconsax.CloseCircle);
export const InfoCircle = createIcon("InfoCircle", Iconsax.InfoCircle);
export const Warning2 = createIcon("Warning2", Iconsax.Warning2);
export const AddCircle = createIcon("AddCircle", Iconsax.AddCircle);
export const Edit2 = createIcon("Edit2", Iconsax.Edit2);
export const Trash = createIcon("Trash", Iconsax.Trash);
export const Copy = createIcon("Copy", Iconsax.Copy);
export const ArrowLeft2 = createIcon("ArrowLeft2", Iconsax.ArrowLeft2);
export const ArrowRight = createIcon("ArrowRight", Iconsax.ArrowRight);
export const ArrowDown2 = createIcon("ArrowDown2", Iconsax.ArrowDown2);
export const ArrowRight3 = createIcon("ArrowRight3", Iconsax.ArrowRight3);
export const ArrowUp2 = createIcon("ArrowUp2", Iconsax.ArrowUp2);
export const ArrowUp = createIcon("ArrowUp", Iconsax.ArrowUp);
export const ArrowDown = createIcon("ArrowDown", Iconsax.ArrowDown);
export const More = createIcon("More", Iconsax.More);
export const Flash = createIcon("Flash", Iconsax.Flash);
export const ShieldCross = createIcon("ShieldCross", Iconsax.ShieldCross);
export const Like1 = createIcon("Like1", Iconsax.Like1);
export const MoneyRecive = createIcon("MoneyRecive", Iconsax.MoneyRecive);
export const Chart = createIcon("Chart", Iconsax.Chart);
export const Lock1 = createIcon("Lock1", Iconsax.Lock1);
export const UserTick = createIcon("UserTick", Iconsax.UserTick);
export const UserEdit = createIcon("UserEdit", Iconsax.UserEdit);
export const DocumentDownload = createIcon("DocumentDownload", Iconsax.DocumentDownload);
export const Menu = createIcon("Menu", Iconsax.Menu);
export const HambergerMenu = createIcon("HambergerMenu", Iconsax.HambergerMenu);
export const SidebarLeft = createIcon("SidebarLeft", Iconsax.SidebarLeft);
export const CardTick = createIcon("CardTick", Iconsax.CardTick);
export const Drop = createIcon("Drop", Iconsax.Drop);
export const Brush2 = createIcon("Brush2", Iconsax.Brush2);
export const Ruler = createIcon("Ruler", Iconsax.Ruler);
export const Wind = createIcon("Wind", Iconsax.Wind2);
export const Refresh = createIcon("Refresh", Iconsax.Refresh);
export const Refresh2 = createIcon("Refresh2", Iconsax.Refresh2);
export const Sun1 = createIcon("Sun1", Iconsax.Sun1);
export const Sun = createIcon("Sun", Iconsax.Sun);
export const CloudSunny = createIcon("CloudSunny", Iconsax.CloudSunny);
export const SearchStatus = createIcon("SearchStatus", Iconsax.SearchStatus);
export const SearchStatus1 = createIcon("SearchStatus1", Iconsax.SearchStatus1);
export const Star1 = createIcon("Star1", Iconsax.Star1);
export const DirectRight = createIcon("DirectRight", Iconsax.DirectRight);
export const Heart = createIcon("Heart", Iconsax.Heart);
export const MessageQuestion = createIcon("MessageQuestion", Iconsax.MessageQuestion);
export const Call = createIcon("Call", Iconsax.Call);

// Aliases for convenience
export const Calendar = Calendar1;
export const ArrowRight2 = ArrowRight;
export const Sparkles = Crown1;
export const Award = Verify;

/**
 * WhatsApp SVG Icon (since standard Iconsax lacks WhatsApp branding)
 */
export function WhatsappIcon({
  size = 20,
  className = "",
  color = "currentColor",
}: IconProps) {
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
