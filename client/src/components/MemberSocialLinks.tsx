import { Facebook, Instagram, Linkedin } from "lucide-react";
import { Member } from "@/types";

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

type SocialPerson = Pick<Member, "instagram" | "facebook" | "linkedin">;

interface MemberSocialLinksProps {
  person: SocialPerson;
  variant?: "card" | "inline";
}

export function MemberSocialLinks({ person, variant = "card" }: MemberSocialLinksProps) {
  const links = [
    { key: "instagram", href: person.instagram, label: "Instagram", Icon: Instagram },
    { key: "facebook", href: person.facebook, label: "Facebook", Icon: Facebook },
    { key: "linkedin", href: person.linkedin, label: "LinkedIn", Icon: Linkedin },
  ].filter((link) => Boolean(link.href));

  if (links.length === 0) return null;

  if (variant === "inline") {
    return (
      <div className="space-y-1">
        {links.map(({ key, href, label, Icon }) => (
          <p key={key} className="flex items-start gap-1.5 break-all">
            <Icon className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" />
            <a
              href={normalizeUrl(href!)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              {label}
            </a>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={normalizeUrl(href!)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 hover:border-[#c4b396]/30 transition-all"
        >
          <Icon className="h-4 w-4 text-[#c4b396] shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">{label}</p>
            <p className="text-xs text-[#c4b396] truncate">{href!.replace(/^https?:\/\//, "")}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function hasSocialLinks(person: SocialPerson): boolean {
  return Boolean(person.instagram || person.facebook || person.linkedin);
}

export function hasContactDetails(
  person: Pick<Member, "email" | "phone" | "website" | "instagram" | "facebook" | "linkedin">
): boolean {
  return Boolean(
    person.email ||
      person.phone ||
      person.website ||
      person.instagram ||
      person.facebook ||
      person.linkedin
  );
}
