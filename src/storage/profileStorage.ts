import { createEmptyProfile } from "../core/profile/defaultProfile";
import type { DatePrecision, Profile, ProfileDate } from "../core/profile/types";

const PROFILE_STORAGE_KEY = "profile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function inferDatePrecision(value: string): DatePrecision {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "day";
  if (/^\d{4}-\d{2}$/.test(value) || /^\d{2}$/.test(value)) return "month";
  return "year";
}

function normalizeDate(value: unknown): ProfileDate {
  if (isRecord(value)) {
    const dateValue = asString(value.value);
    const precision = value.precision === "day" || value.precision === "month" || value.precision === "year"
      ? value.precision
      : inferDatePrecision(dateValue);
    return { value: dateValue, precision };
  }

  const dateValue = asString(value);
  return { value: dateValue, precision: inferDatePrecision(dateValue) };
}

function normalizeProfile(value: unknown): Profile {
  const emptyProfile = createEmptyProfile();

  if (!isRecord(value)) {
    return emptyProfile;
  }

  const personal = isRecord(value.personal) ? value.personal : {};
  const education = Array.isArray(value.education) ? value.education : [];
  const workExperience = Array.isArray(value.workExperience) ? value.workExperience : [];

  return {
    personal: {
      fullName: asString(personal.fullName),
      email: asString(personal.email),
      phone: asString(personal.phone),
      location: asString(personal.location),
      linkedin: asString(personal.linkedin),
      github: asString(personal.github) || (asString(personal.portfolio).includes("github.com") ? asString(personal.portfolio) : ""),
      portfolio: asString(personal.portfolio).includes("github.com") && !personal.github ? "" : asString(personal.portfolio),
      otherLinks: asStringList(personal.otherLinks)
    },
    education: education.filter(isRecord).map((item) => ({
      id: asString(item.id) || crypto.randomUUID(),
      institution: asString(item.institution),
      degree: asString(item.degree),
      fieldOfStudy: asString(item.fieldOfStudy),
      gpa: asString(item.gpa),
      finalGrade: asString(item.finalGrade),
      startDate: normalizeDate(item.startDate),
      endDate: normalizeDate(item.endDate),
      description: asString(item.description)
    })),
    workExperience: workExperience.filter(isRecord).map((item) => ({
      id: asString(item.id) || crypto.randomUUID(),
      company: asString(item.company),
      title: asString(item.title),
      location: asString(item.location),
      startDate: normalizeDate(item.startDate),
      endDate: normalizeDate(item.endDate),
      description: asString(item.description)
    })),
    skills: asStringList(value.skills),
    languages: asStringList(value.languages)
  };
}

export async function loadProfile(): Promise<Profile> {
  const result = await chrome.storage.local.get(PROFILE_STORAGE_KEY);
  return normalizeProfile(result[PROFILE_STORAGE_KEY]);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: profile });
}

export async function deleteProfile(): Promise<void> {
  await chrome.storage.local.remove(PROFILE_STORAGE_KEY);
}
