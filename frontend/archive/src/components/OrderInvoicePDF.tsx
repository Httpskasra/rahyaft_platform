"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// =========================
// FONT (همان قبلی خودت)
// =========================

// =========================
// STYLE (FORM STYLE)
// =========================

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontFamily: "Vazir",
    direction: "rtl",
    fontSize: 9,
    backgroundColor: "#fff",
  },

  form: {
    borderWidth: 1,
    borderColor: "#000",
  },

  header: {
    borderBottomWidth: 1,
    borderColor: "#000",
    padding: 6,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderColor: "#000",
    minHeight: 24,
    alignItems: "center",
  },

  cell: {
    borderLeftWidth: 1,
    borderColor: "#000",
    padding: 4,
    fontSize: 9,
  },

  sectionTitle: {
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
    borderColor: "#000",
    padding: 5,
    fontSize: 10,
    fontWeight: "bold",
  },

  checkboxRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderColor: "#000",
    padding: 5,
    alignItems: "center",
  },

  box: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    marginLeft: 4,
  },
});

// =========================
// HELPERS
// =========================

const rtl = (t: any) => String(t ?? "");

// =========================
// MAIN COMPONENT
// =========================

export function FormLikePDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.form}>

          {/* ================= HEADER ================= */}
          <Text style={styles.header}>
            فرم مشخصات کاربر / استخدام / مصاحبه
          </Text>

          {/* ================= ROW 1 ================= */}
          <View style={styles.row}>
            <Text style={[styles.cell, { width: "25%" }]}>نام:</Text>
            <Text style={[styles.cell, { width: "25%" }]}>
              {rtl(data?.name)}
            </Text>

            <Text style={[styles.cell, { width: "25%" }]}>شماره:</Text>
            <Text style={[styles.cell, { width: "25%" }]}>
              {rtl(data?.phone)}
            </Text>
          </View>

          {/* ================= ROW 2 ================= */}
          <View style={styles.row}>
            <Text style={[styles.cell, { width: "25%" }]}>کد ملی:</Text>
            <Text style={[styles.cell, { width: "25%" }]}>
              {rtl(data?.nationalId)}
            </Text>

            <Text style={[styles.cell, { width: "25%" }]}>تاریخ:</Text>
            <Text style={[styles.cell, { width: "25%" }]}>
              {rtl(data?.date)}
            </Text>
          </View>

          {/* ================= SECTION TITLE ================= */}
          <Text style={styles.sectionTitle}>
            بخش انتخاب تخصص
          </Text>

          {/* ================= CHECKBOX GRID ================= */}
          <View style={styles.checkboxRow}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
              <View style={styles.box} />
              <Text>حسابداری</Text>
            </View>

            <View style={{ flexDirection: "row-reverse", alignItems: "center", marginRight: 20 }}>
              <View style={styles.box} />
              <Text>فروش</Text>
            </View>

            <View style={{ flexDirection: "row-reverse", alignItems: "center", marginRight: 20 }}>
              <View style={styles.box} />
              <Text>بازاریابی</Text>
            </View>

            <View style={{ flexDirection: "row-reverse", alignItems: "center", marginRight: 20 }}>
              <View style={styles.box} />
              <Text>برنامه‌نویسی</Text>
            </View>
          </View>

          {/* ================= SECTION TITLE ================= */}
          <Text style={styles.sectionTitle}>
            توضیحات تکمیلی
          </Text>

          <View style={styles.row}>
            <Text style={[styles.cell, { width: "100%" }]}>
              {rtl(data?.notes || "—")}
            </Text>
          </View>

          {/* ================= TABLE ================= */}
          <Text style={styles.sectionTitle}>
            سوابق کاری
          </Text>

          <View style={styles.row}>
            <Text style={[styles.cell, { width: "30%" }]}>شرکت</Text>
            <Text style={[styles.cell, { width: "20%" }]}>سمت</Text>
            <Text style={[styles.cell, { width: "25%" }]}>مدت</Text>
            <Text style={[styles.cell, { width: "25%" }]}>سال</Text>
          </View>

          {(data?.jobs || []).map((j: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.cell, { width: "30%" }]}>{rtl(j.company)}</Text>
              <Text style={[styles.cell, { width: "20%" }]}>{rtl(j.role)}</Text>
              <Text style={[styles.cell, { width: "25%" }]}>{rtl(j.duration)}</Text>
              <Text style={[styles.cell, { width: "25%" }]}>{rtl(j.year)}</Text>
            </View>
          ))}

          {/* ================= FOOTER ================= */}
          <View style={{ padding: 6 }}>
            <Text style={{ fontSize: 8 }}>
              این فرم توسط سیستم به صورت خودکار تولید شده است
            </Text>
          </View>

        </View>
      </Page>
    </Document>
  );
}