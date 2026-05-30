import { cn } from "@/lib/utils";
import { Member } from "@/types";

const placeholderUrl = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=121214&textColor=D4AF37`;

export function getMemberPhotoUrl(member: Pick<Member, "name"> & { image?: string }): string {
  return member.image || placeholderUrl(member.name);
}

interface MemberAvatarProps {
  member: Pick<Member, "name"> & { image?: string };
  className?: string;
  fallbackClassName?: string;
}

export function MemberAvatar({ member, className = "h-14 w-14", fallbackClassName }: MemberAvatarProps) {
  if (member.image) {
    return (
      <img
        src={member.image}
        alt={member.name}
        className={cn("object-cover border border-[#c4b396]/30 shrink-0 rounded-full", className)}
        onError={(event) => {
          (event.target as HTMLImageElement).src = placeholderUrl(member.name);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[#c4b396]/15 border border-[#c4b396]/30 flex items-center justify-center text-[#c4b396] font-bold shrink-0",
        className,
        fallbackClassName
      )}
    >
      {member.name.charAt(0)}
    </div>
  );
}
