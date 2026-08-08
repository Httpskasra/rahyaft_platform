"use client";

import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  Phone,
  UserRound,
  Users,
} from "lucide-react";

import type { DepartmentNodeData } from "./chart-layout";

export function DepartmentNode({
  data,
  selected,
}: NodeProps) {
  const nodeData =
    data as DepartmentNodeData;

  const {
    department,
    isExpanded,
  } = nodeData;

  const managers =
    department.employees.filter(
      (employee) =>
        employee.subordinateCount > 0,
    );

  const primaryManager =
    managers[0] ?? null;

  const toggleDepartment = () => {
    window.dispatchEvent(
      new CustomEvent(
        "organization-chart:toggle-department",
        {
          detail: {
            departmentId:
              department.id,
          },
        },
      ),
    );
  };

  return (
    <article
      className={[
        "w-[340px]",
        "overflow-hidden",
        "rounded-2xl",
        "border",
        "bg-white",
        "shadow-lg",
        "transition",
        "dark:bg-gray-900",
        selected
          ? "border-brand-500 ring-4 ring-brand-500/10"
          : "border-gray-200 dark:border-gray-700",
      ].join(" ")}
      dir="rtl"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="
          !h-3
          !w-3
          !border-2
          !border-white
          !bg-brand-500
        "
      />

      <header
        className="
          border-b
          border-gray-100
          bg-gradient-to-l
          from-brand-50
          to-white
          p-4
          dark:border-gray-800
          dark:bg-gray-900
          dark:bg-none
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-brand-500
                text-white
                shadow-sm
              "
            >
              <Building2 size={21} />
            </div>

            <div className="min-w-0">
              <h3
                className="
                  truncate
                  text-sm
                  font-bold
                  text-gray-900
                  dark:text-white
                "
                title={department.name}
              >
                {department.name}
              </h3>

              <div
                className="
                  mt-1.5
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                <Users size={14} />

                <span>
                  {department.employeeCount.toLocaleString(
                    "fa-IR",
                  )}{" "}
                  کارمند
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="
              nodrag
              nopan
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-gray-200
              bg-white
              text-gray-500
              transition
              hover:border-brand-300
              hover:text-brand-600
              dark:border-gray-700
              dark:bg-gray-800
              dark:text-gray-300
            "
            onClick={toggleDepartment}
            aria-label={
              isExpanded
                ? "بستن اعضای دپارتمان"
                : "نمایش اعضای دپارتمان"
            }
          >
            {isExpanded ? (
              <ChevronUp size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </button>
        </div>
      </header>

      <div className="p-4">
        {primaryManager ? (
          <div
            className="
              rounded-xl
              border
              border-brand-100
              bg-brand-25
              p-3
              dark:border-brand-500/20
              dark:bg-brand-500/10
            "
          >
            <div className="mb-2 flex items-center gap-2">
              <Crown
                size={16}
                className="text-brand-600"
              />

              <span
                className="
                  text-[11px]
                  font-medium
                  text-brand-600
                  dark:text-brand-400
                "
              >
                مسئول دپارتمان
              </span>
            </div>

            <div
              className="
                text-sm
                font-semibold
                text-gray-900
                dark:text-white
              "
            >
              {primaryManager.name}
            </div>

            {primaryManager.roles.length >
              0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {primaryManager.roles.map(
                  (role) => (
                    <span
                      key={role.id}
                      className="
                        rounded-md
                        bg-white
                        px-2
                        py-1
                        text-[10px]
                        text-gray-600
                        dark:bg-gray-900
                        dark:text-gray-300
                      "
                    >
                      {role.name}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className="
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-dashed
              border-gray-200
              p-3
              text-xs
              text-gray-400
              dark:border-gray-700
            "
          >
            <UserRound size={16} />
            مدیر دپارتمان تعیین نشده است
          </div>
        )}

        {isExpanded && (
          <div
            className="
              nodrag
              nopan
              mt-4
              max-h-[450px]
              space-y-2
              overflow-y-auto
              pl-1
            "
          >
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
              "
            >
              <span
                className="
                  text-xs
                  font-semibold
                  text-gray-700
                  dark:text-gray-200
                "
              >
                اعضای دپارتمان
              </span>

              <span
                className="
                  rounded-full
                  bg-gray-100
                  px-2
                  py-0.5
                  text-[10px]
                  text-gray-500
                  dark:bg-gray-800
                "
              >
                {department.employees.length.toLocaleString(
                  "fa-IR",
                )}{" "}
                نفر
              </span>
            </div>

            {department.employees.length ===
            0 ? (
              <div
                className="
                  rounded-xl
                  bg-gray-50
                  py-5
                  text-center
                  text-xs
                  text-gray-400
                  dark:bg-gray-800/50
                "
              >
                عضوی در این دپارتمان نیست.
              </div>
            ) : (
              department.employees.map(
                (employee) => (
                  <div
                    key={employee.id}
                    className="
                      rounded-xl
                      border
                      border-gray-100
                      bg-gray-50/60
                      p-3
                      dark:border-gray-800
                      dark:bg-gray-800/40
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-2
                      "
                    >
                      <div className="min-w-0">
                        <div
                          className="
                            truncate
                            text-xs
                            font-semibold
                            text-gray-800
                            dark:text-gray-100
                          "
                        >
                          {employee.name}
                        </div>

                        {employee.employeeCode && (
                          <div
                            className="
                              mt-1
                              text-[10px]
                              text-gray-400
                            "
                          >
                            کد پرسنلی:{" "}
                            {
                              employee.employeeCode
                            }
                          </div>
                        )}
                      </div>

                      {employee.subordinateCount >
                        0 && (
                        <span
                          className="
                            shrink-0
                            rounded-lg
                            bg-brand-50
                            px-2
                            py-1
                            text-[10px]
                            text-brand-600
                            dark:bg-brand-500/10
                            dark:text-brand-400
                          "
                        >
                          مدیر{" "}
                          {employee.subordinateCount.toLocaleString(
                            "fa-IR",
                          )}{" "}
                          نفر
                        </span>
                      )}
                    </div>

                    <div
                      className="
                        mt-2
                        flex
                        items-center
                        gap-1.5
                        text-[10px]
                        text-gray-400
                      "
                    >
                      <Phone size={12} />
                      <span dir="ltr">
                        {employee.phoneNumber}
                      </span>
                    </div>

                    {employee.roles.length >
                      0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {employee.roles.map(
                          (role) => (
                            <span
                              key={role.id}
                              className="
                                rounded-md
                                border
                                border-gray-100
                                bg-white
                                px-1.5
                                py-0.5
                                text-[10px]
                                text-gray-500
                                dark:border-gray-700
                                dark:bg-gray-900
                                dark:text-gray-300
                              "
                            >
                              {role.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ),
              )
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !h-3
          !w-3
          !border-2
          !border-white
          !bg-brand-500
        "
      />
    </article>
  );
}
