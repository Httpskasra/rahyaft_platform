import { ChevronRight } from "lucide-react";
import type { UserData } from "@/lib/api/users";
import { cn } from "@/lib/cn";

export function UserCard({
  user,
  active,
  onClick,
}: {
  user: UserData;
  active: boolean;
  onClick: () => void;
}) {
  const roleCount = user.roles?.length ?? 0;
  const initials =
    user.name ?
      user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "؟";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active ?
          "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50",
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
              active ?
                "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400",
            )}>
            {initials}
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                active ?
                  "text-brand-700 dark:text-brand-300"
                : "text-gray-800 dark:text-white/90",
              )}>
              {user.name || "بدون نام"}
            </p>
            <p
              className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              dir="ltr">
              {user.phoneNumber || "—"}
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500",
          )}
        />
      </div>

      {roleCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {user.roles.slice(0, 3).map((ur) => (
            <span
              key={ur.role.id}
              className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {ur.role.name}
            </span>
          ))}
          {roleCount > 3 && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              +{roleCount - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── UserDetail Panel ─────────────────────────────────────────

