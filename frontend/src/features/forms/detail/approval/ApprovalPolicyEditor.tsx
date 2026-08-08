/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Plus, Save, Trash2, UserCheck,
} from "lucide-react";
import { rolesApi } from "@/lib/api/roles";
import {
  approvalsApi, type ApprovalPolicy, type ApprovalStep,
} from "@/lib/api/approvals";

interface Role {
  id: string;
  name: string;
}

export function ApprovalPolicyEditor({
  formId,
  onPolicyChange,
}: {
  formId: string;
  onPolicyChange: () => void;
}) {
  const [, setPolicy] = useState<ApprovalPolicy | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRes, rolesRes] = await Promise.all([
        approvalsApi.getPolicy(formId),
        rolesApi.findAll(), // ✅ use rolesApi instead of fetch
      ]);
      const policyData = policyRes.data;
      setPolicy(policyData);
      // setSteps(
      //   policyData?.steps.map((s) => ({ order: s.order, roleId: s.roleId })) ??
      //     [],
      // );
      setSteps(
        policyData?.steps?.map((s) => ({
          stepOrder: s.stepOrder,
          roleId: s.roleId,
        })) ?? [],
      );
      setRoles((rolesRes.data as any) ?? []); // rolesRes.data is the array
    } catch (err) {
      console.error("Load error:", err);
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const addStep = () =>
    setSteps((prev) => [...prev, { stepOrder: prev.length + 1, roleId: "" }]);
  const removeStep = (idx: number) => {
    const newSteps = steps.filter((_, i) => i !== idx);
    setSteps(newSteps.map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };
  const updateStep = (idx: number, roleId: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, roleId } : s)));
  };

  const savePolicy = async () => {
    const valid = steps.every((s) => s.roleId);
    if (!valid && steps.length > 0) {
      setError("لطفاً برای هر مرحله نقش را انتخاب کنید");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (steps.length === 0) {
        await approvalsApi.deletePolicy(formId);
        console.log(steps);
      } else {
        console.log(steps);
        await approvalsApi.upsertPolicy(formId, steps);
      }
      onPolicyChange();
      await loadPolicy(); // refresh after save
    } catch (err: any) {
      console.error("Save error:", err);
      // Show more specific error if available
      const msg =
        err.response?.data?.message || err.message || "خطا در ذخیره خط مشی";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <UserCheck size={16} className="text-purple-500" />
          مراحل تأیید (ترتیبی)
        </h3>
        <button
          onClick={addStep}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <Plus size={14} /> افزودن مرحله
        </button>
      </div>

      {steps.length === 0 ?
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 text-sm">
          هیچ مرحله تأییدی تنظیم نشده است. پس از ارسال فرم، بلافاصله تأیید نهایی
          می‌شود.
        </div>
      : <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                {step.stepOrder}
              </div>
              <div className="flex-1">
                <select
                  value={step.roleId}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  <option value="">انتخاب نقش ...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => removeStep(idx)}
                className="text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      }

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={savePolicy}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
          {saving ?
            <Loader2 size={14} className="animate-spin" />
          : <Save size={14} />}
          ذخیره خط مشی
        </button>
        {steps.length > 0 && (
          <button
            onClick={() => {
              setSteps([]);
              savePolicy();
            }}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            حذف همه مراحل
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Approval Status Modal ────────────────────────────────────

